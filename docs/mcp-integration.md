# MCP Integration

ChaosHome exposes a **self-hosted MCP server** over the **Streamable HTTP** transport.
The server negotiates protocol **`2025-11-25`** (the revision required by the
hackathon, "spec 2025-11-25 or later") and also accepts `2025-06-18`, `2025-03-26`,
`2024-11-05`, and `2024-10-07` clients.

- Endpoint: `http://localhost:3001/mcp` (POST only)
- Mode: **stateless** - no session id is issued; each POST is handled by a fresh
  server instance over shared home state, so any number of clients can connect and
  reconnecting requires no session resumption.
- `GET`/`DELETE` on `/mcp` return `405` (nothing to stream or terminate in stateless mode).

## Handshake

```json
POST /mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {},
    "clientInfo": { "name": "my-client", "version": "1.0.0" }
  }
}
```

Responses arrive either as plain JSON or as SSE (`event: message` + `data: {...}`);
clients must accept both content types (the `Accept` header above does this).

Then send `notifications/initialized` and call `tools/list`.

## Tools

| Tool | Input | Returns |
|---|---|---|
| `list_home` | `{}` | devices (id, room, capability, online, cloud/local), groups, skills, routines |
| `get_routines` | `{ routineId? }` | full action graph: target refs, name pins, required group members, fallbacks, budgets |
| `run_chaos_sim` | `{ suite?: bool, faults?: Fault[], label?: string }` | simulation report (pass/fail per routine, failure codes, root-cause chains) |
| `get_report` | `{}` | report of the most recent run |
| `home_health` | `{}` | resilience score over the full suite + most fragile routines |
| `explain_failure` | `{ routineId }` | deep dive: failing step, code, root-cause chain |
| `apply_fix` | `{ routineId? }` | remediations applied + re-simulation result (repairs the shared home model) |
| `verify_fix` | `{}` | re-runs the last scenario and suite against the current model |

`Fault` schema:

```json
{
  "type": "device_offline | device_renamed | group_modified | skill_disabled | cloud_unreachable | latency_spike",
  "deviceId": "string?",
  "groupId": "string?",
  "removedDeviceId": "string?",
  "newName": "string?",
  "skillId": "string?",
  "delayMs": "number?"
}
```

## Example: targeted fault + repair

```json
{ "jsonrpc":"2.0","id":2,"method":"tools/call","params":{
  "name":"run_chaos_sim",
  "arguments":{"faults":[{"type":"device_offline","deviceId":"d-bedroom-lamp"}],
               "label":"Bedroom Lamp goes offline"} } }
```

Result (text content, abridged):

```
Scenario: Bedroom Lamp goes offline
Result: 7/12 routines passed, 5 FAILED

[FAIL] Good Morning (400ms)
  x turn on "Bedroom Lamp"
    code: DEVICE_OFFLINE
    > Injected fault: device "Bedroom Lamp" went offline
    > Step: turn on "Bedroom Lamp"
    > Cannot reach: Bedroom Lamp
    > Root cause: this routine has a hard dependency on the device and no fallback is defined
```

Then repair:

```json
{ "jsonrpc":"2.0","id":3,"method":"tools/call","params":{
  "name":"apply_fix","arguments":{} } }
```

```
REMEDIATION APPLIED
- [add_fallback] r-good-morning / a-gm-1
  Add fallback chain [Living Room Lamp -> Kitchen Light] so this step survives "Bedroom Lamp" going offline
...
Re-simulation ("Bedroom Lamp goes offline"): 12/12 passed - ALL GREEN
Home health after fixes: 98.3% (was 78.4%)
```

## Quick protocol check

```bash
node scripts/verify-mcp.mjs            # 8 end-to-end checks
# or manually:
curl -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Connecting real MCP clients

- **MCP Inspector**: `npx @modelcontextprotocol/inspector` -> Transport: Streamable HTTP
  -> URL `http://localhost:3001/mcp`.
- **TypeScript SDK**:

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL('http://localhost:3001/mcp'));
const client = new Client({ name: 'my-client', version: '1.0.0' });
await client.connect(transport);
const { tools } = await client.listTools();
await client.callTool({ name: 'run_chaos_sim', arguments: { suite: true } });
```

The bundled agent (`packages/agent`) uses exactly this path - it is a normal MCP
client, not an in-process shortcut.
