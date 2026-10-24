# ChaosHome MCP

**Chaos engineering for your smart home.**

Your smart home configuration is a program nobody tests. Rename a device, replace a
bulb, let an assistant update your routines - and things break *silently* at 11 PM
with no log, no error, no explanation.

ChaosHome models your home (devices -> groups -> routines -> triggers) as a testable
graph, **injects faults** (offline devices, renames, broken groups, disabled skills,
cloud outages, latency spikes), runs every routine against each scenario, reports
**which routines break and exactly why** (root-cause chain), then **auto-repairs** them
(fallback chains, stable device-id references, local control, group decoupling, time
budgets) and re-simulates to prove the fix holds.

It ships as a **self-hosted MCP server** (Streamable HTTP), so any MCP client -
Alexa+-style agents, Claude, Inspector, the bundled web dashboard - can test and repair
the home by calling tools.

> "Your smart home is code nobody tests. We're Chaos Monkey for Alexa."

## Quickstart

```bash
npm install
npm run build        # builds core, agent, mcp-server, dashboard
npm test             # 21 unit tests (simulation engine + auto-fixer)
npm start            # http://localhost:3001  (dashboard + MCP endpoint)
```

Open **http://localhost:3001** - the dashboard and the MCP endpoint share one server.

Then run the 3-minute demo:

1. **Baseline looks fine**: 12/12 routines pass (that's the trap).
2. Click **Bedroom Lamp goes offline** -> 7/12, red routines, root-cause chains:
   *"Injected fault: device Bedroom Lamp went offline > Cannot reach > Root cause:
   hard dependency with no fallback."*
3. Click **Auto-Fix All** -> 71 fixes, health **78% -> 98%**, 12/12 green,
   fragility scores collapse. Honest manual gaps stay flagged.
4. Ask the agent: *"run the chaos suite"* / *"why did Good Night break?"* /
   *"fix everything"* - it calls MCP tools and answers. Pull the network cable and it
   still answers (offline reasoning mode).

## Architecture

```
+---------------------------------------------------------------+
|  dashboard/            React + Vite (graph, report, chat)     |
|      |  REST /api/*                      |  /api/chat          |
+------|-----------------------------------|---------------------+
|  packages/mcp-server   Express: /mcp (Streamable HTTP,         |
|      |  stateless McpServer per request) + REST API + static   |
|      |                       |                                 |
|      |            packages/agent (MCP client)                  |
|      |              |- Bedrock Converse tool-use loop (online) |
|      |              |- rules-based intent router (offline)     |
|      v                                                         |
|  packages/core   home model + fault engine + fragility suite   |
|                  + auto-fixer (fixes must survive re-fault)    |
+---------------------------------------------------------------+
```

Key invariant: **every automated fix must survive re-running the same fault.**
Re-enabling a skill that the scenario disables again would not work, so the fixer
*removes the hard skill dependency* instead; renaming is cured by pinning the step to
a stable device id, not by writing the new name. This is asserted by the test suite.

## MCP tools (Streamable HTTP, negotiated spec 2025-11-25)

| Tool | Purpose |
|---|---|
| `list_home` | devices, groups, skills, routines + ids |
| `get_routines` | full action graph: targets, name pins, budgets, fallbacks |
| `run_chaos_sim` | inject faults (`suite: true` for the full 27-scenario suite) |
| `get_report` | last run: pass/fail, failure codes, root-cause chains |
| `home_health` | resilience score + most fragile routines |
| `explain_failure` | deep root-cause dive for one routine |
| `apply_fix` | propose + apply remediations, then re-simulate to verify |
| `verify_fix` | re-run last scenario + suite after repairs |

Connection details and sample JSON-RPC exchanges: [docs/mcp-integration.md](docs/mcp-integration.md).

## Agent modes

- **Online (AWS Bedrock)**: the agent converts the MCP tool list into Bedrock tools and
  runs a Converse tool-use loop. Documented integration:
  [docs/aws-integration.md](docs/aws-integration.md).
- **Offline fallback**: if AWS is unreachable (or `CHAOSHOME_OFFLINE=1`), a
  deterministic intent router calls the same MCP tools. The demo's "pull the cable"
  moment is real: answers keep working without the cloud.

## Repository layout

```
packages/core/        simulation engine, fragility suite, auto-fixer (unit-tested)
packages/mcp-server/  MCP endpoint + REST API + static dashboard
packages/agent/       Bedrock tool-use loop + offline intent router
dashboard/            React dashboard (force graph, report, agent chat)
fixtures/             sample-home.json (16 devices, 4 groups, 12 routines)
scripts/              verify-mcp.mjs (protocol e2e), gen-fixtures.mjs
docs/                 MCP + AWS integration documentation
```

## Verification

- `npm test` - 21 tests: baseline green, each fault type produces failures with
  root-cause chains, fixes survive re-simulation, suite-wide repairs keep the baseline
  green and leave exactly two honest gaps (thermostat with no substitute; dead motion
  sensor kills its trigger).
- `node scripts/verify-mcp.mjs` - 8 protocol checks over raw Streamable HTTP:
  initialize (negotiates spec 2025-11-25), tools/list, suite run, explain, targeted
  fault, apply_fix -> ALL GREEN, verify_fix, REST state.

## Honest gaps (by design)

Some failures need a human: the single thermostat has no substitute device, and a dead
motion sensor means the routine *cannot fire at all*. The fixer reports these as
"needs manual attention" instead of pretending.

## Hackathon notes

- **Primary track:** Alexa+ (self-hosted MCP server, Streamable HTTP, negotiating
  spec **2025-11-25** - exactly "spec 2025-11-25 or later"; simulated home experience
  as the track explicitly allows).
- **AWS Builder mini challenge:** documented AWS Bedrock integration - see
  [docs/aws-integration.md](docs/aws-integration.md).
- **Open Source mini challenge:** MIT [LICENSE](LICENSE), public-ready repo, this README
  as the "what/how/why" description.

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | server port (ignored if unset/invalid) |
| `BEDROCK_MODEL_ID` | `amazon.nova-lite-v1:0` | Bedrock model for agent reasoning |
| `AWS_REGION` | `us-east-1` | Bedrock region |
| `CHAOSHOME_OFFLINE` | - | set `1` to force offline agent mode |
