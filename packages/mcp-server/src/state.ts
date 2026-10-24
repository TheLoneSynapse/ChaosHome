import {
  applyFixes,
  buildSampleHome,
  formatRoutineDetail,
  formatSimulationReport,
  formatSuiteReport,
  proposeFixes,
  runSimulation,
  runSuite,
  type FaultInjection,
  type Fix,
  type HomeModel,
  type SimulationReport,
  type SuiteReport,
} from '@chaoshome/core';

export interface Preset {
  id: string;
  label: string;
  faults: FaultInjection[];
}

/** One-click scenarios for the dashboard and the agent. */
export const PRESETS: Preset[] = [
  { id: 'suite', label: 'Run full chaos suite', faults: [] },
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
  {
    id: 'lamp_offline',
    label: 'Bedroom Lamp goes offline',
    faults: [{ type: 'device_offline', deviceId: 'd-bedroom-lamp' }],
  },
  {
    id: 'lock_offline',
    label: 'Front Door Lock goes offline',
    faults: [{ type: 'device_offline', deviceId: 'd-front-lock' }],
  },
  {
    id: 'thermo_offline',
    label: 'Thermostat goes offline (no substitute exists)',
    faults: [{ type: 'device_offline', deviceId: 'd-thermo' }],
  },
  {
    id: 'rename_coffee',
    label: 'Coffee Maker is renamed',
    faults: [{ type: 'device_renamed', deviceId: 'd-kitchen-plug' }],
  },
  {
    id: 'group_break',
    label: 'Living Room group loses a member',
    faults: [
      { type: 'group_modified', groupId: 'g-living', removedDeviceId: 'd-living-lamp' },
    ],
  },
  {
    id: 'skill_off',
    label: 'Announce & Communicate skill disabled',
    faults: [{ type: 'skill_disabled', skillId: 's-comm' }],
  },
  {
    id: 'motion_offline',
    label: 'Motion sensor offline (trigger dies)',
    faults: [{ type: 'device_offline', deviceId: 'd-motion' }],
  },
];

export interface RepairSummary {
  applied: Fix[];
  skipped: { routineId: string; reason: string }[];
  verificationText: string;
  healthBefore: number;
  healthAfter: number;
}

/** Auto-fix deadline: fix it for the user if they do not respond in time. */
export const AUTO_FIX_MS = 5 * 60 * 1000;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const pct = (v: number): string => `${Math.round(v * 100)}%`;

export class ChaosState {
  baseHome: HomeModel;
  /** The user's designed (primary) state - what "normal" should look like. */
  designedHome: HomeModel | null = null;
  designedAt: string | null = null;
  /** Deadline (epoch ms) after which an unfixed failure is auto-repaired. */
  autoFixAt: number | null = null;
  /** Generated message describing the last automatic repair. */
  autoFixMessage: string | null = null;
  lastFaults: FaultInjection[] = [];
  lastScenarioLabel = 'Baseline (no faults)';
  lastReport: SimulationReport;
  lastSuite: SuiteReport;
  history: string[] = [];

  constructor() {
    this.baseHome = buildSampleHome();
    this.lastReport = runSimulation(this.baseHome, [], this.lastScenarioLabel);
    this.lastSuite = runSuite(this.baseHome);
  }

  reset(): void {
    this.baseHome = buildSampleHome();
    this.lastFaults = [];
    this.lastScenarioLabel = 'Baseline (no faults)';
    this.lastReport = runSimulation(this.baseHome, [], this.lastScenarioLabel);
    this.lastSuite = runSuite(this.baseHome);
    this.history = [];
    this.autoFixAt = null;
    this.autoFixMessage = null;
    // the saved designed state survives a reset - it is the user's target.
  }

  /* ---------------------------------------------------------------- */
  /* Designed (primary) state                                          */
  /* ---------------------------------------------------------------- */

  saveDesigned(): void {
    this.designedHome = clone(this.baseHome);
    this.designedAt = new Date().toISOString();
    this.history.push(`[design] Current configuration saved as the designed state`);
  }

  restoreDesigned(): boolean {
    if (!this.designedHome) return false;
    this.baseHome = clone(this.designedHome);
    this.lastFaults = [];
    this.lastScenarioLabel = 'Restored to designed state';
    this.lastReport = runSimulation(this.baseHome, [], this.lastScenarioLabel);
    this.lastSuite = runSuite(this.baseHome);
    this.autoFixAt = null;
    this.history.push(`[design] Home restored to the designed state`);
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Auto-fix: repair failures the user did not fix within 5 minutes   */
  /* ---------------------------------------------------------------- */

  private armAutoFix(on: boolean): void {
    this.autoFixAt = on ? Date.now() + AUTO_FIX_MS : null;
  }

  /** Called every second by the server. Repairs overdue failures and
   *  generates a message describing what it did. Returns the message. */
  tickAutoFix(now = Date.now()): string | null {
    if (this.autoFixAt === null || now < this.autoFixAt) return null;

    const failedBefore = this.lastReport.summary.failedRoutines;
    const summary = this.repair();
    const stillFailing = this.lastReport.summary.failedRoutines;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let message: string;
    if (summary.applied.length > 0) {
      message =
        `Auto-fix at ${time}: no manual response within 5 minutes for ` +
        `${failedBefore.join(', ') || 'the failing routines'}. ` +
        `Applied ${summary.applied.length} remediation${summary.applied.length === 1 ? '' : 's'} - ` +
        `health ${pct(summary.healthBefore)} -> ${pct(summary.healthAfter)}.` +
        (stillFailing.length === 0 ? ' All green again.' : ` Still failing: ${stillFailing.join(', ')}.`);
    } else {
      message =
        `Auto-fix at ${time}: the 5-minute window passed for ` +
        `${failedBefore.join(', ') || 'the failing routines'}, ` +
        `but no automated remedy exists - needs manual attention.`;
    }

    this.autoFixMessage = message;
    this.history.push(`[auto-fix] ${message}`);

    if (summary.applied.length > 0 && stillFailing.length > 0) {
      this.armAutoFix(true); // give the user another window for the remainder
    } else {
      this.autoFixAt = null;
    }
    return message;
  }

  refresh(): void {
    this.lastReport = runSimulation(this.baseHome, this.lastFaults, this.lastScenarioLabel);
    this.lastSuite = runSuite(this.baseHome);
  }

  runScenario(faults: FaultInjection[], label?: string): SimulationReport {
    this.lastFaults = faults;
    this.lastScenarioLabel =
      label ??
      (faults.length === 0 ? 'Baseline (no faults)' : faults.map((f) => f.type).join(' + '));
    this.lastReport = runSimulation(this.baseHome, faults, this.lastScenarioLabel);
    this.autoFixMessage = null;
    this.armAutoFix(this.lastReport.summary.failed > 0);
    return this.lastReport;
  }

  runSuiteScenario(): SuiteReport {
    this.lastSuite = runSuite(this.baseHome);
    this.autoFixMessage = null;
    this.armAutoFix(this.lastSuite.health.failingRoutines > 0);
    return this.lastSuite;
  }

  /**
   * Proposes remediations for every failing routine across the last scenario
   * AND the full suite, applies them to the baseline home, then re-simulates
   * to verify the fixes actually hold.
   */
  repair(routineId?: string): RepairSummary {
    const healthBefore = this.lastSuite.health.score;

    const reports: SimulationReport[] = [this.lastReport, ...this.lastSuite.reports];
    const fixMap = new Map<string, Fix>();
    const skipped: { routineId: string; reason: string }[] = [];
    const skippedSeen = new Set<string>();

    for (const report of reports) {
      const proposed = proposeFixes(this.baseHome, report);
      for (const fix of proposed.fixes) {
        if (routineId && fix.routineId !== routineId) continue;
        const key = `${fix.routineId}|${fix.actionId ?? 'routine'}|${fix.remediation}`;
        if (!fixMap.has(key)) fixMap.set(key, fix);
      }
      for (const s of proposed.skipped) {
        if (routineId && s.routineId !== routineId) continue;
        const key = `${s.routineId}|${s.reason}`;
        if (!skippedSeen.has(key)) {
          skippedSeen.add(key);
          skipped.push(s);
        }
      }
    }

    const applied = [...fixMap.values()];
    if (applied.length > 0) {
      this.baseHome = applyFixes(this.baseHome, applied);
      this.history.push(
        ...applied.map((f) => `[${f.remediation}] ${f.routineId}${f.actionId ? ` / ${f.actionId}` : ''}: ${f.description}`)
      );
    }
    this.refresh();
    if (this.lastReport.summary.failed === 0) this.autoFixAt = null;

    const lines: string[] = [];
    lines.push('REMEDIATION APPLIED');
    lines.push('===================');
    if (applied.length === 0) lines.push('No automated fixes available for these failures.');
    for (const fix of applied) {
      lines.push(`- [${fix.remediation}] ${fix.routineId}${fix.actionId ? ` / ${fix.actionId}` : ''}`);
      lines.push(`  ${fix.description}`);
    }
    for (const s of skipped) {
      lines.push(`- NEEDS MANUAL ATTENTION ${s.routineId}: ${s.reason}`);
    }
    lines.push('');
    lines.push(
      `Re-simulation ("${this.lastScenarioLabel}"): ` +
        `${this.lastReport.summary.passed}/${this.lastReport.summary.total} passed` +
        (this.lastReport.summary.failed > 0
          ? ` (still failing: ${this.lastReport.summary.failedRoutines.join(', ')})`
          : ' - ALL GREEN')
    );
    lines.push(
      `Home health after fixes: ${(this.lastSuite.health.score * 100).toFixed(1)}% ` +
        `(was ${(healthBefore * 100).toFixed(1)}%)`
    );

    return {
      applied,
      skipped,
      verificationText: lines.join('\n'),
      healthBefore,
      healthAfter: this.lastSuite.health.score,
    };
  }

  explain(routineId: string): string {
    const inLast = this.lastReport.results.find((r) => r.routineId === routineId);
    if (inLast && inLast.status === 'fail') {
      return (
        `Scenario: ${this.lastReport.scenario}\n\n` + formatRoutineDetail(inLast)
      );
    }
    for (const report of this.lastSuite.reports) {
      const result = report.results.find((r) => r.routineId === routineId);
      if (result && result.status === 'fail') {
        return `Scenario: ${report.scenario}\n\n` + formatRoutineDetail(result);
      }
    }
    if (inLast) {
      const health =
        this.lastSuite.routineHealth.find((h) => h.routineId === routineId) ?? {
          fragility: 0,
          failures: 0,
          scenarios: 0,
        };
      return (
        `Routine "${inLast.routineName}" PASSES in scenario "${this.lastReport.scenario}".\n` +
        `Suite fragility: ${Math.round(health.fragility * 100)}% ` +
        `(fails ${health.failures} of ${health.scenarios} scenarios).\n` +
        (health.failures === 0
          ? 'This routine survives every simulated fault.'
          : 'Run apply_fix or ask me to repair it.')
      );
    }
    return `Routine "${routineId}" not found. Use get_routines to list routines.`;
  }

  reportText(): string {
    return formatSimulationReport(this.lastReport);
  }

  suiteText(): string {
    return formatSuiteReport(this.lastSuite);
  }

  snapshot() {
    return {
      home: this.baseHome,
      presets: PRESETS,
      lastScenarioLabel: this.lastScenarioLabel,
      lastFaults: this.lastFaults,
      lastReport: this.lastReport,
      suite: {
        health: this.lastSuite.health,
        baseline: this.lastSuite.baseline.summary,
        routineHealth: this.lastSuite.routineHealth,
        topRisks: this.lastSuite.topRisks,
        scenarios: this.lastSuite.scenarios.map((s) => ({
          id: s.id,
          label: s.label,
          faults: s.faults,
        })),
        results: this.lastSuite.reports.map((r) => ({
          scenario: r.scenario,
          passed: r.summary.passed,
          failed: r.summary.failed,
          failedRoutines: r.summary.failedRoutines,
        })),
      },
      history: this.history,
      design: {
        saved: this.designedHome !== null,
        savedAt: this.designedAt,
        matches:
          this.designedHome === null
            ? null
            : JSON.stringify(this.designedHome) === JSON.stringify(this.baseHome) &&
              this.lastFaults.length === 0,
      },
      autoFix: {
        dueAt: this.autoFixAt,
        message: this.autoFixMessage,
      },
    };
  }
}
