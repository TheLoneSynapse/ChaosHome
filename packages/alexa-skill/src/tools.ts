/**
 * ChaosHome tools for the Alexa skill.
 *
 * These wrap the shared ChaosState simulation engine (the same code the web
 * dashboard and MCP server use) into a small set of voice-friendly tools. They
 * are handed to Gemini as function declarations and executed locally inside the
 * Lambda - no network calls, no extra cost. Every result is a short string
 * tuned for text-to-speech.
 */

import { ChaosState, PRESETS } from '@chaoshome/mcp-server/state';
import type { GeminiToolCall, GeminiToolDef } from './gemini.js';

/** The single shared simulation state for this Lambda container. */
export function createState(): ChaosState {
  return new ChaosState();
}

/** Routine names (with at least one failure) across the full suite. */
function failingNames(state: ChaosState): string[] {
  return state.lastSuite.routineHealth
    .filter((r) => r.failures > 0)
    .map((r) => r.routineName);
}

/** Compact, speakable list of the routines and their current status. */
function speakSummary(state: ChaosState): string {
  const suite = state.lastSuite;
  const pct = Math.round(suite.health.score * 100);
  const failing = failingNames(state);
  const lines: string[] = [];
  lines.push(`Your home is ${pct} percent resilient.`);
  if (failing.length === 0) {
    lines.push('Every routine passes the full chaos suite.');
  } else {
    lines.push(
      `${failing.length} routine${failing.length === 1 ? '' : 's'} at risk: ${failing.join(', ')}.`
    );
  }
  return lines.join(' ');
}

/** Describe a single scenario result in one or two spoken sentences. */
function speakScenario(state: ChaosState, label: string): string {
  const r = state.lastReport.summary;
  const pct = Math.round((r.passed / Math.max(1, r.total)) * 100);
  if (r.failed === 0) {
    return `Scenario "${label}" done. All ${r.total} routines passed, ${pct} percent healthy.`;
  }
  return (
    `Scenario "${label}" done. ${r.passed} of ${r.total} routines survived. ` +
    `Failing: ${r.failedRoutines.join(', ')}.`
  );
}

/** Pick a preset fault by fuzzy name (matches id or label). */
function resolvePreset(q: string | undefined): (typeof PRESETS)[number] | undefined {
  if (!q) return undefined;
  const s = q.toLowerCase().trim();
  return PRESETS.find(
    (p) =>
      p.id === s ||
      p.label.toLowerCase().includes(s) ||
      s.includes(p.id) ||
      s.includes(p.label.toLowerCase().split(' ')[0])
  );
}

/** Map a spoken routine name to its id (exact, then substring). */
function resolveRoutine(state: ChaosState, q: string | undefined): string | undefined {
  if (!q) return undefined;
  const s = q.toLowerCase().trim();
  const routines = state.baseHome.routines;
  return (
    routines.find((r) => r.name.toLowerCase() === s)?.id ??
    routines.find((r) => r.name.toLowerCase().includes(s) || s.includes(r.name.toLowerCase()))?.id
  );
}

/** Function declarations handed to Gemini (JSON Schema, OpenAPI subset). */
export const CHAOS_TOOLS: GeminiToolDef[] = [
  {
    name: 'home_health',
    description:
      'Get the overall resilience score of the smart home: the percentage of routines that survive the full chaos suite, plus which routines are at risk.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'run_chaos_sim',
    description:
      'Inject a fault scenario and simulate every routine. Pass a scenario name (e.g. "cloud outage", "lamp offline", "latency", "rename", "group", "skill", "motion", "thermostat", "lock") or omit for the full chaos suite. Returns which routines survived or failed.',
    parameters: {
      type: 'object',
      properties: {
        scenario: {
          type: 'string',
          description:
            'Friendly name of the fault to inject, e.g. "cloud outage", "bedroom lamp offline", "latency spike", "coffee renamed", "living room group", "skill disabled", "motion sensor", "thermostat", "door lock". Omit to run the full suite.',
        },
      },
      required: [],
    },
  },
  {
    name: 'explain_failure',
    description:
      'Explain why a specific routine fails: the failing step, the failure code, and the root-cause chain. Use the routine name (e.g. "Good Night", "Movie Night").',
    parameters: {
      type: 'object',
      properties: {
        routine: {
          type: 'string',
          description: 'The routine name to explain, e.g. "Good Night".',
        },
      },
      required: ['routine'],
    },
  },
  {
    name: 'apply_fix',
    description:
      'Automatically repair failing routines (add fallbacks, relink renamed devices, switch to local control, raise budgets) and re-verify. Returns the health before and after.',
    parameters: {
      type: 'object',
      properties: {
        routine: {
          type: 'string',
          description: 'Optional: repair only this routine by name. Omit to repair all.',
        },
      },
      required: [],
    },
  },
];

/**
 * Voice-tuned failure explanation. Instead of dumping the raw report (which is
 * full of [ok] markers and CODE labels that TTS mangles), pull the failing
 * step and its human root-cause chain straight off the structured result.
 */
function speakExplain(state: ChaosState, routineId: string): string {
  // Prefer the current scenario's result; fall back to any suite report.
  let result =
    state.lastReport.results.find((r) => r.routineId === routineId && r.status === 'fail') ?? null;
  if (!result) {
    for (const report of state.lastSuite.reports) {
      const r = report.results.find((x) => x.routineId === routineId && x.status === 'fail');
      if (r) {
        result = r;
        break;
      }
    }
  }

  if (!result) {
    const name = state.baseHome.routines.find((r) => r.id === routineId)?.name ?? routineId;
    return `The ${name} routine passes in the current scenario. Run a simulation first if you want me to break it.`;
  }

  const failingStep = result.steps.find((s) => s.status === 'fail');
  const lines: string[] = [];
  lines.push(`${result.routineName} fails in scenario ${state.lastReport.scenario}.`);
  if (failingStep) {
    lines.push(`It breaks at: ${failingStep.label}.`);
    // The chain is outermost-cause-first; the last entry is the concrete reason.
    const reason = failingStep.chain[failingStep.chain.length - 1];
    if (reason) lines.push(reason.replace(/^Root cause:\s*/i, 'The reason is '));
  }
  return lines.join(' ');
}

/** Execute one tool call against the live ChaosState, returning a plain value. */
export async function executeChaosTool(
  state: ChaosState,
  call: GeminiToolCall
): Promise<unknown> {
  const args = call.args ?? {};
  switch (call.name) {
    case 'home_health': {
      state.runSuiteScenario();
      return speakSummary(state);
    }
    case 'run_chaos_sim': {
      const preset = resolvePreset(args.scenario as string | undefined);
      if (!preset) {
        // No recognised scenario -> run the full suite.
        state.runSuiteScenario();
        return speakSummary(state);
      }
      state.runScenario(preset.faults, preset.label);
      return speakScenario(state, preset.label);
    }
    case 'explain_failure': {
      const routineId = resolveRoutine(state, args.routine as string | undefined);
      if (!routineId) return 'I could not find that routine. Try naming one like Good Night or Movie Night.';
      // Ensure faults are loaded so there is a failure to explain.
      if (state.lastReport.summary.failed === 0) {
        state.runSuiteScenario();
      }
      return speakExplain(state, routineId);
    }
    case 'apply_fix': {
      const routineId = resolveRoutine(state, args.routine as string | undefined);
      const before = state.lastSuite.health.score;
      const summary = state.repair(routineId);
      const beforePct = Math.round(before * 100);
      const afterPct = Math.round(summary.healthAfter * 100);
      const still = state.lastReport.summary.failedRoutines;
      const applied = summary.applied.length;
      const parts: string[] = [];
      parts.push(
        applied === 0
          ? 'No automated fixes were available.'
          : `Applied ${applied} remediation${applied === 1 ? '' : 's'}.`
      );
      parts.push(`Health went from ${beforePct} to ${afterPct} percent.`);
      if (still.length === 0) parts.push('All routines are green again.');
      else parts.push(`Still failing: ${still.join(', ')}.`);
      return parts.join(' ');
    }
    default:
      return `Unknown tool "${call.name}".`;
  }
}
