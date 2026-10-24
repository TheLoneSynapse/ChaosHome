import { runSimulation } from './engine.js';
import type {
  FaultInjection,
  HomeModel,
  RoutineResult,
  SimulationReport,
} from './types.js';

export interface Scenario {
  id: string;
  label: string;
  faults: FaultInjection[];
}

export interface RoutineHealth {
  routineId: string;
  routineName: string;
  failures: number;
  scenarios: number;
  /** 0 = always survives, 1 = always breaks. */
  fragility: number;
  failedCodes: string[];
}

export interface SuiteReport {
  scenarios: Scenario[];
  reports: SimulationReport[];
  baseline: SimulationReport;
  routineHealth: RoutineHealth[];
  health: {
    score: number;
    totalRuns: number;
    passedRuns: number;
    failingRoutines: number;
    totalRoutines: number;
  };
  topRisks: RoutineHealth[];
}

/**
 * The standard fault-injection suite: one scenario per plausible household
 * mishap (offline device, renamed device, group edit, disabled skill,
 * cloud outage, latency spike).
 */
export function standardSuite(home: HomeModel): Scenario[] {
  const scenarios: Scenario[] = [
    {
      id: 'cloud_outage',
      label: 'Cloud / internet outage',
      faults: [{ type: 'cloud_unreachable' }],
    },
    {
      id: 'latency_spike',
      label: 'Network latency spike',
      faults: [{ type: 'latency_spike' }],
    },
  ];

  for (const device of home.devices) {
    scenarios.push({
      id: `offline_${device.id}`,
      label: `"${device.name}" goes offline`,
      faults: [{ type: 'device_offline', deviceId: device.id }],
    });
  }

  // Renames only matter for routines that pinned a name at creation time.
  const pinnedNames = new Set<string>();
  for (const routine of home.routines) {
    for (const action of routine.actions) {
      if (action.targetName && action.deviceId) pinnedNames.add(action.deviceId);
    }
  }
  for (const deviceId of pinnedNames) {
    const device = home.devices.find((d) => d.id === deviceId);
    if (device) {
      scenarios.push({
        id: `rename_${device.id}`,
        label: `"${device.name}" is renamed`,
        faults: [{ type: 'device_renamed', deviceId: device.id }],
      });
    }
  }

  for (const group of home.groups) {
    scenarios.push({
      id: `group_${group.id}`,
      label: `Group "${group.name}" loses a member`,
      faults: [
        {
          type: 'group_modified',
          groupId: group.id,
          removedDeviceId: group.deviceIds[0],
        },
      ],
    });
  }

  for (const skill of home.skills) {
    scenarios.push({
      id: `skill_${skill.id}`,
      label: `Skill "${skill.name}" disabled`,
      faults: [{ type: 'skill_disabled', skillId: skill.id }],
    });
  }

  return scenarios;
}

/** Runs every scenario and aggregates per-routine fragility. */
export function runSuite(home: HomeModel, scenarios?: Scenario[]): SuiteReport {
  const list = scenarios ?? standardSuite(home);
  const baseline = runSimulation(home, [], 'Baseline (no faults)');
  const reports = list.map((s) => runSimulation(home, s.faults, s.label));

  const routineHealth: RoutineHealth[] = home.routines.map((routine) => {
    let failures = 0;
    const codes = new Set<string>();
    for (const report of reports) {
      const result = report.results.find((r) => r.routineId === routine.id);
      if (result && result.status === 'fail') {
        failures += 1;
        for (const step of result.steps) {
          if (step.status === 'fail' && step.code) codes.add(step.code);
        }
      }
    }
    return {
      routineId: routine.id,
      routineName: routine.name,
      failures,
      scenarios: reports.length,
      fragility: reports.length === 0 ? 0 : failures / reports.length,
      failedCodes: [...codes],
    };
  });

  const totalRuns = reports.length * home.routines.length;
  const passedRuns = reports.reduce((acc, r) => acc + r.summary.passed, 0);
  const health = {
    score: totalRuns === 0 ? 1 : passedRuns / totalRuns,
    totalRuns,
    passedRuns,
    failingRoutines: routineHealth.filter((r) => r.failures > 0).length,
    totalRoutines: home.routines.length,
  };

  const topRisks = [...routineHealth]
    .sort((a, b) => b.fragility - a.fragility || a.routineName.localeCompare(b.routineName))
    .slice(0, 5);

  return { scenarios: list, reports, baseline, routineHealth, health, topRisks };
}

/* ------------------------------------------------------------------ */
/* Text formatting (used for MCP tool output and CLI)                  */
/* ------------------------------------------------------------------ */

export function formatSimulationReport(report: SimulationReport): string {
  const lines: string[] = [];
  lines.push(`Scenario: ${report.scenario}`);
  lines.push(
    `Result: ${report.summary.passed}/${report.summary.total} routines passed` +
      (report.summary.failed > 0 ? `, ${report.summary.failed} FAILED` : '')
  );
  lines.push('');

  for (const result of report.results) {
    const icon = result.status === 'pass' ? 'PASS' : 'FAIL';
    lines.push(`[${icon}] ${result.routineName} (${result.durationMs}ms)`);
    if (result.status === 'fail') {
      for (const step of result.steps) {
        if (step.status === 'fail') {
          lines.push(`  x ${step.label}`);
          if (step.code) lines.push(`    code: ${step.code}`);
          for (const link of step.chain) lines.push(`    > ${link}`);
        }
      }
    }
  }
  return lines.join('\n');
}

export function formatSuiteReport(suite: SuiteReport): string {
  const lines: string[] = [];
  lines.push('CHAOSHOME RESILIENCE REPORT');
  lines.push('===========================');
  lines.push(
    `Home health score: ${(suite.health.score * 100).toFixed(1)}% ` +
      `(${suite.health.passedRuns}/${suite.health.totalRuns} routine runs survived)` +
      (suite.baseline.summary.failed === 0
        ? ' [baseline: all routines green]'
        : ` [BASELINE BROKEN: ${suite.baseline.summary.failed} failing]`)
  );
  lines.push(`Scenarios run: ${suite.scenarios.length}`);
  lines.push('');
  lines.push('Most fragile routines:');
  for (const risk of suite.topRisks) {
    lines.push(
      `  - ${risk.routineName}: fails ${risk.failures}/${risk.scenarios} scenarios ` +
        `(${Math.round(risk.fragility * 100)}% fragile) [${risk.failedCodes.join(', ') || '-'}]`
    );
  }
  lines.push('');
  lines.push('Baseline:');
  lines.push(
    `  ${suite.baseline.summary.passed}/${suite.baseline.summary.total} routines pass when nothing is wrong` +
      (suite.baseline.summary.failed > 0
        ? ` -- FAILING: ${suite.baseline.summary.failedRoutines.join(', ')}`
        : ' (everything looks fine...)')
  );
  return lines.join('\n');
}

export function formatRoutineDetail(result: RoutineResult): string {
  const lines: string[] = [];
  lines.push(`Routine: ${result.routineName}`);
  lines.push(`Status: ${result.status.toUpperCase()} (${result.durationMs}ms)`);
  lines.push('');
  for (const step of result.steps) {
    lines.push(`[${step.status === 'pass' ? 'ok' : 'FAIL'}] ${step.label}`);
    if (step.status === 'fail') {
      if (step.code) lines.push(`  code: ${step.code}`);
      for (const link of step.chain) lines.push(`  > ${link}`);
    }
  }
  return lines.join('\n');
}
