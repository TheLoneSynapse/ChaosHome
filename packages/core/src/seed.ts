import type { HomeModel } from './types.js';

/**
 * A realistic 4-room sample home with 12 routines, several of which are
 * deliberately fragile (hard single-device dependencies, group-bound steps,
 * skill-gated steps, tight time budgets, name-pinned references).
 *
 * Baseline (no faults): every routine passes.
 * That is the point - everything *looks* fine until you inject faults.
 */
export function buildSampleHome(): HomeModel {
  return {
    name: 'Sample Home',
    devices: [
      { id: 'd-living-lamp', name: 'Living Room Lamp', room: 'Living Room', capability: 'light', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-living-tv', name: 'Living Room TV', room: 'Living Room', capability: 'display', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-living-speaker', name: 'Living Room Speaker', room: 'Living Room', capability: 'speaker', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-bedroom-lamp', name: 'Bedroom Lamp', room: 'Bedroom', capability: 'light', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-bedroom-blinds', name: 'Bedroom Blinds', room: 'Bedroom', capability: 'blind', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-living-blinds', name: 'Living Room Blinds', room: 'Living Room', capability: 'blind', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-bedroom-tv', name: 'Bedroom TV', room: 'Bedroom', capability: 'display', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-bedroom-speaker', name: 'Bedroom Speaker', room: 'Bedroom', capability: 'speaker', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-kitchen-plug', name: 'Coffee Maker', room: 'Kitchen', capability: 'plug', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-kitchen-kettle', name: 'Electric Kettle', room: 'Kitchen', capability: 'plug', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-kitchen-light', name: 'Kitchen Light', room: 'Kitchen', capability: 'light', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-thermo', name: 'Thermostat', room: 'Hallway', capability: 'thermostat', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-front-lock', name: 'Front Door Lock', room: 'Entry', capability: 'lock', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-back-lock', name: 'Back Door Lock', room: 'Entry', capability: 'lock', online: true, cloudDependent: true, localControllable: true },
      { id: 'd-motion', name: 'Hallway Motion Sensor', room: 'Hallway', capability: 'sensor', online: true, cloudDependent: false, localControllable: true },
      { id: 'd-door-cam', name: 'Front Door Camera', room: 'Entry', capability: 'camera', online: true, cloudDependent: true, localControllable: false },
    ],
    groups: [
      { id: 'g-living', name: 'Living Room', deviceIds: ['d-living-lamp', 'd-living-tv', 'd-living-speaker'] },
      { id: 'g-bedroom', name: 'Bedroom', deviceIds: ['d-bedroom-lamp', 'd-bedroom-blinds', 'd-bedroom-speaker'] },
      { id: 'g-all-lights', name: 'All Lights', deviceIds: ['d-living-lamp', 'd-bedroom-lamp', 'd-kitchen-light'] },
      { id: 'g-downstairs', name: 'Downstairs', deviceIds: ['d-living-lamp', 'd-living-tv', 'd-kitchen-light', 'd-kitchen-plug'] },
    ],
    skills: [
      { id: 's-weather', name: 'Weather & News', enabled: true },
      { id: 's-music', name: 'Music Unlimited', enabled: true },
      { id: 's-comm', name: 'Announce & Communicate', enabled: true },
    ],
    routines: [
      {
        id: 'r-good-morning',
        name: 'Good Morning',
        trigger: { type: 'schedule', label: 'Every day at 7:00 AM' },
        budgetMs: 1000,
        actions: [
          { id: 'a-gm-1', type: 'turn_on', deviceId: 'd-bedroom-lamp', targetName: 'Bedroom Lamp' },
          { id: 'a-gm-2', type: 'set_temperature', deviceId: 'd-thermo', level: 21 },
          { id: 'a-gm-3', type: 'turn_on', deviceId: 'd-kitchen-plug' },
          { id: 'a-gm-4', type: 'say', deviceId: 'd-bedroom-speaker', message: 'Good morning! It is 7 AM.' },
        ],
      },
      {
        id: 'r-movie-night',
        name: 'Movie Night',
        trigger: { type: 'voice', label: '"Alexa, it is movie time"' },
        actions: [
          { id: 'a-mn-1', type: 'turn_off', groupId: 'g-living', requiredDeviceIds: ['d-living-lamp', 'd-living-tv', 'd-living-speaker'] },
          { id: 'a-mn-2', type: 'turn_on', deviceId: 'd-living-tv' },
          { id: 'a-mn-3', type: 'say', deviceId: 'd-living-speaker', message: 'Movie mode on.', skillId: 's-music' },
        ],
      },
      {
        id: 'r-away',
        name: 'I Am Away',
        trigger: { type: 'voice', label: '"Alexa, I am leaving"' },
        actions: [
          { id: 'a-away-1', type: 'lock', deviceId: 'd-front-lock' },
          { id: 'a-away-2', type: 'turn_off', groupId: 'g-all-lights', requiredDeviceIds: ['d-living-lamp', 'd-bedroom-lamp', 'd-kitchen-light'] },
          { id: 'a-away-3', type: 'notify', message: 'Away mode activated.' },
        ],
      },
      {
        id: 'r-good-night',
        name: 'Good Night',
        trigger: { type: 'schedule', label: 'Every day at 11:00 PM' },
        budgetMs: 600,
        actions: [
          { id: 'a-gn-1', type: 'turn_off', groupId: 'g-all-lights', requiredDeviceIds: ['d-living-lamp', 'd-bedroom-lamp', 'd-kitchen-light'] },
          { id: 'a-gn-2', type: 'turn_off', deviceId: 'd-bedroom-blinds' },
          { id: 'a-gn-3', type: 'lock', deviceId: 'd-front-lock' },
          { id: 'a-gn-4', type: 'set_temperature', deviceId: 'd-thermo', level: 17 },
        ],
      },
      {
        id: 'r-coffee',
        name: 'Start My Coffee',
        trigger: { type: 'voice', label: '"Alexa, start my coffee"' },
        actions: [
          { id: 'a-cof-1', type: 'turn_on', deviceId: 'd-kitchen-plug', targetName: 'Coffee Maker' },
          { id: 'a-cof-2', type: 'notify', message: 'Coffee started.' },
        ],
      },
      {
        id: 'r-motion-path',
        name: 'Hallway Path Lights',
        trigger: { type: 'sensor', label: 'When hallway motion is detected', sensorDeviceId: 'd-motion' },
        actions: [
          { id: 'a-mp-1', type: 'set_level', deviceId: 'd-living-lamp', level: 30 },
          { id: 'a-mp-2', type: 'turn_on', deviceId: 'd-kitchen-light' },
        ],
      },
      {
        id: 'r-weather',
        name: 'Weather Briefing',
        trigger: { type: 'voice', label: '"Alexa, what is the weather"' },
        actions: [
          { id: 'a-wx-1', type: 'say', deviceId: 'd-living-speaker', message: 'Today: 22C and sunny.', skillId: 's-weather' },
        ],
      },
      {
        id: 'r-focus',
        name: 'Focus Time',
        trigger: { type: 'voice', label: '"Alexa, I am focusing"' },
        actions: [
          { id: 'a-fc-1', type: 'turn_off', groupId: 'g-living', requiredDeviceIds: ['d-living-speaker'] },
          { id: 'a-fc-2', type: 'set_temperature', deviceId: 'd-thermo', level: 20 },
          { id: 'a-fc-3', type: 'say', deviceId: 'd-bedroom-speaker', message: 'Focus mode on.' },
        ],
      },
      {
        id: 'r-dinner',
        name: 'Dinner Time',
        trigger: { type: 'schedule', label: 'Every day at 7:00 PM' },
        budgetMs: 700,
        actions: [
          { id: 'a-dn-1', type: 'turn_on', groupId: 'g-downstairs', requiredDeviceIds: ['d-living-lamp', 'd-kitchen-light', 'd-kitchen-plug'] },
          { id: 'a-dn-2', type: 'set_level', deviceId: 'd-kitchen-light', level: 80 },
        ],
      },
      {
        id: 'r-goodbye',
        name: 'Goodbye Routine',
        trigger: { type: 'voice', label: '"Alexa, I am off"' },
        actions: [
          { id: 'a-gb-1', type: 'turn_off', groupId: 'g-all-lights', requiredDeviceIds: ['d-living-lamp', 'd-bedroom-lamp', 'd-kitchen-light'] },
          { id: 'a-gb-2', type: 'lock', deviceId: 'd-front-lock' },
          { id: 'a-gb-3', type: 'say', deviceId: 'd-living-speaker', message: 'Goodbye!', skillId: 's-comm' },
        ],
      },
      {
        id: 'r-guest',
        name: 'Guest Arrival',
        trigger: { type: 'event', label: 'Front doorbell pressed' },
        actions: [
          { id: 'a-gs-1', type: 'unlock', deviceId: 'd-front-lock' },
          { id: 'a-gs-2', type: 'turn_on', deviceId: 'd-living-lamp' },
          { id: 'a-gs-3', type: 'say', deviceId: 'd-living-speaker', message: 'Guest at the door.', skillId: 's-comm' },
        ],
      },
      {
        id: 'r-sleep',
        name: 'Sleep Mode',
        trigger: { type: 'voice', label: '"Alexa, good night"' },
        actions: [
          { id: 'a-sl-1', type: 'turn_off', groupId: 'g-bedroom', requiredDeviceIds: ['d-bedroom-lamp', 'd-bedroom-blinds', 'd-bedroom-speaker'] },
          { id: 'a-sl-2', type: 'set_temperature', deviceId: 'd-thermo', level: 16 },
        ],
      },
    ],
  };
}
