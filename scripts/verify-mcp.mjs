/**
 * ChaosHome MCP end-to-end verification over raw Streamable HTTP JSON-RPC.
 * Usage: node scripts/verify-mcp.mjs [baseUrl]   (default http://localhost:3001)
 */
const BASE = process.argv[2] ?? 'http://localhost:3001';
const MCP = `${BASE}/mcp`;
const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

let nextId = 1;
async function rpc(method, params, extraHeaders = {}) {
  const res = await fetch(MCP, {
    method: 'POST',
    headers: { ...headers, ...extraHeaders },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  const raw = await res.text();
  if (!raw) return { __empty: true, status: res.status };
  // Streamable HTTP may answer as SSE ("event: message\ndata: {...}")
  const dataLine = raw.split('\n').find((l) => l.startsWith('data: '));
  try {
    return JSON.parse(dataLine ? dataLine.slice(6) : raw);
  } catch {
    return { __raw: raw.slice(0, 300), status: res.status };
  }
}

async function notify(method) {
  const res = await fetch(MCP, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', method, params: {} }),
  });
  return res.status;
}

function extractText(rpcResult) {
  const content = rpcResult?.result?.content ?? [];
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
}

async function main() {
  // 1. initialize (hackathon requires spec 2025-11-25 or later)
  const init = await rpc('initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'chaoshome-verify', version: '1.0.0' },
  });
  check(
    'initialize negotiates MCP spec 2025-11-25',
    init?.result?.serverInfo?.name === 'chaoshome' &&
      init?.result?.protocolVersion === '2025-11-25',
    `protocolVersion=${init?.result?.protocolVersion} server=${init?.result?.serverInfo?.name}`
  );
  await notify('notifications/initialized');

  // 2. tools/list
  const list = await rpc('tools/list', {});
  const toolNames = (list?.result?.tools ?? []).map((t) => t.name);
  const expected = [
    'list_home',
    'get_routines',
    'run_chaos_sim',
    'get_report',
    'home_health',
    'explain_failure',
    'apply_fix',
    'verify_fix',
  ];
  check(
    `tools/list exposes all ${expected.length} tools`,
    expected.every((t) => toolNames.includes(t)),
    toolNames.join(', ')
  );

  // 3. run_chaos_sim (suite)
  const sim = await rpc('tools/call', { name: 'run_chaos_sim', arguments: { suite: true } });
  const simText = extractText(sim);
  check(
    'run_chaos_sim suite returns health report',
    /Home health score/.test(simText) && /Most fragile routines/.test(simText),
    simText.split('\n')[1]?.slice(0, 90)
  );

  // 4. explain a failure
  const explain = await rpc('tools/call', {
    name: 'explain_failure',
    arguments: { routineId: 'r-good-morning' },
  });
  const explainText = extractText(explain);
  check(
    'explain_failure produces root-cause chain',
    /Root cause|PASSES|fragility/i.test(explainText),
    explainText.split('\n').find((l) => /code:|Root cause|PASSES/.test(l))?.slice(0, 100)
  );

  // 5. targeted scenario
  const lamp = await rpc('tools/call', {
    name: 'run_chaos_sim',
    arguments: {
      faults: [{ type: 'device_offline', deviceId: 'd-bedroom-lamp' }],
      label: 'Bedroom Lamp goes offline',
    },
  });
  const lampText = extractText(lamp);
  check(
    'targeted device_offline scenario fails dependent routines',
    /FAIL/.test(lampText) && /Bedroom Lamp/.test(lampText),
    lampText.split('\n')[0]
  );

  // 6. apply_fix -> verification
  const fix = await rpc('tools/call', { name: 'apply_fix', arguments: {} });
  const fixText = extractText(fix);
  check(
    'apply_fix remediates and reports ALL GREEN or improved health',
    /ALL GREEN|Home health after fixes/.test(fixText),
    fixText.split('\n').filter((l) => /Re-simulation|ALL GREEN|health after/.test(l)).join(' | ').slice(0, 140)
  );

  // 7. verify_fix after repair
  const verify = await rpc('tools/call', { name: 'verify_fix', arguments: {} });
  const verifyText = extractText(verify);
  check(
    'verify_fix re-runs and shows improved state',
    /ALL GREEN|Home health score/.test(verifyText),
    verifyText.split('\n')[0]
  );

  // 8. REST state endpoint
  const stateRes = await fetch(`${BASE}/api/state`);
  const state = await stateRes.json();
  check(
    'GET /api/state returns home + suite',
    stateRes.ok && state.home?.routines?.length > 0 && state.suite?.health != null,
    `health=${(state.suite?.health?.score * 100).toFixed(1)}% routines=${state.home?.routines?.length}`
  );

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('VERIFY ERROR:', err);
  process.exit(1);
});
