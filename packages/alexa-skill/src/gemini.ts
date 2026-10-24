/**
 * Minimal Google Gemini REST client - zero dependencies, uses global fetch.
 *
 * Talks directly to the free-tier Generative Language API with function
 * calling, so the Lambda bundle stays tiny (no SDK) and the only cost is the
 * free Gemini API key. Runs a small, bounded tool-use loop: ask Gemini, run
 * any tool it requests against the local ChaosHome simulation, feed the result
 * back, repeat until Gemini produces a final spoken answer.
 */

export interface GeminiToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema (OpenAPI subset)
}

/** JSON Schema type accepted by Gemini function declarations. */
type Part =
  | { text: string }
  | {
      functionCall: {
        name: string;
        args: Record<string, unknown>;
        // Gemini 3 thinking models attach a thought signature to each function
        // call; it MUST be echoed back verbatim or the follow-up turn is
        // rejected ("Function call is missing a thought signature").
        thoughtSignature?: string;
      };
    }
  | { functionResponse: { name: string; response: unknown } };

interface Content {
  // Gemini's current API expects function-response turns under role 'user'
  // (matches the official @google/genai SDK), not the older 'function' role.
  role: 'user' | 'model';
  parts: Part[];
}

const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Hard caps so a runaway loop can't burn the Lambda budget. */
const MAX_TOOL_ROUNDS = 4;
/** Transient statuses worth retrying (Gemini demand spikes return 503). */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const MAX_FETCH_RETRIES = 2;
// Per-request timeout. gemini-3.x is a thinking model, so a single
// generateContent round-trip (especially with tools) can take >12s; keep this
// generous but bounded so a hung socket still fails fast. Keep the Lambda
// timeout above this (README suggests 30s).
const REQUEST_TIMEOUT_MS = 25_000;

export interface GeminiRunOptions {
  apiKey: string;
  model?: string;
  system: string;
  userText: string;
  tools: GeminiToolDef[];
  /** Executes one tool locally and returns its text/JSON result. */
  executeTool: (call: GeminiToolCall) => Promise<unknown>;
  temperature?: number;
  maxOutputTokens?: number;
}

interface GeminiHttpResponse {
  candidates?: Array<{
    content?: { parts?: Part[]; role?: string };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; code?: number };
}

/**
 * POST one generateContent request, retrying transient failures (429/5xx) with
 * short backoff. A spike in Gemini demand returns 503; a voice skill should ride
 * it out rather than immediately tell the user it failed.
 */
async function postGemini(
  url: string,
  apiKey: string,
  body: unknown
): Promise<GeminiHttpResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt++) {
    if (attempt > 0) {
      // 500ms, 1500ms backoff between retries.
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // Network error or per-request timeout - retryable.
      lastErr = err;
      continue;
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const err = new Error(`Gemini API ${res.status}: ${errBody.slice(0, 200)}`);
      if (!RETRYABLE_STATUS.has(res.status)) throw err; // non-transient: fail now
      lastErr = err;
      continue; // transient: fall through to backoff + retry
    }

    const data = (await res.json()) as GeminiHttpResponse;
    if (data.error && typeof data.error.code === 'number' && RETRYABLE_STATUS.has(data.error.code)) {
      lastErr = new Error(`Gemini error: ${data.error.message ?? 'unknown'}`);
      continue;
    }
    return data;
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Extract text + function calls from one candidate's parts. */
function parseParts(parts: Part[] | undefined): { text: string; calls: GeminiToolCall[] } {
  let text = '';
  const calls: GeminiToolCall[] = [];
  for (const part of parts ?? []) {
    if ('text' in part && typeof part.text === 'string') text += part.text;
    else if ('functionCall' in part) {
      calls.push({ name: part.functionCall.name, args: part.functionCall.args ?? {} });
    }
  }
  return { text: text.trim(), calls };
}

/**
 * Run one full agentic turn. Returns the final natural-language answer plus the
 * tool calls that were executed along the way (for logging / UI chips).
 */
export async function runGemini(opts: GeminiRunOptions): Promise<{
  text: string;
  toolCalls: GeminiToolCall[];
  rounds: number;
}> {
  // Default to the fastest flash-lite model: it keeps the tool round-trip within
  // Alexa's ~8s voice window. gemini-3.8-flash is more capable but was measured
  // at 25-41s per call (too slow for voice).
  const model = opts.model ?? 'gemini-3.1-flash-lite';
  const toolCalls: GeminiToolCall[] = [];

  const contents: Content[] = [{ role: 'user', parts: [{ text: opts.userText }] }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body = {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents,
      tools:
        opts.tools.length > 0
          ? [{ functionDeclarations: opts.tools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            })) }]
          : undefined,
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        maxOutputTokens: opts.maxOutputTokens ?? 320,
        // Voice skills must answer within Alexa's ~8s window. Gemini 3.x is a
        // thinking model; with thinking on, a tool round-trip can take 30s+.
        // Disable thinking for snappy spoken replies (no thought signatures to
        // echo, and much lower latency). Turn it back on for deeper reasoning.
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const data = await postGemini(GEMINI_ENDPOINT(model), opts.apiKey, body);
    if (data.error) throw new Error(`Gemini error: ${data.error.message ?? 'unknown'}`);
    if (data.promptFeedback?.blockReason) {
      return { text: 'I could not answer that.', toolCalls, rounds: round + 1 };
    }

    const candidate = data.candidates?.[0];
    const rawParts = candidate?.content?.parts;
    const { text, calls } = parseParts(rawParts);

    // No tool calls -> Gemini is done; this is the spoken answer.
    if (calls.length === 0) {
      return { text, toolCalls, rounds: round + 1 };
    }

    // Echo the model's function-call parts back VERBATIM (not rebuilt from
    // {name,args}), so any thoughtSignature Gemini 3 attaches is preserved.
    contents.push({
      role: 'model',
      parts: rawParts ?? calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })),
    });

    const responseParts: Part[] = [];
    for (const call of calls) {
      toolCalls.push(call);
      let result: unknown;
      try {
        result = await opts.executeTool(call);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
      }
      responseParts.push({
        functionResponse: { name: call.name, response: { result } },
      });
    }

    // Wrap function results in a 'user' turn (the role the Gemini API accepts
    // for functionResponse parts, per the official SDK's own tool-use loop).
    contents.push({ role: 'user', parts: responseParts });

    // If the model also emitted text alongside the calls and hit a stop reason
    // that means it is finished, treat it as the answer.
    if (text && (candidate?.finishReason === 'STOP' || candidate?.finishReason === 'MAX_TOKENS')) {
      return { text, toolCalls, rounds: round + 1 };
    }
  }

  // Ran out of rounds - return whatever the last text was (may be empty).
  const last = contents.filter((c) => c.role === 'model').pop();
  const lastText = last ? parseParts(last.parts).text : '';
  return {
    text: lastText || 'I ran the simulation but ran out of steps to summarize. Try again.',
    toolCalls,
    rounds: MAX_TOOL_ROUNDS,
  };
}
