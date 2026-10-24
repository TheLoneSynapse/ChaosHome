export interface Device {
  id: string;
  name: string;
  room: string;
  capability: string;
  online: boolean;
  cloudDependent: boolean;
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

export interface Action {
  id: string;
  type: string;
  deviceId?: string;
  groupId?: string;
  deviceIds?: string[];
  requiredDeviceIds?: string[];
  targetName?: string;
  fallbackDeviceIds?: string[];
  skillId?: string;
  requiresCloud?: boolean;
}

export interface Routine {
  id: string;
  name: string;
  trigger: { type: string; label: string; sensorDeviceId?: string };
  actions: Action[];
  budgetMs?: number;
}

export interface Home {
  name: string;
  devices: Device[];
  groups: Group[];
  skills: Skill[];
  routines: Routine[];
}

export interface StepResult {
  kind: 'trigger' | 'action';
  actionId?: string;
  label: string;
  status: 'pass' | 'fail';
  code?: string;
  message?: string;
  chain: string[];
}

export interface RoutineResult {
  routineId: string;
  routineName: string;
  status: 'pass' | 'fail';
  steps: StepResult[];
  durationMs: number;
}

export interface SimulationReport {
  scenario: string;
  faults: unknown[];
  results: RoutineResult[];
  summary: { total: number; passed: number; failed: number; failedRoutines: string[] };
}

export interface RoutineHealth {
  routineId: string;
  routineName: string;
  failures: number;
  scenarios: number;
  fragility: number;
  failedCodes: string[];
}

export interface Preset {
  id: string;
  label: string;
  faults: unknown[];
}

export interface Snapshot {
  home: Home;
  presets: Preset[];
  lastScenarioLabel: string;
  lastFaults: unknown[];
  lastReport: SimulationReport;
  suite: {
    health: {
      score: number;
      totalRuns: number;
      passedRuns: number;
      failingRoutines: number;
      totalRoutines: number;
    };
    baseline: { total: number; passed: number; failed: number; failedRoutines: string[] };
    routineHealth: RoutineHealth[];
    topRisks: RoutineHealth[];
    scenarios: { id: string; label: string; faults: unknown[] }[];
    results: {
      scenario: string;
      passed: number;
      failed: number;
      failedRoutines: string[];
    }[];
  };
  history: string[];
  design: {
    saved: boolean;
    savedAt: string | null;
    matches: boolean | null;
  };
  autoFix: {
    dueAt: number | null;
    message: string | null;
  };
}

export interface RepairSummary {
  applied: {
    routineId: string;
    actionId?: string;
    remediation: string;
    description: string;
  }[];
  skipped: { routineId: string; reason: string }[];
  verificationText: string;
  healthBefore: number;
  healthAfter: number;
}

export interface ChatResponse {
  reply: string;
  mode: 'gemini' | 'bedrock' | 'offline';
  toolCalls: { name: string; args: unknown; summary: string }[];
}
