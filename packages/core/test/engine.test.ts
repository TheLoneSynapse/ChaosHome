import { describe, expect, it } from 'vitest';
import {
  applyFaults,
  buildSampleHome,
  runSimulation,
  runSuite,
  standardSuite,
  applyFixes,
  proposeFixes,
  formatSimulationReport,
  formatSuiteReport,
} from '../src/index.js';

describe('baseline: everything looks fine', () => {
  it('all 12 routines pass with no faults', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, []);
    expect(report.summary.total).toBe(12);
    expect(report.summary.failed).toBe(0);
    expect(report.results.every((r) => r.status === 'pass')).toBe(true);
  });
});

describe('fault injection produces real failures with root causes', () => {
  it('device_offline breaks routines that hard-depend on the device', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'device_offline', deviceId: 'd-bedroom-lamp' }]);
    const gm = report.results.find((r) => r.routineId === 'r-good-morning')!;
    expect(gm.status).toBe('fail');
    const failed = gm.steps.find((s) => s.status === 'fail')!;
    expect(failed.code).toBe('DEVICE_OFFLINE');
    expect(failed.chain.join('\n')).toContain('Bedroom Lamp');
    expect(failed.chain.join('\n')).toContain('no fallback');
  });

  it('a device rename silently breaks name-pinned routines', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'device_renamed', deviceId: 'd-kitchen-plug' }]);
    const coffee = report.results.find((r) => r.routineId === 'r-coffee')!;
    expect(coffee.status).toBe('fail');
    const failed = coffee.steps.find((s) => s.status === 'fail')!;
    expect(failed.code).toBe('DEVICE_NOT_FOUND');
    expect(failed.chain.join('\n')).toContain('Coffee Maker');
  });

  it('group modification breaks routines that expect a member', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [
      { type: 'group_modified', groupId: 'g-living', removedDeviceId: 'd-living-lamp' },
    ]);
    const movie = report.results.find((r) => r.routineId === 'r-movie-night')!;
    expect(movie.status).toBe('fail');
    const failed = movie.steps.find((s) => s.status === 'fail')!;
    expect(failed.code).toBe('REQUIRED_MEMBER_MISSING');
    expect(failed.chain.join('\n')).toContain('Living Room Lamp');
  });

  it('disabled skill breaks skill-gated steps', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'skill_disabled', skillId: 's-weather' }]);
    const wx = report.results.find((r) => r.routineId === 'r-weather')!;
    expect(wx.status).toBe('fail');
    expect(wx.steps.find((s) => s.status === 'fail')!.code).toBe('SKILL_DISABLED');
    // routines without the skill still pass
    expect(report.results.find((r) => r.routineId === 'r-coffee')!.status).toBe('pass');
  });

  it('cloud outage fails cloud-dependent steps', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'cloud_unreachable' }]);
    expect(report.summary.failed).toBeGreaterThan(0);
    const gm = report.results.find((r) => r.routineId === 'r-good-morning')!;
    expect(gm.steps.some((s) => s.code === 'CLOUD_UNAVAILABLE')).toBe(true);
    // local-only routines (no cloud-dependent action) survive
    const path = report.results.find((r) => r.routineId === 'r-motion-path')!;
    // both its targets are cloudDependent devices, so it fails too - but a
    // pure notify/schedule routine would pass. Assert the sensor itself is fine:
    expect(path.steps.find((s) => s.kind === 'trigger')!.status).toBe('pass');
  });

  it('latency spike trips routines with tight budgets', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'latency_spike' }]);
    const gm = report.results.find((r) => r.routineId === 'r-good-morning')!;
    expect(gm.status).toBe('fail');
    expect(gm.steps.some((s) => s.code === 'TIMEOUT')).toBe(true);
    // routines without budgets keep passing
    expect(report.results.find((r) => r.routineId === 'r-coffee')!.status).toBe('pass');
  });

  it('offline sensor prevents the routine from firing at all', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'device_offline', deviceId: 'd-motion' }]);
    const path = report.results.find((r) => r.routineId === 'r-motion-path')!;
    expect(path.status).toBe('fail');
    expect(path.steps[0].code).toBe('TRIGGER_DEVICE_OFFLINE');
  });

  it('applyFaults does not mutate the original home', () => {
    const home = buildSampleHome();
    applyFaults(home, [{ type: 'device_offline', deviceId: 'd-living-lamp' }]);
    expect(home.devices.find((d) => d.id === 'd-living-lamp')!.online).toBe(true);
  });
});

describe('chaos suite and fragility scoring', () => {
  it('baseline is all green while the suite exposes fragile routines', () => {
    const home = buildSampleHome();
    const suite = runSuite(home);
    expect(suite.baseline.summary.failed).toBe(0);
    expect(suite.scenarios.length).toBeGreaterThan(15);
    expect(suite.health.score).toBeLessThan(1);
    expect(suite.topRisks.length).toBeGreaterThan(0);
    expect(suite.topRisks[0].fragility).toBeGreaterThan(0);
    // every routine has been scored
    expect(suite.routineHealth.length).toBe(home.routines.length);
  });

  it('standard suite covers every device, group and skill', () => {
    const home = buildSampleHome();
    const suite = standardSuite(home);
    const ids = suite.map((s) => s.id);
    for (const d of home.devices) expect(ids).toContain(`offline_${d.id}`);
    for (const g of home.groups) expect(ids).toContain(`group_${g.id}`);
    for (const s of home.skills) expect(ids).toContain(`skill_${s.id}`);
    expect(ids).toContain('cloud_outage');
    expect(ids).toContain('latency_spike');
  });

  it('reports format to readable text', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'cloud_unreachable' }]);
    const text = formatSimulationReport(report);
    expect(text).toContain('FAIL');
    const suite = runSuite(home);
    const suiteText = formatSuiteReport(suite);
    expect(suiteText).toContain('Home health score');
  });
});

describe('auto-fixer: fixes must survive re-running the same fault', () => {
  const scenarios: { name: string; faults: Parameters<typeof runSimulation>[1] }[] = [
    { name: 'device offline', faults: [{ type: 'device_offline', deviceId: 'd-bedroom-lamp' }] },
    { name: 'device rename', faults: [{ type: 'device_renamed', deviceId: 'd-kitchen-plug' }] },
    {
      name: 'group modified',
      faults: [{ type: 'group_modified', groupId: 'g-all-lights', removedDeviceId: 'd-living-lamp' }],
    },
    { name: 'skill disabled', faults: [{ type: 'skill_disabled', skillId: 's-comm' }] },
    { name: 'cloud outage', faults: [{ type: 'cloud_unreachable' }] },
    { name: 'latency spike', faults: [{ type: 'latency_spike' }] },
  ];

  for (const scenario of scenarios) {
    it(`${scenario.name}: auto-fix takes failing routines to green`, () => {
      const home = buildSampleHome();
      const report = runSimulation(home, scenario.faults);
      expect(report.summary.failed).toBeGreaterThan(0);

      const { fixes, skipped } = proposeFixes(home, report);
      expect(fixes.length).toBeGreaterThan(0);

      const fixedHome = applyFixes(home, fixes);
      const verification = runSimulation(fixedHome, scenario.faults);
      expect(verification.summary.failed).toBe(0);
      expect(skipped).toEqual([]); // sample home: every sample failure is remediable
    });
  }

  it('thermostat offline is honestly unfixable (no substitute exists)', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'device_offline', deviceId: 'd-thermo' }]);
    expect(report.summary.failed).toBeGreaterThan(0);
    const { skipped } = proposeFixes(home, report);
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped[0].reason).toContain('No automated remediation');
  });

  it('suite-wide repairs hold in EVERY scenario and keep the baseline green', () => {
    const home = buildSampleHome();
    const suite = runSuite(home);

    // Repair the way the server does: collect fixes from baseline + all scenarios.
    const fixMap = new Map<string, import('../src/index.js').Fix>();
    for (const report of [runSimulation(home, []), ...suite.reports]) {
      for (const fix of proposeFixes(home, report).fixes) {
        const key = `${fix.routineId}|${fix.actionId ?? 'routine'}|${fix.remediation}`;
        if (!fixMap.has(key)) fixMap.set(key, fix); // first-wins, same as server repair()
      }
    }
    const fixedHome = applyFixes(home, [...fixMap.values()]);

    // Repairs must not break the baseline (no faults).
    expect(runSimulation(fixedHome, []).summary.failed).toBe(0);

    // Every scenario must now be green, except the two honest gaps:
    // - the thermostat has no substitute
    // - the motion sensor dying kills the trigger (needs a manual sensor swap)
    const honestGaps = new Set(['offline_d-thermo', 'offline_d-motion']);
    const stillBroken: string[] = [];
    for (const scenario of suite.scenarios) {
      const report = runSimulation(fixedHome, scenario.faults);
      if (report.summary.failed > 0) stillBroken.push(scenario.id);
    }
    expect(stillBroken).toEqual([...stillBroken.filter((id) => honestGaps.has(id))]);
    expect(stillBroken.length).toBe(2); // exactly the two honest gaps remain
  });

  it('fixes are applied to the baseline, not to the faulted clone', () => {
    const home = buildSampleHome();
    const report = runSimulation(home, [{ type: 'device_offline', deviceId: 'd-bedroom-lamp' }]);
    const { fixes } = proposeFixes(home, report);
    const fixedHome = applyFixes(home, fixes);
    // baseline state untouched
    expect(fixedHome.devices.find((d) => d.id === 'd-bedroom-lamp')!.online).toBe(true);
    // the routine gained a fallback on the patched copy...
    const patchedAction = fixedHome.routines
      .find((r) => r.id === 'r-good-morning')!
      .actions.find((a) => a.id === 'a-gm-1')!;
    expect(patchedAction.fallbackDeviceIds).toContain('d-living-lamp');
    // ...while the original model is unchanged
    const originalAction = home.routines
      .find((r) => r.id === 'r-good-morning')!
      .actions.find((a) => a.id === 'a-gm-1')!;
    expect(originalAction.fallbackDeviceId).toBeUndefined();
  });
});
