import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { faultSchema } from './mcp.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ChaosAgent } from '@chaoshome/agent';
import { ChaosState, PRESETS } from './state.js';
import { createMcpServer } from './mcp.js';

const rawPort = Number(process.env.PORT);
const PORT = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 3001;
/** Bind address: loopback by default so the unauthenticated demo API is never
 *  reachable from the LAN. Set HOST=0.0.0.0 to expose it deliberately. */
const HOST = process.env.HOST ?? '127.0.0.1';
const MCP_PATH = '/mcp';

/* Origins allowed to call the API from a browser: the served dashboard
   (same-origin) and the Vite dev server. Everything else gets no CORS
   headers, so cross-site pages cannot drive the local server.
   RENDER_EXTERNAL_URL / PUBLIC_ORIGIN add the deployed origin so the same
   CSRF guard keeps working in production (same-origin POSTs still send
   Origin, so without this every dashboard button would get 403 on Render). */
const ALLOWED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
for (const extra of [process.env.RENDER_EXTERNAL_URL, process.env.PUBLIC_ORIGIN]) {
  if (extra) {
    try {
      ALLOWED_ORIGINS.add(new URL(extra).origin);
    } catch {
      /* ignore malformed origin */
    }
  }
}
const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // No Origin header = same-origin or non-browser client (curl, MCP SDK).
    if (!origin || ALLOWED_ORIGINS.has(origin)) cb(null, true);
    else cb(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept', 'MCP-Protocol-Version'],
};

/** Reject absurd payloads before they reach the handlers. */
const chatBody = z.object({ message: z.string().min(1).max(4_000) });
const repairBody = z.object({ routineId: z.string().max(100).optional() });
const scenarioBody = z.object({
  presetId: z.string().max(100).optional(),
  faults: z.array(faultSchema).max(50).optional(),
  label: z.string().max(200).optional(),
  suite: z.boolean().optional(),
});
const designBody = z.object({ mode: z.enum(['save', 'restore']) });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const state = new ChaosState();
const agent = new ChaosAgent(`http://localhost:${PORT}${MCP_PATH}`);

const app = express();
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
/* CSRF guard: CORS alone only stops browsers *reading* responses; a hostile
   page can still send a state-changing POST (form / no-cors fetch). Reject
   any request whose Origin is present but not ours. Non-browser clients
   (curl, MCP SDK) send no Origin and are unaffected. */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  next();
});
// Minimal hardening headers for a locally served app (no secrets, no auth).
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  // Strict same-origin CSP: the dashboard is fully self-hosted (bundled JS/CSS,
  // no external fonts/images/XHR), so nothing outside 'self' needs to load.
  // style-src keeps 'unsafe-inline' for React's inline style attributes.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  next();
});

/* Quota guard: /api/chat spends a real Gemini API request per call. Fixed
   1-minute window per caller so nothing unauthenticated can drain the free
   tier (or hammer the agent) from a loop or scripted burst. */
const CHAT_LIMIT_PER_MIN = 30;
const chatWindows = new Map<string, { start: number; count: number }>();
app.use('/api/chat', (req, res, next) => {
  const now = Date.now();
  const key = req.socket.remoteAddress ?? 'unknown';
  let win = chatWindows.get(key);
  if (!win || now - win.start >= 60_000) {
    if (chatWindows.size > 500) chatWindows.clear();
    win = { start: now, count: 0 };
    chatWindows.set(key, win);
  }
  win.count += 1;
  if (win.count > CHAT_LIMIT_PER_MIN) {
    res.status(429).json({ error: 'Too many assistant requests - wait a minute and try again.' });
    return;
  }
  next();
});

/* ------------------------------------------------------------------ */
/* MCP endpoint (Streamable HTTP, stateless: fresh server per request) */
/* ------------------------------------------------------------------ */

app.post(MCP_PATH, async (req, res) => {
  try {
    const server = createMcpServer(state);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP POST error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

const methodNotAllowed = (_req: express.Request, res: express.Response) => {
  res.status(405).set('Allow', 'POST').json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed. This server is stateless; use POST.' },
    id: null,
  });
};

app.get(MCP_PATH, methodNotAllowed);
app.delete(MCP_PATH, methodNotAllowed);

/* ------------------------------------------------------------------ */
/* REST API for the dashboard                                          */
/* ------------------------------------------------------------------ */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'ChaosHome MCP', version: '1.0.0' });
});

app.get('/api/state', (_req, res) => {
  res.json(state.snapshot());
});

app.post('/api/scenario', (req, res) => {
  const parsed = scenarioBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid scenario payload', details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) });
    return;
  }
  const { presetId, faults, label, suite } = parsed.data;
  if (suite === true) {
    state.runSuiteScenario();
  } else if (presetId) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      res.status(400).json({ error: `Unknown preset "${presetId}"` });
      return;
    }
    if (preset.id === 'suite') state.runSuiteScenario();
    else state.runScenario(preset.faults, preset.label);
  } else if (faults) {
    state.runScenario(faults, label);
  } else {
    state.runScenario([], 'Baseline (no faults)');
  }
  res.json(state.snapshot());
});

app.post('/api/repair', (req, res) => {
  const parsed = repairBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid repair payload' });
    return;
  }
  const summary = state.repair(parsed.data.routineId);
  res.json({ repair: summary, state: state.snapshot() });
});

app.post('/api/reset', (_req, res) => {
  state.reset();
  res.json(state.snapshot());
});

/* Designed (primary) state: save the current configuration as the target,
   or restore the home to it when a problem has drifted it away. */
app.post('/api/design', (req, res) => {
  const parsed = designBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'mode must be "save" or "restore"' });
    return;
  }
  if (parsed.data.mode === 'save') {
    state.saveDesigned();
  } else if (!state.restoreDesigned()) {
    res.status(400).json({ error: 'No designed state saved yet' });
    return;
  }
  res.json(state.snapshot());
});

app.post('/api/chat', async (req, res) => {
  // Rate-limited by the /api/chat window middleware above.
  const parsed = chatBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'message is required (max 4000 characters)' });
    return;
  }
  const message = parsed.data.message.trim();
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  try {
    // Live description of what the dashboard shows, so the assistant can
    // explain "what am I looking at" / "why is it red" against real state.
    const snap = state.snapshot();
    const failing = snap.lastReport.results
      .filter((r) => r.status === 'fail')
      .map((r) => r.routineName);
    const uiContext = [
      `scenario: "${snap.lastScenarioLabel}"`,
      `faults: ${JSON.stringify(snap.lastFaults)}`,
      `current run: ${snap.lastReport.summary.passed}/${snap.lastReport.summary.total} routines passed`,
      `suite health: ${Math.round(snap.suite.health.score * 100)}% (${snap.suite.health.passedRuns}/${snap.suite.health.totalRuns} runs survived)`,
      `baseline: ${snap.suite.baseline.passed}/${snap.suite.baseline.total} green`,
      `failing now: ${failing.length ? failing.join(', ') : 'none'}`,
      `repair history entries: ${snap.history.length}`,
    ].join('\n');
    const reply = await agent.chat(message, uiContext);
    res.json(reply);
  } catch (err) {
    // Log the full error server-side; never echo internals (keys, URLs,
    // stack traces) back to an unauthenticated caller.
    console.error('chat error:', err);
    res.status(500).json({ error: 'Assistant request failed - see server log.' });
  }
});

/* ------------------------------------------------------------------ */
/* Static dashboard (production build)                                 */
/* ------------------------------------------------------------------ */

const dashboardDist = path.resolve(__dirname, '../../../dashboard/dist');
if (fs.existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
  app.get(/^\/(?!api|mcp).*/, (_req, res) => {
    res.sendFile(path.join(dashboardDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      message:
        'ChaosHome MCP is running. Dashboard not built yet - run `npm run build` or use `npm run dev:dashboard` (Vite dev server on :5173).',
      mcp: MCP_PATH,
      health: '/api/health',
    });
  });
}

app.listen(PORT, HOST, () => {
  // Auto-fix watchdog: repairs any failure the user leaves unfixed for 5 minutes
  // and generates a message describing what it did.
  setInterval(() => {
    try {
      state.tickAutoFix();
    } catch (err) {
      console.error('auto-fix tick error:', err);
    }
  }, 1000);

  console.log(`ChaosHome MCP server listening on http://${HOST}:${PORT}`);
  console.log(`  MCP endpoint:      http://localhost:${PORT}${MCP_PATH} (Streamable HTTP)`);
  console.log(`  Dashboard API:     http://localhost:${PORT}/api/state`);
  console.log(`  Agent chat:        http://localhost:${PORT}/api/chat`);
  console.log(`  Agent mode:        ${process.env.CHAOSHOME_OFFLINE === '1' ? 'offline (forced)' : 'Gemini/Bedrock with offline fallback'}`);
});
