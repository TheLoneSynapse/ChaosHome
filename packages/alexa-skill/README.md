# ChaosHome Alexa Skill (AWS Lambda + Gemini)

Voice control for ChaosHome, wired the way you asked: **Alexa → AWS Lambda → Gemini**.

- **Alexa Skills Kit** is the entry point (free to develop and host).
- **AWS Lambda** runs the backend (free tier: 1M requests/month).
- **Gemini** is the reasoning brain for open-ended questions (free tier API key).
- The ChaosHome simulation engine runs **inside the Lambda** — the same
  `@chaoshome/core` + `ChaosState` the web dashboard and MCP server use.

So the flow is: you talk to Alexa → Alexa hits your Lambda → Lambda asks Gemini
what to do → Gemini calls chaos tools → Lambda runs the sim locally → Lambda
speaks the result. No server to host, no bill, as long as you stay in the free
tiers.

## What it can do

| Voice command (examples) | Intent | Brain |
| --- | --- | --- |
| "Alexa, open chaos home" | Launch | local |
| "how healthy is my home" | CheckHealthIntent | local |
| "simulate a cloud outage" / "run the chaos suite" | RunChaosIntent | local |
| "why did good night fail" | ExplainFailureIntent | local |
| "fix everything" | FixRoutinesIntent | local |
| "reset home" | ResetHomeIntent | local |
| "ask chaos home why does my good night routine keep breaking" | AskChaosIntent | **Gemini** |
| "help" / "stop" | AMAZON.* | local |

The deterministic intents run with **zero** Gemini dependency (they answer
straight from the local sim). The free-form `AskChaosIntent` is what routes
through Gemini with the chaos tools, so Gemini picks the tool, reads the result,
and narrates it back.

## Build

```bash
# from the repo root
npm install
npm run build                 # builds core + mcp-server (the Lambda bundles them)

cd packages/alexa-skill
npm install
node scripts/build.mjs        # -> dist/lambda.zip  (upload this)
node scripts/test-local.mjs   # smoke test the handler with fake Alexa envelopes
```

`dist/lambda.zip` contains a single `index.js` (esbuild bundle, ~15 KB). The
whole simulation engine is inlined — no `node_modules`, no SDK.

## Deploy to Lambda (free)

1. Get your **free Gemini API key** at https://aistudio.google.com/apikey
   ("Create API key"). No card required.
2. AWS console → **Lambda** → **Create function** → **Author from scratch**.
   - Name: `chaoshome-alexa`
   - Runtime: **Node.js 20.x**
3. Upload `dist/lambda.zip` (Code tab → Upload from → .zip file).
4. Set the handler: **Handler** = `index.handler`.
5. Add the Gemini key: **Configuration → Environment variables → Add**.
   - Key: `GEMINI_API_KEY`, Value: your free key.
   - Optional: `GEMINI_MODEL` (defaults to `gemini-3.1-flash-lite`, the fastest
     flash model that keeps the tool round-trip within Alexa's ~8s voice window).
6. **Save**. (Timeout: the default 3s is tight for a Gemini round-trip — bump it
   to **10s** under Configuration → General configuration.)

You do **not** need to expose the function to the internet: Alexa invokes it via
an Alexa Skills Kit trigger, added next.

## Create the Alexa skill (free)

1. Go to https://developer.amazon.com/alexa/console/ask → **Create Skill**.
   - Name: `ChaosHome`, model: **Custom**, host: **Provision your own**.
2. In the skill, open **Interaction Model → JSON Editor** and paste the contents
   of [`skill/interaction-model.en-US.json`](skill/interaction-model.en-US.json).
   Click **Save & Build**.
3. Endpoint tab → **AWS Lambda ARN** → paste your function's ARN (Lambda
   console → your function → top-right **ARN**). Save.
4. Test tab → toggle the skill to **Development** → speak or type
   "how healthy is my home".

That's it. The skill talks to your Lambda, the Lambda talks to Gemini, and the
simulation runs in-process.

## Local testing (no AWS, no key)

```bash
cd packages/alexa-skill
node scripts/test-local.mjs
```

Drives the real bundled handler with Alexa envelopes and prints the spoken
responses. The deterministic intents work with no configuration; the ask path
prints a graceful "brain not configured" message when `GEMINI_API_KEY` is unset.

## Notes & limits

- **State is per-container.** Faults you inject persist across invocations on a
  warm Lambda container but reset on a cold start. Fine for a demo; if you want
  durability, persist the home model to S3/DynamoDB between turns.
- **Free-tier boundaries.** Alexa dev + Lambda (1M req/mo) + Gemini free API key
  are all free. Gemini's free tier has per-minute and per-day rate limits — a
  heavy voice-testing session can hit them. The deterministic intents never
  touch Gemini, so they're always available.
- **`AMAZON.SearchQuery` slots** let Gemini (or the local router) receive free
  text for the scenario / routine / question slots, so you don't have to
  enumerate every phrasing.
