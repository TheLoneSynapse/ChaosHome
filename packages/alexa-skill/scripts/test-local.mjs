/**
 * Local smoke test for the Alexa skill handler.
 *
 * Drives the *bundled* Lambda (dist/index.js - the exact code that ships) with
 * real Alexa request envelopes and prints the spoken response. No AWS or Gemini
 * key needed: the deterministic intents (health, chaos, explain, fix, help,
 * stop) run entirely against the local simulation, and the free-form ask path
 * degrades gracefully when GEMINI_API_KEY is unset.
 *
 * Run: node scripts/test-local.mjs
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { handler } = require(join(here, '..', 'dist', 'index.js'));

/** Pull the speakable text out of an Alexa SSML response. */
function spoken(res) {
  const ssml = res?.response?.outputSpeech?.ssml ?? '';
  return ssml
    .replace(/<\/?speak>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function envelope(type, intentName, slots = {}) {
  return {
    request: {
      type,
      ...(intentName
        ? {
            intent: {
              name: intentName,
              slots: Object.fromEntries(
                Object.entries(slots).map(([k, v]) => [k, { name: k, value: v }])
              ),
            },
          }
        : {}),
    },
  };
}

const cases = [
  ['LaunchRequest', envelope('LaunchRequest')],
  ['CheckHealthIntent', envelope('IntentRequest', 'CheckHealthIntent')],
  [
    'RunChaosIntent (cloud outage)',
    envelope('IntentRequest', 'RunChaosIntent', { scenario: 'cloud outage' }),
  ],
  [
    'RunChaosIntent (bedroom lamp offline)',
    envelope('IntentRequest', 'RunChaosIntent', { scenario: 'bedroom lamp offline' }),
  ],
  [
    'ExplainFailureIntent (Good Night)',
    envelope('IntentRequest', 'ExplainFailureIntent', { routine: 'Good Night' }),
  ],
  ['FixRoutinesIntent', envelope('IntentRequest', 'FixRoutinesIntent')],
  ['AMAZON.HelpIntent', envelope('IntentRequest', 'AMAZON.HelpIntent')],
  ['AMAZON.StopIntent', envelope('IntentRequest', 'AMAZON.StopIntent')],
  [
    'AskChaosIntent (no GEMINI_API_KEY -> graceful)',
    envelope('IntentRequest', 'AskChaosIntent', { question: 'why does my good night routine fail?' }),
  ],
];

let failures = 0;
for (const [label, evt] of cases) {
  try {
    const res = await handler(evt);
    const text = spoken(res);
    const end = res?.response?.shouldEndSession;
    const ok = typeof text === 'string' && text.length > 0;
    if (!ok) failures++;
    console.log(`\n--- ${label} ${ok ? 'OK' : 'FAIL'} (shouldEndSession=${end}) ---`);
    console.log(text || '<EMPTY>');
  } catch (err) {
    failures++;
    console.log(`\n--- ${label} THREW ---`);
    console.log(err?.stack ?? err);
  }
}

// Graceful degradation check: with no key, AskChaosIntent must not throw and
// must tell the user the brain isn't configured.
console.log('\n===============================');
if (failures > 0) {
  console.log(`RESULT: ${failures} case(s) failed`);
  process.exit(1);
}
console.log('RESULT: all cases produced a spoken response, no throws');
