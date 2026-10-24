/**
 * Plain-language translations for every jargon term the engine emits.
 * Zero-knowledge rule: if a user can't understand it without knowing the
 * internals, it goes through one of these maps before reaching the screen.
 */

/** Failure codes -> one sentence a non-technical person understands. */
export const FAILURE_PLAIN: Record<string, string> = {
  DEVICE_OFFLINE:
    'A device is offline - it did not answer (like a bulb that lost power), so this step could not run.',
  TRIGGER_DEVICE_OFFLINE:
    'The sensor that starts this routine is offline, so the routine can never even begin.',
  CLOUD_UNAVAILABLE:
    'The internet or the device maker’s cloud service is down, and this step needs it to work.',
  SKILL_DISABLED:
    'An ability (skill) this routine depends on was switched off, so the step had no way to run.',
  GROUP_EMPTY:
    'A group (room / set of devices) is empty - the device was removed from it.',
  REQUIRED_MEMBER_MISSING:
    'One of the devices this routine expects inside a group is missing from that group.',
  DEVICE_NOT_FOUND:
    'A step points at a device that no longer exists - it was probably renamed or removed.',
  TIMEOUT: 'The device took too long to answer, so the routine gave up waiting.',
};

/** Short failure-code wording for chips and lists. */
export const CODE_SHORT: Record<string, string> = {
  DEVICE_OFFLINE: 'device offline',
  TRIGGER_DEVICE_OFFLINE: 'starter sensor offline',
  CLOUD_UNAVAILABLE: 'cloud outage',
  SKILL_DISABLED: 'skill switched off',
  GROUP_EMPTY: 'group is empty',
  REQUIRED_MEMBER_MISSING: 'group member missing',
  DEVICE_NOT_FOUND: 'device not found',
  TIMEOUT: 'too slow (timed out)',
};

/** Simulated problems (fault types) -> plain wording. */
export const FAULT_PLAIN: Record<string, string> = {
  device_offline: 'A device goes offline (as if it lost power or Wi-Fi).',
  device_renamed: 'A device gets a new name, and routines still using the old name get lost.',
  group_modified: 'A device is removed from a group, so group actions miss it.',
  skill_disabled: 'An ability (skill) the routine needs gets switched off.',
  cloud_unreachable: 'The internet / cloud service goes down.',
  latency_spike: 'The network becomes very slow.',
};

/** Repairs the fixer applies -> plain wording (raw id kept in the tooltip). */
export const REMEDIATION_PLAIN: Record<string, string> = {
  add_fallback: 'Added a backup device if the first one fails',
  relink_target: 'Re-pointed the step to the device itself instead of its name',
  remove_skill_dependency: 'Removed the need for the switch-off-able skill',
  use_local_control: 'Switched to local control so no cloud is needed',
  decouple_from_group: 'Stopped relying on the broken group',
  increase_budget: 'Gave the step more time before giving up',
};

/** Assistant tool chips -> what the user sees before tapping. */
export const TOOL_CHIP: Record<string, string> = {
  list_home: '⌂ listed your home',
  get_routines: '≡ read your routines',
  run_chaos_sim: '⚡ ran a safety test',
  get_report: '📋 read test results',
  home_health: '🛡 checked home health',
  explain_failure: '🔍 explained a failure',
  apply_fix: '🔧 applied fixes',
  verify_fix: '✅ verified the fixes',
};

/** Tool names -> plain description shown when a chip is tapped. */
export const TOOL_PLAIN: Record<string, string> = {
  list_home: 'Listed every device, group and routine in your home.',
  get_routines: 'Read the full steps of your routines to inspect their dependencies.',
  run_chaos_sim: 'Ran a “what if” safety test - switched things off or slowed them down to see what breaks.',
  get_report: 'Fetched the results of the last test (what passed, what failed and why).',
  home_health: 'Checked how resilient your home is overall (a health score out of 100%).',
  explain_failure: 'Dug into one broken routine and worked out the exact reason it failed.',
  apply_fix: 'Applied automatic repairs and re-ran the test to prove the fixes hold.',
  verify_fix: 'Re-ran the tests after repairs to confirm everything stays green.',
};

/** Health cards -> explanation shown when the card is tapped. */
export const CARD_HELP: Record<string, string> = {
  score: 'How well your home survives things going wrong. 100% = nothing in the tests can break it.',
  runs: 'Out of every test we ran, this many passed. The higher the better.',
  broken: 'How many routines are broken right now, at this moment.',
  situations: 'How many different “what if” situations we tested (devices offline, outages, slow network...).',
};
