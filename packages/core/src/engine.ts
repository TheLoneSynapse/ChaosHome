import type {
  Action,
  Device,
  FaultInjection,
  HomeModel,
  Routine,
  RoutineResult,
  SimulationReport,
  StepResult,
} from './types.js';

const BASE_ACTION_MS = 100;
const DEFAULT_LATENCY_MS = 500;

export interface FaultContext {
  cloudDown: boolean;
  latencyPerActionMs: number;
  faults: FaultInjection[];
}

/** Deep-clones the home and applies fault transformations to the clone. */
export function applyFaults(home: HomeModel, faults: FaultInjection[]): HomeModel {
  const faulted: HomeModel = structuredClone(home);

  for (const fault of faults) {
    switch (fault.type) {
      case 'device_offline': {
        const device = faulted.devices.find((d) => d.id === fault.deviceId);
        if (device) device.online = false;
        break;
      }
      case 'device_renamed': {
        const device = faulted.devices.find((d) => d.id === fault.deviceId);
        if (device) device.name = fault.newName ?? `${device.name} (renamed)`;
        break;
      }
      case 'group_modified': {
        const group = faulted.groups.find((g) => g.id === fault.groupId);
        if (group) {
          const removeId = fault.removedDeviceId ?? group.deviceIds[0];
          group.deviceIds = group.deviceIds.filter((id) => id !== removeId);
        }
        break;
      }
      case 'skill_disabled': {
        const skill = faulted.skills.find((s) => s.id === fault.skillId);
        if (skill) skill.enabled = false;
        break;
      }
      case 'cloud_unreachable':
      case 'latency_spike':
        // Global faults: handled through FaultContext, nothing to mutate.
        break;
    }
  }
  return faulted;
}

export function buildFaultContext(faults: FaultInjection[]): FaultContext {
  const latencyFault = faults.find((f) => f.type === 'latency_spike');
  return {
    cloudDown: faults.some((f) => f.type === 'cloud_unreachable'),
    latencyPerActionMs: latencyFault ? (latencyFault.delayMs ?? DEFAULT_LATENCY_MS) : 0,
    faults,
  };
}

/** Human-readable description of an injected fault (used in root-cause chains). */
export function describeFault(fault: FaultInjection, home: HomeModel): string {
  switch (fault.type) {
    case 'device_offline': {
      const d = home.devices.find((x) => x.id === fault.deviceId);
      return `Injected fault: device "${d?.name ?? fault.deviceId}" went offline`;
    }
    case 'device_renamed': {
      const d = home.devices.find((x) => x.id === fault.deviceId);
      return `Injected fault: device "${d?.name ?? fault.deviceId}" was renamed to "${fault.newName ?? `${d?.name} (renamed)`}"`;
    }
    case 'group_modified': {
      const g = home.groups.find((x) => x.id === fault.groupId);
      const removed = home.devices.find((x) => x.id === fault.removedDeviceId);
      return `Injected fault: group "${g?.name ?? fault.groupId}" lost member "${removed?.name ?? fault.removedDeviceId ?? 'first member'}"`;
    }
    case 'skill_disabled': {
      const s = home.skills.find((x) => x.id === fault.skillId);
      return `Injected fault: skill "${s?.name ?? fault.skillId}" was disabled`;
    }
    case 'cloud_unreachable':
      return 'Injected fault: internet/cloud connection lost';
    case 'latency_spike':
      return `Injected fault: network latency spike (+${fault.delayMs ?? DEFAULT_LATENCY_MS}ms per step)`;
  }
}

interface ResolveOutcome {
  device?: Device;
  groupLabel?: string;
  targetedDeviceIds: string[];
  failure?: {
    code: NonNullable<StepResult['code']>;
    message: string;
    refName?: string;
    actualName?: string;
  };
  notes: string[];
}

function resolveTarget(action: Action, home: HomeModel): ResolveOutcome {
  const notes: string[] = [];

  if (action.deviceIds && action.deviceIds.length > 0) {
    // Explicit multi-device target (post-decouple).
    const names: string[] = [];
    for (const id of action.deviceIds) {
      const d = home.devices.find((x) => x.id === id);
      names.push(d?.name ?? id);
    }
    return { targetedDeviceIds: [...action.deviceIds], notes };
  }

  if (action.deviceId) {
    const device = home.devices.find((d) => d.id === action.deviceId);
    if (!device) {
      return {
        targetedDeviceIds: [],
        failure: {
          code: 'DEVICE_NOT_FOUND',
          message: `Target device id "${action.deviceId}" does not exist`,
        },
        notes,
      };
    }
    if (action.targetName && device.name !== action.targetName) {
      return {
        device,
        targetedDeviceIds: [device.id],
        failure: {
          code: 'DEVICE_NOT_FOUND',
          message: `Routine still targets saved name "${action.targetName}", but the device is now named "${device.name}"`,
          refName: action.targetName,
          actualName: device.name,
        },
        notes,
      };
    }
    return { device, targetedDeviceIds: [device.id], notes };
  }

  if (action.groupId) {
    const group = home.groups.find((g) => g.id === action.groupId);
    if (!group) {
      return {
        targetedDeviceIds: [],
        failure: { code: 'GROUP_EMPTY', message: `Group id "${action.groupId}" does not exist` },
        notes,
      };
    }
    const members = group.deviceIds.filter((id) =>
      home.devices.some((d) => d.id === id)
    );

    if (members.length === 0) {
      return {
        groupLabel: group.name,
        targetedDeviceIds: [],
        failure: { code: 'GROUP_EMPTY', message: `Group "${group.name}" has no devices` },
        notes,
      };
    }

    const required = action.requiredDeviceIds ?? [];
    const missing = required.filter((id) => !group.deviceIds.includes(id));
    if (missing.length > 0) {
      const missingNames = missing
        .map((id) => home.devices.find((d) => d.id === id)?.name ?? id)
        .join(', ');
      return {
        groupLabel: group.name,
        targetedDeviceIds: members,
        failure: {
          code: 'REQUIRED_MEMBER_MISSING',
          message: `Routine expects "${missingNames}" in group "${group.name}", but it is no longer a member`,
        },
        notes,
      };
    }

    return { groupLabel: group.name, targetedDeviceIds: members, notes };
  }

  return {
    targetedDeviceIds: [],
    failure: { code: 'DEVICE_NOT_FOUND', message: 'Action has no target' },
    notes,
  };
}

function collectTargetIds(action: Action, home: HomeModel): Set<string> {
  const ids = new Set<string>();
  if (action.deviceId) ids.add(action.deviceId);
  if (action.deviceIds) action.deviceIds.forEach((id) => ids.add(id));
  if (action.groupId) {
    home.groups.find((g) => g.id === action.groupId)?.deviceIds.forEach((id) => ids.add(id));
  }
  return ids;
}

function matchingFaultDescription(
  action: Action,
  ctx: FaultContext,
  home: HomeModel
): string | undefined {
  const targetIds = collectTargetIds(action, home);
  const hit = ctx.faults.find((f) => {
    switch (f.type) {
      case 'device_offline':
      case 'device_renamed':
        return f.deviceId !== undefined && targetIds.has(f.deviceId);
      case 'group_modified':
        return f.groupId !== undefined && f.groupId === action.groupId;
      case 'skill_disabled':
        return f.skillId !== undefined && f.skillId === action.skillId;
      case 'cloud_unreachable':
        return ctx.cloudDown;
      default:
        return false;
    }
  });
  return hit ? describeFault(hit, home) : undefined;
}

function actionLabel(action: Action, home: HomeModel): string {
  const verb = action.type.replace('_', ' ');
  if (action.deviceId) {
    const name = home.devices.find((d) => d.id === action.deviceId)?.name ?? action.deviceId;
    return `${verb} "${name}"`;
  }
  if (action.groupId) {
    const name = home.groups.find((g) => g.id === action.groupId)?.name ?? action.groupId;
    return `${verb} group "${name}"`;
  }
  if (action.deviceIds?.length) {
    const names = action.deviceIds
      .map((id) => home.devices.find((d) => d.id === id)?.name ?? id)
      .join(', ');
    return `${verb} [${names}]`;
  }
  return verb;
}

function executeAction(
  action: Action,
  home: HomeModel,
  ctx: FaultContext
): { step: StepResult; durationMs: number } {
  const label = actionLabel(action, home);
  const durationMs = BASE_ACTION_MS + ctx.latencyPerActionMs;

  const makeStep = (
    status: StepResult['status'],
    code?: StepResult['code'],
    message?: string,
    extraChain: string[] = []
  ): StepResult => {
    const faultDesc = matchingFaultDescription(action, ctx, home);
    const chain = [
      ...(faultDesc ? [faultDesc] : []),
      `Step: ${label}`,
      ...(message ? [message] : []),
      ...extraChain,
    ];
    return { kind: 'action', actionId: action.id, label, status, code, message, chain };
  };

  // Skill gate
  if (action.skillId) {
    const skill = home.skills.find((s) => s.id === action.skillId);
    if (skill && !skill.enabled) {
      return {
        step: makeStep(
          'fail',
          'SKILL_DISABLED',
          `Skill "${skill.name}" is disabled, so this step cannot run`,
          [`Root cause: the routine depends on skill "${skill.name}" which got disabled`]
        ),
        durationMs,
      };
    }
  }

  // Targetless actions (e.g. push notifications) always succeed locally.
  if (!action.deviceId && !action.groupId && !action.deviceIds?.length) {
    if (action.type === 'notify') {
      return { step: makeStep('pass'), durationMs };
    }
  }

  const resolved = resolveTarget(action, home);

  if (resolved.failure) {
    const extra: string[] = [];
    if (resolved.failure.refName) {
      extra.push(
        'Root cause: routines store the device name captured at creation time; renaming silently breaks the reference'
      );
    }
    return {
      step: makeStep('fail', resolved.failure.code, resolved.failure.message, extra),
      durationMs,
    };
  }

  // Offline check across targeted devices (honoring fallback device).
  const offlineMembers: Device[] = [];
  for (const id of resolved.targetedDeviceIds) {
    const device = home.devices.find((d) => d.id === id);
    if (device && !device.online) offlineMembers.push(device);
  }

  const notes = [...resolved.notes];
  if (offlineMembers.length > 0) {
    const fallbacks = (action.fallbackDeviceIds ?? [])
      .map((id) => home.devices.find((d) => d.id === id))
      .filter((d): d is Device => Boolean(d));
    const usable = fallbacks.find((f) => f.online);
    if (usable) {
      notes.push(
        `Fallback engaged: "${offlineMembers[0].name}" unreachable, "${usable.name}" used instead`
      );
    } else {
      const names = offlineMembers.map((d) => d.name).join(', ');
      return {
        step: makeStep(
          'fail',
          'DEVICE_OFFLINE',
          `Cannot reach: ${names}`,
          ['Root cause: this routine has a hard dependency on the device and no fallback is defined']
        ),
        durationMs,
      };
    }
  }

  // Cloud check
  const cloudTargets = resolved.targetedDeviceIds
    .map((id) => home.devices.find((d) => d.id === id))
    .filter((d): d is Device => Boolean(d));
  const needsCloud = action.requiresCloud ?? cloudTargets.some((d) => d.cloudDependent);
  if (ctx.cloudDown && needsCloud) {
    const nonLocal = cloudTargets.filter((d) => !d.localControllable);
    const detail =
      nonLocal.length > 0 && nonLocal.length < cloudTargets.length
        ? `${nonLocal.map((d) => d.name).join(', ')} cannot be controlled locally`
        : cloudTargets.map((d) => d.name).join(', ');
    return {
      step: makeStep(
        'fail',
        'CLOUD_UNAVAILABLE',
        `Cloud is unreachable and ${detail}`,
        ['Root cause: this step is cloud-dependent with no local-control path']
      ),
      durationMs,
    };
  }

  const step = makeStep('pass');
  if (notes.length > 0) step.chain.push(...notes);
  return { step, durationMs };
}

export function executeRoutine(
  routine: Routine,
  home: HomeModel,
  ctx: FaultContext
): RoutineResult {
  const steps: StepResult[] = [];
  let durationMs = 0;

  // Trigger evaluation
  if (routine.trigger.type === 'sensor' && routine.trigger.sensorDeviceId) {
    const sensor = home.devices.find((d) => d.id === routine.trigger.sensorDeviceId);
    if (sensor && !sensor.online) {
      steps.push({
        kind: 'trigger',
        label: `Trigger: ${routine.trigger.label}`,
        status: 'fail',
        code: 'TRIGGER_DEVICE_OFFLINE',
        message: `Sensor "${sensor.name}" is offline, so the routine never fires`,
        chain: [
          `Trigger: ${routine.trigger.label}`,
          `Sensor "${sensor.name}" is offline`,
          'Root cause: the routine cannot even start',
        ],
      });
    } else {
      steps.push({
        kind: 'trigger',
        label: `Trigger: ${routine.trigger.label}`,
        status: 'pass',
        chain: [`Trigger: ${routine.trigger.label}`],
      });
    }
  } else {
    steps.push({
      kind: 'trigger',
      label: `Trigger: ${routine.trigger.label}`,
      status: 'pass',
      chain: [`Trigger: ${routine.trigger.label}`],
    });
  }

  for (const action of routine.actions) {
    const { step, durationMs: d } = executeAction(action, home, ctx);
    durationMs += d;
    steps.push(step);
  }

  if (routine.budgetMs && durationMs > routine.budgetMs) {
    steps.push({
      kind: 'action',
      label: 'Routine time budget',
      status: 'fail',
      code: 'TIMEOUT',
      message: `Routine took ${durationMs}ms, exceeding its ${routine.budgetMs}ms budget`,
      chain: [
        ...ctx.faults.map((f) => describeFault(f, home)),
        `Step: routine time budget (${routine.budgetMs}ms)`,
        `Completed in ${durationMs}ms`,
        'Root cause: the routine has no time-budget headroom for degraded network conditions',
      ],
    });
  }

  const status: RoutineResult['status'] = steps.every((s) => s.status === 'pass')
    ? 'pass'
    : 'fail';
  return { routineId: routine.id, routineName: routine.name, status, steps, durationMs };
}

/** Runs one scenario (a set of faults) against every routine in the home. */
export function runSimulation(
  home: HomeModel,
  faults: FaultInjection[],
  scenarioName?: string
): SimulationReport {
  const ctx = buildFaultContext(faults);
  const faulted = applyFaults(home, faults);
  const results = home.routines.map((r) => executeRoutine(r, faulted, ctx));
  const failed = results.filter((r) => r.status === 'fail');
  return {
    scenario:
      scenarioName ??
      (faults.length === 0
        ? 'Baseline (no faults)'
        : faults.map((f) => f.type).join(' + ')),
    faults,
    results,
    summary: {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      failedRoutines: failed.map((r) => r.routineId),
    },
  };
}
