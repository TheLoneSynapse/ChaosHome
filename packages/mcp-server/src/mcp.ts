import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatFixResult, runSimulation } from '@chaoshome/core';
import { ChaosState } from './state.js';

export const faultSchema = z.object({
  type: z.enum([
    'device_offline',
    'device_renamed',
    'group_modified',
    'skill_disabled',
    'cloud_unreachable',
    'latency_spike',
  ]),
  deviceId: z.string().max(100).optional().describe('Target device id (device_offline / device_renamed)'),
  groupId: z.string().max(100).optional().describe('Target group id (group_modified)'),
  removedDeviceId: z
    .string()
    .max(100)
    .optional()
    .describe('Member removed from the group (group_modified)'),
  newName: z.string().max(100).optional().describe('New device name (device_renamed)'),
  skillId: z.string().max(100).optional().describe('Target skill id (skill_disabled)'),
  delayMs: z.number().finite().min(0).max(60_000).optional().describe('Extra ms per step (latency_spike, default 500)'),
});

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });

/** Builds a fully wired MCP server around the shared chaos state. */
export function createMcpServer(state: ChaosState): McpServer {
  const server = new McpServer({ name: 'chaoshome', version: '1.0.0' });

  server.registerTool(
    'list_home',
    {
      description:
        'List the smart home model: devices, groups, skills, and routines with their triggers. Start here to discover ids for other tools.',
      inputSchema: {},
    },
    async () => {
      const home = state.baseHome;
      const lines: string[] = [];
      lines.push(`Home: ${home.name}`);
      lines.push(`Devices (${home.devices.length}):`);
      for (const d of home.devices) {
        lines.push(
          `  - ${d.id}: "${d.name}" [${d.room}, ${d.capability}, ${d.online ? 'online' : 'OFFLINE'}, cloud=${d.cloudDependent}, local=${d.localControllable}]`
        );
      }
      lines.push(`Groups (${home.groups.length}):`);
      for (const g of home.groups) {
        lines.push(`  - ${g.id}: "${g.name}" = [${g.deviceIds.join(', ')}]`);
      }
      lines.push(`Skills (${home.skills.length}):`);
      for (const s of home.skills) {
        lines.push(`  - ${s.id}: "${s.name}" ${s.enabled ? '(enabled)' : '(DISABLED)'}`);
      }
      lines.push(`Routines (${home.routines.length}):`);
      for (const r of home.routines) {
        lines.push(
          `  - ${r.id}: "${r.name}" [${r.trigger.type}: ${r.trigger.label}] with ${r.actions.length} step(s)` +
            (r.budgetMs ? `, budget ${r.budgetMs}ms` : '')
        );
      }
      return text(lines.join('\n'));
    }
  );

  server.registerTool(
    'get_routines',
    {
      description:
        'Get full details of routines including every action step, dependencies (device/group/skill), name-pinned references, and time budgets.',
      inputSchema: {
        routineId: z.string().max(100).optional().describe('Specific routine id; omit for all routines'),
      },
    },
    async ({ routineId }) => {
      const routines = routineId
        ? state.baseHome.routines.filter((r) => r.id === routineId)
        : state.baseHome.routines;
      if (routines.length === 0) return text(`Routine "${routineId}" not found.`);
      const lines: string[] = [];
      for (const r of routines) {
        lines.push(`${r.id}: "${r.name}"`);
        lines.push(`  trigger: [${r.trigger.type}] ${r.trigger.label}`);
        if (r.budgetMs) lines.push(`  time budget: ${r.budgetMs}ms`);
        for (const a of r.actions) {
          const target = a.deviceId
            ? `device=${a.deviceId}`
            : a.groupId
              ? `group=${a.groupId} (requires: ${(a.requiredDeviceIds ?? []).join(', ') || 'none'})`
              : a.deviceIds?.length
                ? `devices=[${a.deviceIds.join(', ')}]`
                : 'no target';
          const extras = [
            a.targetName ? `name-pinned="${a.targetName}"` : '',
            a.skillId ? `skill=${a.skillId}` : '',
            a.fallbackDeviceIds?.length ? `fallbacks=[${a.fallbackDeviceIds.join(', ')}]` : '',
            a.requiresCloud === false ? 'local-control' : '',
          ]
            .filter(Boolean)
            .join(' ');
          lines.push(`  - ${a.id}: ${a.type} ${target}${extras ? ` [${extras}]` : ''}`);
        }
        lines.push('');
      }
      return text(lines.join('\n'));
    }
  );

  server.registerTool(
    'run_chaos_sim',
    {
      description:
        'Inject faults into the smart home and simulate every routine. Pass suite=true to run the full standard chaos suite (every device offline scenario, renames, group edits, disabled skills, cloud outage, latency spike) and get a resilience report. Or pass explicit faults for one targeted scenario.',
      inputSchema: {
        suite: z.boolean().optional().describe('Run the full standard chaos suite'),
        faults: z.array(faultSchema).max(50).optional().describe('Explicit faults for a single scenario'),
        label: z.string().max(200).optional().describe('Human label for a single scenario'),
      },
    },
    async ({ suite, faults, label }) => {
      if (suite) {
        const report = state.runSuiteScenario();
        return text(
          `Ran ${report.scenarios.length} scenarios.\n\n` + state.suiteText()
        );
      }
      const report = state.runScenario(faults ?? [], label);
      return text(state.reportText());
    }
  );

  server.registerTool(
    'get_report',
    {
      description:
        'Get the report of the most recent simulation run (scenario, pass/fail per routine, failure codes and root-cause chains).',
      inputSchema: {},
    },
    async () => text(state.reportText())
  );

  server.registerTool(
    'home_health',
    {
      description:
        'Overall resilience score of the home: percentage of routine runs that survive the full chaos suite, plus the most fragile routines.',
      inputSchema: {},
    },
    async () => {
      state.runSuiteScenario();
      return text(state.suiteText());
    }
  );

  server.registerTool(
    'explain_failure',
    {
      description:
        'Explain exactly why a specific routine fails: the failing step, failure code, and the human-readable root-cause chain (which fault caused it and why the routine is vulnerable).',
      inputSchema: {
        routineId: z.string().max(100).describe('The routine id to explain (see get_routines)'),
      },
    },
    async ({ routineId }) => text(state.explain(routineId))
  );

  server.registerTool(
    'apply_fix',
    {
      description:
        'Propose and apply automated remediations for failing routines (add fallback device, relink stale name reference, remove skill dependency, switch to local control, decouple from broken group, raise time budget), then re-run the simulation to verify the fixes hold. Optionally target a single routine.',
      inputSchema: {
        routineId: z
          .string()
          .max(100)
          .optional()
          .describe('Repair only this routine; omit to repair every failing routine'),
      },
    },
    async ({ routineId }) => {
      const summary = state.repair(routineId);
      return text(summary.verificationText);
    }
  );

  server.registerTool(
    'verify_fix',
    {
      description:
        'Re-run the last scenario and the full chaos suite against the current (possibly patched) home model to confirm repairs hold. Returns the updated report and health score.',
      inputSchema: {},
    },
    async () => {
      const before = state.lastReport.summary;
      state.refresh();
      const lines: string[] = [];
      lines.push(
        `Last scenario "${state.lastScenarioLabel}": ${state.lastReport.summary.passed}/${state.lastReport.summary.total} passed` +
          (state.lastReport.summary.failed > 0
            ? ` (still failing: ${state.lastReport.summary.failedRoutines.join(', ')})`
            : ' - ALL GREEN')
      );
      lines.push(`(before verification: ${before.passed}/${before.total} passed)`);
      lines.push('');
      lines.push(state.reportText());
      lines.push('');
      lines.push(state.suiteText());
      return text(lines.join('\n'));
    }
  );

  return server;
}

/** Convenience for ad-hoc simulations outside the MCP surface. */
export { runSimulation, formatFixResult };
