/**
 * ChaosHome core type definitions.
 *
 * The whole product models a smart home as a testable program:
 * devices -> groups -> routines -> triggers/actions, plus fault injections.
 */

export type Capability =
  | 'light'
  | 'plug'
  | 'speaker'
  | 'thermostat'
  | 'lock'
  | 'blind'
  | 'camera'
  | 'sensor'
  | 'display';

export interface Device {
  id: string;
  /** Friendly name as the user knows it (renaming breaks name-based references). */
  name: string;
  room: string;
  capability: Capability;
  online: boolean;
  /** Device control normally goes through the cloud (Alexa-style). */
  cloudDependent: boolean;
  /** Whether the device can still be driven locally when the cloud is down. */
  localControllable: boolean;
}

export interface Group {
  id: string;
  name: string;
  deviceIds: string[];
}

export interface Skill {
  id: string;
  name: string;
  enabled: boolean;
}

export type ActionType =
  | 'turn_on'
  | 'turn_off'
  | 'set_level'
  | 'set_temperature'
  | 'lock'
  | 'unlock'
  | 'say'
  | 'notify';

export interface Action {
  id: string;
  type: ActionType;
  /** Target a single device directly. */
  deviceId?: string;
  /** Target a group of devices. */
  groupId?: string;
  /** Explicit multi-device target (produced by the decouple_from_group remediation). */
  deviceIds?: string[];
  /** Devices the routine's author expects to be in the group (checked under group faults). */
  requiredDeviceIds?: string[];
  /** Name captured at routine-creation time; renaming the device breaks this reference. */
  targetName?: string;
  level?: number;
  message?: string;
  /** Override: this step needs the cloud (defaults to the device's cloudDependent flag). */
  requiresCloud?: boolean;
  /** Remediation: substitute devices tried in order when a primary target is unavailable. */
  fallbackDeviceIds?: string[];
  skillId?: string;
}

export type TriggerType = 'voice' | 'schedule' | 'sensor' | 'event';

export interface Trigger {
  type: TriggerType;
  label: string;
  /** For sensor triggers: the device whose state starts the routine. */
  sensorDeviceId?: string;
}

export interface Routine {
  id: string;
  name: string;
  trigger: Trigger;
  actions: Action[];
  /** Wall-clock budget for the whole routine (ms); exceeding it is a TIMEOUT failure. */
  budgetMs?: number;
}

export interface HomeModel {
  name: string;
  devices: Device[];
  groups: Group[];
  skills: Skill[];
  routines: Routine[];
}

/* ------------------------------------------------------------------ */
/* Faults                                                              */
/* ------------------------------------------------------------------ */

export type FaultType =
  | 'device_offline'
  | 'device_renamed'
  | 'group_modified'
  | 'skill_disabled'
  | 'cloud_unreachable'
  | 'latency_spike';

export interface FaultInjection {
  type: FaultType;
  /** For device_offline / device_renamed. */
  deviceId?: string;
  /** For group_modified. */
  groupId?: string;
  /** For group_modified: the member that got removed from the group. */
  removedDeviceId?: string;
  /** For device_renamed: the new name (defaults to `<name> (renamed)`). */
  newName?: string;
  /** For skill_disabled. */
  skillId?: string;
  /** For latency_spike: extra delay per action in ms (default 500). */
  delayMs?: number;
}

/* ------------------------------------------------------------------ */
/* Simulation results                                                  */
/* ------------------------------------------------------------------ */

export type FailureCode =
  | 'DEVICE_OFFLINE'
  | 'DEVICE_NOT_FOUND'
  | 'SKILL_DISABLED'
  | 'CLOUD_UNAVAILABLE'
  | 'GROUP_EMPTY'
  | 'REQUIRED_MEMBER_MISSING'
  | 'TIMEOUT'
  | 'TRIGGER_DEVICE_OFFLINE';

export type StepStatus = 'pass' | 'fail';

export interface StepResult {
  kind: 'trigger' | 'action';
  actionId?: string;
  label: string;
  status: StepStatus;
  code?: FailureCode;
  message?: string;
  /** Human-readable root-cause chain, outermost cause first. */
  chain: string[];
}

export type RoutineStatus = 'pass' | 'fail';

export interface RoutineResult {
  routineId: string;
  routineName: string;
  status: RoutineStatus;
  steps: StepResult[];
  durationMs: number;
}

export interface SimulationReport {
  scenario: string;
  faults: FaultInjection[];
  results: RoutineResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    failedRoutines: string[];
  };
}

/* ------------------------------------------------------------------ */
/* Fixes                                                               */
/* ------------------------------------------------------------------ */

export type RemediationType =
  | 'add_fallback'
  | 'relink_target'
  | 'remove_skill_dependency'
  | 'use_local_control'
  | 'decouple_from_group'
  | 'increase_budget';

export interface Fix {
  routineId: string;
  actionId?: string;
  remediation: RemediationType;
  description: string;
  /** For decouple_from_group: devices to target explicitly after decoupling. */
  explicitDeviceIds?: string[];
  /** For add_fallback: the device that keeps breaking, and its ordered substitutes. */
  brokenDeviceId?: string;
  fallbackDeviceIds?: string[];
}

export interface FixResult {
  applied: Fix[];
  skipped: { routineId: string; reason: string }[];
}
