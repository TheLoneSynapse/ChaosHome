/**
 * Env aliases for the Gemini model id.
 *
 * `.env.example` and the Alexa skill both document `GEMINI_MODEL`, while the
 * agent historically read `GEMINI_MODEL_ID`. Accept either so a model chosen
 * in `.env` actually reaches the dashboard agent instead of being silently
 * ignored. `GEMINI_MODEL` wins because it is the documented name.
 */
export function resolveGeminiModelId(
  env: Record<string, string | undefined> = process.env
): string {
  const explicit = env.GEMINI_MODEL ?? env.GEMINI_MODEL_ID;
  const trimmed = explicit?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_GEMINI_MODEL_ID;
}

export const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.1-flash-lite';

/**
 * Thinking budget for Gemini 3.x, in tokens.
 *
 * Gemini 3 is a thinking model and its thinking budget is the single biggest
 * latency knob: measured on the dashboard chat, thinking on costs 30s+ per turn
 * while thinking off lands near 11s. A chat box cannot wait 30s, so 0 (thinking
 * off) is the default. Set GEMINI_THINKING_BUDGET to opt back into deeper
 * reasoning when latency does not matter.
 */
export function geminiThinkingBudget(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = env.GEMINI_THINKING_BUDGET?.trim();
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}
