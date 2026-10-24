import { runSimulation } from './engine.js';
import type {
  Action,
  FailureCode,
  Fix,
  FixResult,
  HomeModel,
  SimulationReport,
} from './types.js';

function findDevice(home: HomeModel, id?: string) {
  return id ? home.devices.find((d) => d.id === id) : undefined;
}

/**
 * Ordered list of online same-capability substitutes for a broken device
 * (same room first). The engine walks this chain and uses the first online
 * device, so a single-fault scenario can never take out fallback and target
 * at once.
 */
export function fallbackCandidates(
  home: HomeModel,
  brokenId: string,
  excludeIds: Set<string> = new Set()
): string[] {
  const target = findDevice(home, brokenId);
  if (!target) return [];
  const candidates = home.devices.filter(
    (d) =>
      d.id !== brokenId &&
      !excludeIds.has(d.id) &&
      d.online &&
      d.capability === target.capability
  );
  const sameRoom = candidates.filter((d) => d.room === target.room);
  const elsewhere = candidates.filter((d) => d.room !== target.room);
  return [...sameRoom, ...elsewhere].map((d) => d.id);
}

/** Best single online substitute for an unavailable device. */
export function findSubstitute(
  home: HomeModel,
  unavailableId: string,
  excludeIds: Set<string> = new Set()
): string | undefined {
  return fallbackCandidates(home, unavailableId, excludeIds)[0];
}

function localControllableFor(home: HomeModel, action: Action): boolean {
  const ids: string[] = [];
  if (action.deviceId) ids.push(action.deviceId);
  if (action.deviceIds) ids.push(...action.deviceIds);
  if (action.groupId) {
    const group = home.groups.find((g) => g.id === action.groupId);
    if (group) ids.push(...group.deviceIds);
  }
  if (ids.length === 0) return false;
  return ids.every((id) => findDevice(home, id)?.localControllable ?? false);
}

/**
 * Proposes a remediation for one failed step of one routine.
 *
 * Important invariant: every proposed fix must SURVIVE re-running the same
 * fault scenario against the patched home (the auto-fixer re-simulates to
 * verify). That is why, e.g., a disabled skill is removed as a dependency
 * rather than "re-enabled" - the scenario disables it again on every run.
 */
export function proposeFixForStep(
  home: HomeModel,
  report: SimulationReport,
  routineId: string,
  action: Action | undefined,
  code: FailureCode
): Fix | undefined {
  if (!action && code !== 'TIMEOUT') return undefined;

  switch (code) {
    case 'DEVICE_OFFLINE': {
      if (!action) return undefined;
      const brokenId =
        action.deviceId ??
        action.deviceIds?.[0] ??
        report.faults.find((f) => f.type === 'device_offline')?.deviceId;
      if (!brokenId) return undefined;
      const chain = fallbackCandidates(home, brokenId);
      if (chain.length === 0) return undefined;
      const brokenName = findDevice(home, brokenId)?.name ?? brokenId;
      const chainNames = chain.map((id) => findDevice(home, id)?.name ?? id).join(' -> ');
      return {
        routineId,
        actionId: action.id,
        remediation: 'add_fallback',
        brokenDeviceId: brokenId,
        fallbackDeviceIds: chain,
        description: `Add fallback chain [${chainNames}] so this step survives "${brokenName}" going offline`,
      };
    }

    case 'DEVICE_NOT_FOUND': {
      if (!action?.deviceId || !action.targetName) return undefined;
      const renameFault = report.faults.find(
        (f) => f.type === 'device_renamed' && f.deviceId === action.deviceId
      );
      if (!renameFault) return undefined;
      return {
        routineId,
        actionId: action.id,
        remediation: 'relink_target',
        description: `Replace the fragile name-pinned reference "${action.targetName}" with a stable device-id reference, so renames can never break this step again`,
      };
    }

    case 'SKILL_DISABLED': {
      if (!action?.skillId) return undefined;
      const skill = home.skills.find((s) => s.id === action.skillId);
      if (!skill) return undefined;
      return {
        routineId,
        actionId: action.id,
        remediation: 'remove_skill_dependency',
        description: `Remove the hard dependency on skill "${skill.name}" so the step degrades gracefully instead of failing when the skill is disabled`,
      };
    }

    case 'CLOUD_UNAVAILABLE': {
      if (!action) return undefined;
      if (!localControllableFor(home, action)) return undefined;
      return {
        routineId,
        actionId: action.id,
        remediation: 'use_local_control',
        description: 'Switch this step to local LAN control so it still works during cloud outages',
      };
    }

    case 'GROUP_EMPTY':
    case 'REQUIRED_MEMBER_MISSING': {
      if (!action?.groupId) return undefined;
      const group = home.groups.find((g) => g.id === action.groupId);
      if (!group) return undefined;
      const explicit = [...group.deviceIds];
      const missing = (action.requiredDeviceIds ?? []).filter(
        (id) => !group.deviceIds.includes(id)
      );
      for (const id of missing) {
        const substitute = findSubstitute(home, id, new Set(explicit));
        if (substitute) explicit.push(substitute);
      }
      if (explicit.length === 0) return undefined;
      return {
        routineId,
        actionId: action.id,
        remediation: 'decouple_from_group',
        description:
          missing.length > 0
            ? `Decouple step from group "${group.name}" (it lost a required member) and target devices explicitly, substituting for "${missing
                .map((id) => findDevice(home, id)?.name ?? id)
                .join(', ')}"`
            : `Decouple step from empty group "${group.name}" and target devices explicitly`,
        explicitDeviceIds: explicit,
      };
    }

    case 'TIMEOUT': {
      return {
        routineId,
        remediation: 'increase_budget',
        description: 'Raise the routine time budget so it survives degraded-network conditions',
      };
    }

    case 'TRIGGER_DEVICE_OFFLINE':
      return undefined;

    default:
      return undefined;
  }
}

/** Collects remediation candidates for every failing routine in a report. */
export function proposeFixes(
  home: HomeModel,
  report: SimulationReport
): { fixes: Fix[]; skipped: { routineId: string; reason: string }[] } {
  const fixes: Fix[] = [];
  const skipped: { routineId: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const result of report.results) {
    if (result.status === 'pass') continue;
    for (const step of result.steps) {
      if (step.status !== 'fail' || !step.code) continue;
      const action = step.actionId
        ? home.routines
            .find((r) => r.id === result.routineId)
            ?.actions.find((a) => a.id === step.actionId)
        : undefined;
      const fix = proposeFixForStep(home, report, result.routineId, action, step.code);
      if (fix) {
        const key = `${fix.routineId}|${fix.actionId ?? 'routine'}|${fix.remediation}`;
        if (!seen.has(key)) {
          seen.add(key);
          fixes.push(fix);
        }
      } else if (!skipped.some((s) => s.routineId === result.routineId)) {
        skipped.push({
          routineId: result.routineId,
          reason: `No automated remediation for ${step.code} (manual attention required)`,
        });
      }
    }
  }
  return { fixes, skipped };
}

/** Applies fixes immutably to the (baseline) home model. */
export function applyFixes(home: HomeModel, fixes: Fix[]): HomeModel {
  const next = structuredClone(home);
  for (const fix of fixes) {
    const routine = next.routines.find((r) => r.id === fix.routineId);
    if (!routine) continue;

    if (fix.remediation === 'increase_budget') {
      const currentDuration = 100 * (routine.actions.length + 1);
      routine.budgetMs = Math.max(routine.budgetMs ?? 0, currentDuration) * 3 + 1000;
      continue;
    }

    if (!fix.actionId) continue;
    const action = routine.actions.find((a) => a.id === fix.actionId);
    if (!action) continue;

    switch (fix.remediation) {
      case 'add_fallback': {
        if (fix.fallbackDeviceIds?.length) {
          action.fallbackDeviceIds = [...fix.fallbackDeviceIds];
        }
        break;
      }
      case 'relink_target': {
        // Pin the step to the device id: the stale name check disappears,
        // so the fix holds whether or not a rename fault is injected.
        delete action.targetName;
        break;
      }
      case 'remove_skill_dependency': {
        delete action.skillId;
        break;
      }
      case 'use_local_control': {
        action.requiresCloud = false;
        break;
      }
      case 'decouple_from_group': {
        if (fix.explicitDeviceIds && fix.explicitDeviceIds.length > 0) {
          action.deviceIds = [...fix.explicitDeviceIds];
          delete action.groupId;
          delete action.requiredDeviceIds;
        }
        break;
      }
    }
  }
  return next;
}

/**
 * One-shot remediation: propose + apply fixes for a failing report,
 * then re-run the SAME scenario to verify the fixes actually hold.
 */
export function autoFix(
  home: HomeModel,
  report: SimulationReport
): { fixedHome: HomeModel; result: FixResult; verification: SimulationReport } {
  const { fixes, skipped } = proposeFixes(home, report);
  const fixedHome = applyFixes(home, fixes);
  const verification = runSimulation(
    fixedHome,
    report.faults,
    `${report.scenario} (after fixes)`
  );
  return { fixedHome, result: { applied: fixes, skipped }, verification };
}

export function formatFixResult(
  fixResult: FixResult,
  verification: SimulationReport
): string {
  const lines: string[] = [];
  lines.push('REMEDIATION APPLIED');
  lines.push('===================');
  if (fixResult.applied.length === 0) {
    lines.push('No automated fixes available for these failures.');
  }
  for (const fix of fixResult.applied) {
    lines.push(
      `- [${fix.remediation}] ${fix.routineId}${fix.actionId ? ` / ${fix.actionId}` : ''}`
    );
    lines.push(`  ${fix.description}`);
  }
  for (const skip of fixResult.skipped) {
    lines.push(`- NEEDS MANUAL ATTENTION ${skip.routineId}: ${skip.reason}`);
  }
  lines.push('');
  lines.push(
    `Re-simulation: ${verification.summary.passed}/${verification.summary.total} passed` +
      (verification.summary.failed > 0
        ? ` (still failing: ${verification.summary.failedRoutines.join(', ')})`
        : ' - ALL GREEN')
  );
  return lines.join('\n');
}
