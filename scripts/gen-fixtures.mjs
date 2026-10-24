/**
 * Writes fixtures/sample-home.json from the core seed model.
 * Requires the core package to be built first (npm run build -w @chaoshome/core).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildSampleHome } from '@chaoshome/core';

const home = buildSampleHome();
mkdirSync('fixtures', { recursive: true });
writeFileSync('fixtures/sample-home.json', JSON.stringify(home, null, 2) + '\n');
console.log(
  `fixtures/sample-home.json written: ${home.devices.length} devices, ${home.groups.length} groups, ${home.skills.length} skills, ${home.routines.length} routines`
);
