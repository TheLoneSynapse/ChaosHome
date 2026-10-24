# ChaosHome MCP

**Chaos engineering for your smart home — explained super simply!**

---

## 🧸 What is this? (the tiny-kid version)

Imagine you have a bunch of toys in your room. You have a **routine** — that's just a
list of things you do every night: turn on the lamp, close the blinds, say goodnight.

Now imagine someone **renames your lamp** (calls it "Lampy" instead of "Lamp"), or the
lamp **runs out of battery**, or your toy box **loses a piece**. Suddenly your bedtime
routine *breaks* — but nobody tells you! It just quietly stops working at 11 PM.

**ChaosHome is a friendly robot that:**

1. 🏠 **Draws your house** as a picture of toys connected by strings.
2. 💥 **Breaks things on purpose** (on purpose! like a mischievous monkey) to see what
   stops working.
3. 📋 **Tells you exactly why** it broke, in plain words.
4. 🔧 **Fixes it** and then breaks it *again* to make sure the fix really works.

> "Your smart home is code nobody tests. We're Chaos Monkey for Alexa." 🐒

---

## 🚀 How to start it (for the grown-ups)

```bash
npm install
npm run build        # builds all the parts
npm test             # runs the tests (checks the robot works)
npm start            # then visit http://localhost:3001
```

Open **http://localhost:3001** — the toy picture and the robot live on one server.

### The 3-minute demo (try this!)

1. **Everything looks fine** at first — 12/12 routines pass. (That's the trick! It
   always *looks* fine.)
2. Click **"Bedroom Lamp goes offline"** → now 7/12 pass, some turn red, and it tells
   you the story: *"Lamp went offline → can't reach it → root cause: no backup bulb."*
3. Click **"Auto-Fix All"** → it adds backups and the score jumps **78% → 98%**.
4. Ask the robot: *"fix everything"* or *"why did Good Night break?"*

---

## 🏗️ How the pieces fit together (building-block version)

Think of it like a tall tower of LEGO:

```
+---------------------------------------------------------------+
|  dashboard/            The PICTURE you see (toys + colors)     |
|      |  asks the server questions (REST /api/*)                |
+------|---------------------------------------------------------+
|  packages/mcp-server   The RECEPTIONIST (says hello, hands     |
|      |                  out tools, keeps things tidy)          |
|      |  packages/agent  The BRAIN (listens, then acts)          |
|      |  packages/core   The ENGINE (does the actual pretend     |
|      |                   play with the toys)                    |
+---------------------------------------------------------------+
```

- **dashboard** = the drawing on screen you click around in.
- **mcp-server** = the receptionist at the door. It answers the phone (`/api/...`) and
  hands tools to anyone who asks over MCP.
- **agent** = the brain. It *talks* to you and decides which tool to use.
- **core** = the engine under the hood. It actually pretends to break things and
  checks what happens.
- **alexa-skill** = the same brain, but talking through an Echo Dot.

---

## 📖 Every function, explained like you're 5

Below is **every function in the project** and what it does, in plain words. Think of
these as the robot's vocabulary.

---

### 🧩 The Engine — `packages/core/src/engine.ts`
*This is the pretend-play engine. It runs your routines and checks if they work.*

| Function | What it does (kid version) |
|---|---|
| `applyFaults(home, faults)` | Takes a *perfect copy* of your house and **breaks it on purpose** — makes a lamp go offline, changes a name, kicks a toy out of a group. Returns the broken copy so the real house stays safe. |
| `buildFaultContext(faults)` | Makes a little **note card** that says "the internet is down" or "everything is slow right now," so the engine remembers the *world-wide* problems while it plays. |
| `describeFault(fault, home)` | Turns a fault into a **sentence a person understands**, like "the Bedroom Lamp went offline." Not robot code — real words. |
| `resolveTarget(action, home)` | When a routine says "turn on the lamp," this figures out **which toy that means**. If it can't find it (because it got renamed!), it explains what went wrong. |
| `collectTargetIds(action, home)` | Gathers up **all the toy IDs** a step is going to touch — the one toy, plus everything in its group. Like collecting all the crayons a coloring step needs. |
| `matchingFaultDescription(...)` | Checks: *"Did one of the things I'm about to break match a rule we set?"* If yes, it grabs the sentence describing that break. |
| `actionLabel(action, home)` | Makes a **friendly name** for a step, like `turn on "Living Room Lamp"`, so reports read like a story instead of code. |
| `executeAction(action, home, ctx)` | Runs **one single step** and answers: did it work, or did it break? If it broke, it writes down the reason and the chain of "why." |
| `executeRoutine(routine, home, ctx)` | Runs **one whole routine** (all its steps, start to finish). If any step fails, the whole routine is marked as failed — like a chain where one broken link breaks the whole chain. |
| `runSimulation(home, faults, name)` | The big one: **runs every routine** in the house against a set of problems, then hands back a report card saying who passed and who failed. |

---

### 🔧 The Auto-Fixer — `packages/core/src/autofix.ts`
*This is the mechanic. When something breaks, it figures out how to repair it.*

| Function | What it does (kid version) |
|---|---|
| `findDevice(home, id)` | A tiny helper: *"Hey, find me the toy with this name tag."* Returns the toy, or nothing if it's gone. |
| `fallbackCandidates(home, brokenId, ...)` | Your lamp died? This makes a **list of backup lamps** to use instead — same room first (closest friend), then other rooms. Like picking a substitute player. |
| `findSubstitute(home, unavailableId, ...)` | Grabs the **very best backup** from that list — just the first one. One reliable friend. |
| `localControllableFor(home, action)` | Asks: *"Can this toy be played with **without the internet**?"* If yes, we can still use it during a storm. |
| `proposeFixForStep(...)` | Looks at **one broken step** and suggests **one repair** — add a backup bulb, use the toy's ID instead of its name, stop depending on that skill, or use local control. It's the mechanic's diagnosis. |
| `proposeFixes(home, report)` | Goes through the **whole report card** and collects *every* repair idea. Also writes down the ones it **can't** fix so a human knows to help. |
| `applyFixes(home, fixes)` | Actually **makes the repairs** — but on a *copy*, so your original setup is never touched. Like fixing a photocopy, not the real drawing. |
| `autoFix(home, report)` | The one-shot wonder: **find fixes → apply them → run the test again** to prove the repair really works. |
| `formatFixResult(...)` | Turns the list of repairs into a **readable note**: what was fixed, what still needs a grown-up, and the new score. |

**The golden rule:** every fix must survive being broken *the same way again*. If the
robot "fixes" a disabled skill by turning it back on, the test would just disable it
again — so instead it **removes the dependency**. A fix that only works once isn't a fix!

---

### 📊 The Reporter — `packages/core/src/reporter.ts`
*This is the teacher who grades everything and writes the report card.*

| Function | What it does (kid version) |
|---|---|
| `standardSuite(home)` | Builds the **standard list of mischiefs** to try: internet down, slow network, every device going offline one at a time, renames, group edits, skills turned off. Our checklist of trouble. |
| `runSuite(home, scenarios?)` | Runs **every mischief on the list** and adds up the score. Tells you how sturdy your home is overall, and which routines are the most fragile (break the easiest). |
| `formatSimulationReport(report)` | Turns one test run into a **readable report**: PASS or FAIL for each routine, plus the "why" for anything that failed. |
| `formatSuiteReport(suite)` | Turns the *whole* checklist run into a big report: your **health score**, the most fragile routines, and whether the baseline still looks fine. |
| `formatRoutineDetail(result)` | Zooms in on **one routine** and tells its whole story step by step — which steps were ok, which broke, and the chain of reasons. |

---

### 🌱 The Seed — `packages/core/src/seed.ts`

| Function | What it does (kid version) |
|---|---|
| `buildSampleHome()` | Builds a **pretend house** to play with: 16 toys (devices), 4 groups, 3 skills, and 12 routines. Everything starts *perfect* — that's the trap. It all looks fine until you start breaking it. |

---

### 🧠 The Brain — `packages/agent/src/index.ts`
*This is the part that listens to you and decides what to do.*

| Function / Method | What it does (kid version) |
|---|---|
| `extractMcpText(result)` | The tool hands back a package. This **unwraps it** and pulls out the plain words inside, throwing away the wrapping paper. |
| `extractToolText(result)` | Same unwrapping, but for the *other* kind of package the brain uses. |
| `constructor(mcpUrl)` | Sets up the brain and remembers **where the receptionist lives** (the address to talk to). |
| `ensureMcpClient()` | *"Do we have a phone line open to the receptionist yet? If not, open one."* Makes the connection the first time we need it. |
| `ensureConnected()` | Makes sure we've actually **said hello** on that phone line (logged in), not just dialed. |
| `close()` | Politely **hangs up the phone** when we're done, so nothing leaks. |
| `callTool(name, args)` | **Asks the receptionist to run one tool** (like "check the lamps") and hands back the answer in words. |
| `chat(message, uiContext?, opts?)` | The main doorway. You type a message, this decides: *Should I use the online brain or the offline brain?* Tries online first; if the internet is grumpy, quietly falls back to offline so you still get an answer. |
| `strandsChat(message, uiContext?)` | The **online brain**. Shows the AI the list of tools, lets it pick and use them in a loop (up to a few rounds), and returns what it said. |
| `offlineChat(message, uiContext?)` | The **offline brain** — no internet needed. It reads your words, figures out what you mean (fix? explain? run tests?), and calls the right tool itself. It's like a very reliable backup robot. |
| `presetFromMessage(msg)` | Reads your sentence and guesses **which problem you want to simulate** — *"internet down," "slow," "renamed," "lamp"* — and picks the matching fault. |
| `findRoutineId(msg)` | You type *"why did good night break?"* — this figures out **which routine you mean** by matching words to routine names. |
| `firstFailingRoutine()` | If you don't name one, this just **picks the first routine that's currently failing** so the brain has something to explain. |
| `firstLine(text)` | Grabs the **first line** of some text — used to make short, tidy summaries for the little tool "chips" on screen. |

**Two brains, one purpose:**
- **Online (Gemini/Bedrock):** the smart cloud brain — it *decides* which tools to use.
- **Offline:** a rule-based brain that follows simple "if you said X, do Y" patterns.
  Unplug the internet and it still works — that's the demo's "pull the cable" moment. 🐙

---

### ⚙️ The Receptionist — `packages/mcp-server/src/index.ts`
*This is the server: it opens the door, sets the rules, and hands out tools.*

These aren't "functions" you call — they're **routes** (web addresses) and **guards**
(rules at the door). Here's what each does:

| Route / Piece | What it does (kid version) |
|---|---|
| CORS allowlist | Only lets **our own pages** talk to the server. A mean stranger's website can't sneak in. |
| CSRF origin guard | If a request comes from a **strange website**, the door slams: *"403 — not allowed."* |
| Security headers + CSP | Puts up a **fence** so no outside scripts can run and no one can embed us in a hidden frame. |
| Rate limiter (`/api/chat`) | A **turnstile**: only 30 chats per minute per person, so nobody can spam the robot and use up all its quota. |
| `POST /api/chat` | You type to the assistant → this calls the brain and sends back the reply. |
| `GET /api/state` | Hands the dashboard its **current snapshot** (what's broken, what's fixed) every 2 seconds. |
| `POST /api/scenario` | *"Break something!"* — injects the fault you picked and re-runs the tests. |
| `POST /api/repair` | *"Fix it!"* — applies repairs and returns the new score. |
| `POST /api/reset` | *"Start over"* — wipes all the injected problems back to a clean house. |
| `POST /api/design` | **Save** your favorite setup, or **restore** back to it later (like a bookmark). |
| `POST /mcp` | The door MCP clients (other AI tools) use. Each request gets a fresh, clean receptionist. |
| Auto-fix `setInterval` | A tiny **alarm clock** that rings every second. If you ignore a problem for 5 minutes, it fixes it for you and leaves a note. |

---

### 🗄️ The Memory — `packages/mcp-server/src/state.ts`
*This is the robot's notebook — it remembers everything between clicks.*

| Method | What it does (kid version) |
|---|---|
| `constructor()` | Sets up the notebook and fills it with the **sample house** and its first test results. |
| `reset()` | **Erases everything** and starts fresh. (Your saved "design" survives — that's your favorite.) |
| `saveDesigned()` | **Snapshots** your current setup so you can come back to it later. |
| `restoreDesigned()` | Puts everything **back to the snapshot** you saved. |
| `tickAutoFix(now)` | The 5-minute alarm. If time's up and you didn't fix it, it **fixes it for you** and writes a note about what it did. |
| `refresh()` | **Re-runs the tests** with the current setup so the scores are never stale. |
| `runScenario(faults, label?)` | *"Break things this way"* — injects a specific set of problems and runs every routine. |
| `runSuiteScenario()` | Runs the **whole checklist** of problems (the big torture test). |
| `repair(routineId?)` | The mechanic: **finds fixes, applies them, re-tests.** Returns what it did and the before/after score. |
| `explain(routineId)` | *"Why did this break?"* — digs up the full story for one routine. |
| `reportText()` | The last test run, as **readable text**. |
| `suiteText()` | The whole checklist run, as **readable text**. |
| `snapshot()` | Packs up **everything the screen needs** into one bundle and hands it to the dashboard. |

---

### 🤖 The Alexa Voice — `packages/alexa-skill/`
*This is the same brain, but talking through an Echo Dot.*

#### `src/index.ts` — the voice door

| Function | What it does (kid version) |
|---|---|
| `respond(speech, opts?)` | Wraps a sentence into the **shape Alexa expects** and cleans it up so it sounds natural out loud. |
| `slotValue(intent, name)` | Pulls out **one filled-in blank** from what you said — like grabbing the routine name out of *"run **Good Night**."* |
| `handleLaunch()` | You said "Alexa, open ChaosHome" → it **says hello** and reads your health score. |
| `handleHealth()` | *"How's my home?"* → runs the big test and **reads the score out loud**. |
| `handleChaos(scenario)` | *"Break something!"* → injects that problem and reports what broke. |
| `handleExplain(routine)` | *"Why did it fail?"* → tells the story of one routine. |
| `handleFix(routine?)` | *"Fix it!"* → applies repairs and reports the new score. |
| `handleReset()` | *"Start over"* → clears all the problems. |
| `handleHelp()` | Lists the **things you can say**. |
| `handleStop()` | Says goodbye and **ends the session**. |
| `handleAsk(question)` | The free-form one: sends your question to the **Gemini brain** with tools so it can reason and act. If Gemini isn't set up, it still handles the fixed commands. |
| `handler(event)` | **The front door for Alexa.** Checks the request is really from *your* skill (security!), then sends it to the right handler above. |

#### `src/gemini.ts` — the tiny voice brain

| Function | What it does (kid version) |
|---|---|
| `postGemini(url, key, body)` | **Sends a question to Gemini** and waits for the answer. If Gemini is busy (429/5xx), it **waits a moment and tries again** — like retrying a busy phone line. |
| `parseParts(parts)` | Splits Gemini's reply into **"what it said"** and **"what tools it wants to run."** |
| `runGemini(opts)` | The whole voice conversation loop: ask → run tools → feed results back → repeat (a few times max) → return the final spoken answer. Bounded so it can't run forever. |

#### `src/tools.ts` — the voice tools

| Function | What it does (kid version) |
|---|---|
| `createState()` | Makes a **fresh notebook** for this Echo session. |
| `failingNames(state)` | Lists the **routines that are currently at risk**. |
| `speakSummary(state)` | Turns the health score into **one speakable sentence**. |
| `speakScenario(state, label)` | Says how a single scenario went, out loud. |
| `resolvePreset(q)` | Matches your **spoken words** ("internet down") to a preset fault. |
| `resolveRoutine(state, q)` | Matches your **spoken words** ("good night") to a routine. |
| `speakExplain(state, routineId)` | Turns a failure explanation into **short, speakable sentences** (no code jargon a voice would mangle). |
| `executeChaosTool(state, call)` | **Runs whichever tool Gemini asked for** (health, simulate, explain, fix) and returns a voice-friendly answer. |

#### `src/speech.ts` — the manners teacher (makes words nice to hear)

| Function | What it does (kid version) |
|---|---|
| `flattenBullets(text)` | Turns a **bulleted list** into a normal spoken sentence — robots don't say "dash, dash." |
| `stripMarkdownChrome(text)` | Removes the **decorations** (# headers, **bold**, --- lines) that would sound weird spoken aloud. |
| `toSpeech(raw)` | The big cleaner: takes any messy text and returns **short, natural sentences** a voice can say nicely. Also strips emoji and long code. |
| `toSsml(speech)` | Wraps the clean sentence in the **special tags Alexa needs** and escapes weird characters so nothing breaks. |

#### `src/../scripts/test-local.mjs` — the rehearsal

Fakes Alexa's messages and runs them through the handler to check nothing crashes
before you ship it.

---

### 🎛️ The Dashboard — `dashboard/src/`
*The picture on screen you click around in.*

| File / Piece | What it does (kid version) |
|---|---|
| `App.tsx` | The **main screen**. Draws the tabs (Home, Echo Dot, Report, Health, Assistant), refreshes the snapshot every 2 seconds, and wires all the buttons together. |
| `post(url, body)` | A tiny helper that **sends a message to the server** and throws a clear error if something goes wrong. |
| `Graph.tsx` | Draws your house as **connected toys** (force-directed graph). The colorful bubbles are devices, groups, and routines. |
| `simulate(nodes, edges, ticks)` | The **physics that arranges the bubbles** — pushes them apart, pulls connected ones together, centers the whole thing. Runs a fixed number of steps so it settles instead of jittering forever. |
| `refreshNodeStates(...)` | **Re-colors** the bubbles (green/red/amber) on each refresh *without* re-arranging them — so the picture doesn't reshuffle every 2 seconds. |
| `faultsFor(snapshot, node)` | When you click a toy, this lists **all the ways that toy can break**. |
| `AlexaSandbox.tsx` | The **Echo Dot toy** on screen. Real microphone input, real spoken replies, and it reacts to the live simulation. |
| `startRec()` / `pauseRec()` | **Turns the mic on/off** and keeps it listening (Chrome likes to stop after silence). |
| `onHeard(raw)` | Listens for your words, checks for the wake word ("Alexa"), and turns what you said into a **command**. |
| `handleCommand(raw)` | Figures out what you asked for (health? fix? run a routine?) and **answers from the live simulation**, then speaks it. |
| `deliver(x)` / `respond(...)` | **Speaks a reply out loud** (with chimes) and plays the little animations, then hands the mic back. |
| `chime(kind, muted)` | Plays the **Alexa-style beeps** (activation, success, error) using web audio. |
| `toSpeech`-style helpers | Clean up text so it sounds good **spoken out loud**. |
| `Chat.tsx` | The **chat box**. Sends your message to `/api/chat`, shows the reply, and shows little green "chips" for each tool the brain used (tap one to see what it did). |
| `plain.ts` | A **dictionary of plain-English explanations** for every code, fault, and tool — so the screen never shows raw jargon. |

---

### 🌌 The `nasA` exhibit — `nasA/`
*A separate, self-contained space-history exhibit site (static HTML/JS).*

| Piece | What it does (kid version) |
|---|---|
| `js/app.js` | The main page: draws missions, the vehicle diagrams, the graveyard maps, and handles clicks. |
| `js/data.js` | All the **facts and stories** about missions — just data, no logic. |
| `js/footage.js` | Loads and plays the **video clips** in a grid. |
| `js/game.js` | A tiny **interactive game** on the page. Uses `esc()` to keep any text safe. |
| `js/narrator.js` | The **voice-over** that reads sections aloud and scrolls with you. |
| `tools/gen-icons.mjs` | A build helper that **generates the little icons**. |

---

## 🧰 The MCP tools (what other AI assistants can call)

These are the "toys" we hand to any MCP-compatible assistant:

| Tool | Kid version |
|---|---|
| `list_home` | *"Show me all my toys."* |
| `get_routines` | *"Show me my routines and what they need."* |
| `run_chaos_sim` | *"Break things on purpose and tell me what happened."* |
| `get_report` | *"Show me the last report card."* |
| `home_health` | *"How healthy is my house?"* |
| `explain_failure` | *"Why did this one break?"* |
| `apply_fix` | *"Fix it and check it works."* |
| `verify_fix` | *"Check my homework — did the fixes hold?"* |

Connection details and sample messages: [docs/mcp-integration.md](docs/mcp-integration.md).

---

## 🗂️ Where everything lives

```
packages/core/        the engine, the fixer, the reporter, the sample house (tested)
packages/mcp-server/  the receptionist: MCP door + web routes + serves the picture
packages/agent/       the brain: online cloud brain + offline backup brain
packages/alexa-skill/ the same brain, talking through an Echo Dot
dashboard/            the picture on screen (graph, report, chat, Echo Dot)
nasA/                 a separate space-history exhibit site
fixtures/             sample-home.json (the pretend house in data form)
scripts/              helper scripts (verify the protocol, generate fixtures)
docs/                 integration guides for MCP and AWS
```

---

## ✅ How we know it works

- `npm test` — the tests check that: everything starts green, each kind of break causes
  a failure *with a reason*, fixes survive being broken again, and the two honest gaps
  (thermostat with no backup; dead motion sensor) stay flagged as "needs a human."
- `node scripts/verify-mcp.mjs` — checks the whole conversation protocol works over the
  real wire.

---

## 🕳️ Honest gaps (on purpose!)

Some things **can't** be auto-fixed, and we say so instead of pretending:

- The **thermostat** has no backup device — if it dies, only a human can replace it.
- A **dead motion sensor** means the routine *can't even start* — no trick fixes that.

The fixer reports these as **"needs manual attention."** A robot that lies about being
fixed is worse than one that admits it can't help.

---

## 🔐 Safety rules (the robot's good manners)

- Only **our own pages** can talk to the server (strange websites get blocked).
- **Rate limits** stop anyone from spamming the assistant and using up the free quota.
- **Secrets stay on the server** — they never appear in the picture or the browser.
- Errors shown to you are **friendly and safe** — no leaking of internal details.
- The Alexa skill **checks who's calling** so only your skill can drive it.

---

## 🌍 Environment variables (for the grown-ups)

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | which door the server listens on |
| `GEMINI_API_KEY` | - | the free AI key for the smart brain |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | which brain model to use |
| `GEMINI_THINKING_BUDGET` | `0` | how long the brain "thinks" (0 = fast) |
| `CHAOSHOME_OFFLINE` | - | set `1` to force the offline backup brain |
| `ALEXA_SKILL_ID` | - | locks the Alexa skill to *your* skill only |
| `BEDROCK_MODEL_ID` | `amazon.nova-lite-v1:0` | alternative AWS brain |
| `AWS_REGION` | `us-east-1` | where the AWS brain lives |

---

## 📄 License

MIT — see [LICENSE](LICENSE). Be kind, share, and test your smart home!
