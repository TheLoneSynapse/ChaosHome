/* =========================================================================
   game.js — "S.O.S. — YOU ARE THE DEBRIS NOW"

   A standalone survival mini-game woven into the exhibit: you are stranded
   at one of the 16 real landing sites with nobody coming. The only hope is
   the hardware humanity abandoned around you. Assemble a comms chain from
   the mission's actual machinery manifest:

       POWER  →  TRANSMITTER  →  ANTENNA  →  transmit → Earth answers

   Every manifest part is classified (see ROLES). Correct parts weld into
   the armed socket; wrong parts cost life-support cells. Six cells, three
   sockets — read the descriptions, they tell you what each piece does.

   Self-contained: reads MISSIONS / EXTRA_PARTS / allPartsFor() from the
   data files, never touches exhibit state. Exposes window.__sos for tests.
   ========================================================================= */

const Sos = (() => {
  /* --------------------------------------------------- puzzle definitions
     Audited: every one of the 16 sites has ≥1 valid part per socket AND
     ≥1 distractor, so no site is unsolvable or trivial.               */
  const ROLES = {
    power: ["svPanel", "deck", "alsep", "rover", "abRover", "edRover", "lmDescent",
            "lmAscent", "aquarius", "orbiter", "mco", "cruise", "abCruise", "edCruise"],
    transmit: ["svBody", "svDish", "lmAscent", "lmHatch", "cm", "sm", "payload", "iu",
               "edCrane", "abPetals", "rover", "abRover", "edRover", "abCruise", "edCruise"],
    antenna: ["svDish", "lmAscent", "cm", "sm", "orbiter", "mco", "lrrr",
              "cruise", "abCruise", "edCruise"]
  };
  const SOCKETS = [
    { key: "power",    label: "POWER BUS",    blurb: "needs a source of electricity" },
    { key: "transmit", label: "TRANSMITTER",  blurb: "needs something that can modulate a signal" },
    { key: "antenna",  label: "ANTENNA",      blurb: "needs something that can throw the signal at Earth" }
  ];
  const CELLS = 6;

  const SNARK = {
    power:    "won't generate a single volt.",
    transmit: "can't modulate a thing.",
    antenna:  "throws nothing at the sky."
  };
  const RANKS = {
    6: "COMMANDER", 5: "ENGINEER", 4: "ENGINEER",
    3: "SURVIVOR", 2: "SURVIVOR", 1: "SCRAPPER"
  };

  /* ------------------------------------------------------------- state */
  let st = {
    phase: "select",      // select | brief | play | tx | win | lose
    mi: -1,               // index into sortedMissions
    inv: [],              // [{ p, name, desc, fate, tag, used }]
    cells: CELLS,
    armed: -1,            // armed socket index, -1 = none
    locked: [null, null, null],
    best: 0,
    logSecs: 0,
    txToken: 0
  };
  let reduce = false;

  /* ------------------------------------------------------------- helpers */
  const $ = (s, r = document) => r.querySelector(s);
  const mission = () => sortedMissions[st.mi];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rolesOf = (id) =>
    Object.keys(ROLES).filter((k) => ROLES[k].includes(id));

  function stamp() {
    st.logSecs += 15 + Math.floor(Math.random() * 61);
    const m = String(Math.floor(st.logSecs / 60)).padStart(2, "0");
    const s = String(st.logSecs % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function log(text, cls) {
    const el = $("#gameLog");
    if (!el) return;
    const line = document.createElement("div");
    line.className = "gl-line" + (cls ? " " + cls : "");
    line.innerHTML = `<span class="gl-stamp">[${stamp()}]</span> ${esc(text)}`;
    el.appendChild(line);
    while (el.children.length > 60) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }

  function renderPips() {
    const el = $("#ghO2");
    if (!el) return;
    if (st.mi < 0) { el.textContent = "standby"; el.className = "gh-o2"; return; }
    el.innerHTML = Array.from({ length: CELLS }, (_, i) =>
      `<i class="${i < st.cells ? "" : "spent"}"></i>`).join("");
    el.className = "gh-o2";
  }

  const bestKey = (id) => "sos-best-" + id;
  const readBest = (id) => {
    try { return +localStorage.getItem(bestKey(id)) || 0; } catch (_) { return 0; }
  };
  const writeBest = (id, v) => {
    try { localStorage.setItem(bestKey(id), String(v)); } catch (_) {}
  };

  /* -------------------------------------------------------------- screens */
  function renderSelect() {
    const cards = sortedMissions.map((m, i) => {
      const best = readBest(m.id);
      return `
      <button class="site-card target-${m.target}" data-act="site" data-i="${i}">
        <span class="sc-year">${m.year}</span>
        <span class="sc-name">${esc(m.name)}</span>
        <span class="sc-region">${esc(m.coords.region)}</span>
        <span class="sc-foot">
          <i class="chip mini ${m.target}">${m.target.toUpperCase()}</i>
          ${best ? `<em>best: ${best}/${CELLS}</em>` : ""}
        </span>
      </button>`;
    }).join("");
    $("#gameStage").innerHTML = `
      <div class="gs-head">
        <h3>SELECT YOUR TRAP</h3>
        <p>Sixteen real landing sites. Pick where you got stuck.</p>
      </div>
      <div class="site-grid">${cards}</div>`;
  }

  function renderBrief() {
    const m = mission();
    $("#gameStage").innerHTML = `
      <div class="gs-head">
        <h3>${esc(m.name)} — ${esc(m.coords.region)}</h3>
        <p>The lander ${esc(m.status.toLowerCase())}. You are walking around it in
        ${m.target === "moon" ? "a suit with hours of oxygen" : "a suit with hours of oxygen"}
        — and that is all you get.</p>
      </div>
      <div class="brief-row">
        <div class="brief-stat"><span>YOUR POSITION</span><b>${fmtLat(m.coords.lat)} · ${fmtLon(m.coords.lon)}</b></div>
        <div class="brief-stat"><span>SCRAP WITHIN REACH</span><b>${m.manifest.length} pieces</b></div>
        <div class="brief-stat"><span>LIFE SUPPORT</span><b>${CELLS} cells · one per mistake</b></div>
        <div class="brief-stat"><span>OBJECTIVE</span><b>contact Earth</b></div>
      </div>
      <div class="chain-legend">
        ${SOCKETS.map((s, i) => `
          <div class="cl-step"><i>${i + 1}</i><b>${s.label}</b><span>${s.blurb}</span></div>
        `).join('<div class="cl-arrow" aria-hidden="true">→</div>')}
      </div>
      <div class="gs-actions">
        <button class="g-btn primary" data-act="begin">▶ BEGIN SCAVENGE</button>
        <button class="g-btn" data-act="back">← other sites</button>
      </div>`;
  }

  function renderPlay() {
    const m = mission();
    const chain = SOCKETS.map((s, i) => {
      const lk = st.locked[i];
      const armed = st.armed === i;
      const done = lk != null;
      return `
      <button class="socket ${done ? "locked" : ""} ${armed ? "armed" : ""}"
              data-act="arm" data-i="${i}" ${done ? "disabled" : ""}>
        <span class="so-label">${done ? "✓ " : ""}${s.label}</span>
        <span class="so-blurb">${done ? esc(st.inv[lk].name) : s.blurb}</span>
      </button>`;
    }).join("");

    const inv = st.inv.map((it, i) => `
      <button class="inv-item ${it.used ? "used" : ""}" data-act="fit" data-i="${i}"
              ${it.used ? "disabled" : ""}>
        <i class="tag-${it.tag}"></i>
        <b>${esc(it.name)}</b>
        <span>${esc(it.desc)}</span>
      </button>`).join("");

    $("#gameStage").innerHTML = `
      <div class="chain">${chain}</div>
      <div class="inv-head">
        <span>SCAVENGE PILE — ${m.name.toUpperCase()}</span>
        <span class="inv-hint">arm a socket above, then fit a piece</span>
      </div>
      <div class="inv-grid">${inv}</div>
      <div class="gs-actions">
        ${st.locked.every((l) => l != null)
          ? `<button class="g-btn primary pulse" data-act="tx">◉ TRANSMIT TO EARTH</button>`
          : `<span class="inv-hint">${st.locked.filter((l) => l != null).length}/3 sockets wired</span>`}
        <button class="g-btn" data-act="abandon">abandon site</button>
      </div>`;
    renderPips();
  }

  async function typeLines(lines, token, speed = 9) {
    for (const text of lines) {
      if (token !== st.txToken) return false;
      const el = document.createElement("div");
      el.className = "gl-line tx";
      $("#gameLog").appendChild(el);
      const body = document.createElement("span");
      el.appendChild(document.createTextNode(""));
      el.appendChild(body);
      if (reduce) {
        body.textContent = text;
      } else {
        for (let i = 0; i < text.length; i++) {
          if (token !== st.txToken) return false;
          body.textContent = text.slice(0, i + 1);
          $("#gameLog").scrollTop = $("#gameLog").scrollHeight;
          await new Promise((r) => setTimeout(r, speed));
        }
      }
      await new Promise((r) => setTimeout(r, reduce ? 30 : 240));
    }
    return token === st.txToken;
  }

  async function transmit() {
    const m = mission();
    st.phase = "tx";
    st.txToken++;
    const token = st.txToken;
    $("#gameStage").innerHTML = `
      <div class="tx-screen">
        <div class="tx-dish" aria-hidden="true"><i></i></div>
        <div class="tx-title">TRANSMITTING<span class="caret">…</span></div>
        <button class="g-btn" data-act="skip">skip ▸</button>
      </div>`;
    log("chain complete — firing transmitter.", "ok");

    const rank = RANKS[st.cells] || "SCRAPPER";
    const moon = m.target === "moon";
    const ok = await typeLines([
      "> power bus stable — " + (moon ? "28.1 V off the RTG" : "28.1 V off the arrays"),
      "> transmitter warm — carrier on 8.412 GHz",
      "> antenna aimed — " + (moon ? "straight up, no atmosphere in the way" : "through the dust, up out of the crater rim"),
      "> signal out. awaiting reply…"
    ], token, 8);
    if (!ok) return;

    await new Promise((r) => setTimeout(r, reduce ? 100 : 900));
    if (token !== st.txToken) return;
    const got = await typeLines(moon ? [
      "> [EARTH] copy copy — acquired by the Deep Space Network.",
      "> [EARTH] " + rank + " at " + m.coords.region + ". Your beacon is logged.",
      "> [EARTH] Nobody is coming — but nobody has forgotten you. Stand fast.",
      "> reply round-trip: 2.6 s"
    ] : [
      "> [EARTH] copy via MRO relay — signal locked.",
      "> [EARTH] " + rank + " at " + m.coords.region + ". Coordinates confirmed.",
      "> [EARTH] Rescue is the next window: about 26 months. Start digging.",
      "> reply round-trip: 11 min"
    ], token, 8);
    if (!got) return;

    st.cells > 0 && writeBest(m.id, Math.max(readBest(m.id), st.cells));
    st.phase = "win";
    renderEnd(true, rank);
  }

  function renderEnd(win, rank) {
    const m = mission();
    const best = readBest(m.id);
    $("#gameStage").innerHTML = win ? `
      <div class="endcard win">
        <div class="ec-glyph" aria-hidden="true">◈</div>
        <h3>CONTACT ESTABLISHED</h3>
        <p>${esc(m.coords.region)} · ${fmtLat(m.coords.lat)} · ${fmtLon(m.coords.lon)}<br/>
        The whole world just heard you refuse to die.</p>
        <div class="ec-stats">
          <div><span>RANK</span><b>${rank}</b></div>
          <div><span>CELLS LEFT</span><b>${st.cells}/${CELLS}</b></div>
          <div><span>BEST AT SITE</span><b>${best}/${CELLS}</b></div>
        </div>
        <div class="gs-actions">
          <button class="g-btn primary" data-act="again">↻ run it again</button>
          <button class="g-btn" data-act="back">← another site</button>
        </div>
      </div>` : `
      <div class="endcard lose">
        <div class="ec-glyph" aria-hidden="true">✕</div>
        <h3>SIGNAL LOST</h3>
        <p>Life support exhausted at ${esc(m.coords.region)}. They will catalog the
        wreckage someday — and wonder why the transmitter never spoke.</p>
        <div class="gs-actions">
          <button class="g-btn primary" data-act="again">↻ try again</button>
          <button class="g-btn" data-act="back">← another site</button>
        </div>
      </div>`;
    renderPips();
  }

  /* ------------------------------------------------------------ game flow */
  function startSite(i) {
    st.mi = i;
    const m = mission();
    const chips = m.manifest || [];
    const parts = typeof allPartsFor === "function" ? allPartsFor(m) : [];
    st.inv = chips.map((c) => {
      const p = parts.find((x) => x.id === c.p) || {};
      return {
        p: c.p,
        name: c.n,
        desc: (p.desc || "Abandoned hardware. Nobody is coming for it."),
        fate: p.fate || "",
        tag: c.t || "surface",
        used: false
      };
    });
    /* shuffle so reruns aren't muscle memory */
    for (let i2 = st.inv.length - 1; i2 > 0; i2--) {
      const j = Math.floor(Math.random() * (i2 + 1));
      [st.inv[i2], st.inv[j]] = [st.inv[j], st.inv[i2]];
    }
    st.cells = CELLS; st.armed = 0; st.locked = [null, null, null];
    st.logSecs = 0; st.best = readBest(m.id);
    st.phase = "brief";
    $("#gameLog").innerHTML = "";
    log("field terminal online — " + m.name + ", " + m.coords.region + ".");
    log("objective: build POWER → TRANSMITTER → ANTENNA from the scrap, then transmit.");
    renderBrief();
    renderPips();
  }

  function arm(i) {
    if (st.locked[i] != null) return;
    st.armed = i;
    log("socket armed: " + SOCKETS[i].label + " — " + SOCKETS[i].blurb + ".");
    renderPlay();
  }

  /* Would locking part `i` into socket `s` leave the OTHER empty sockets
     unfillable? Exact check: simulate the weld, then backtrack-match every
     remaining empty socket to a distinct unused part. If no complete
     matching exists, the move would soft-lock the site — refuse it. */
  function wouldStrand(i, s) {
    const used = st.inv.map((it, k) => it.used || k === i);
    const empties = SOCKETS.map((_, j) => j).filter(
      (j) => st.locked[j] == null && j !== s);
    const match = (k) => {
      if (k >= empties.length) return true;
      const key = SOCKETS[empties[k]].key;
      for (let p = 0; p < st.inv.length; p++) {
        if (used[p] || !rolesOf(st.inv[p].p).includes(key)) continue;
        used[p] = true;
        if (match(k + 1)) return true;
        used[p] = false;
      }
      return false;
    };
    return !match(0);
  }

  function fit(i) {
    if (st.phase !== "play") return;
    const it = st.inv[i];
    if (!it || it.used) return;
    if (st.armed < 0) { log("arm a socket first — which slot is this going into?"); return; }
    const s = SOCKETS[st.armed];
    if (rolesOf(it.p).includes(s.key)) {
      if (wouldStrand(i, st.armed)) {
        log("✗ terminal refuses the weld — " + it.name + " in the " + s.label +
            " would leave another socket with nothing compatible. Reroute.", "bad");
        const c0 = $('.inv-item[data-i="' + i + '"]');
        if (c0) { c0.classList.remove("shake"); void c0.offsetWidth; c0.classList.add("shake"); }
        return;
      }
      it.used = true;
      st.locked[st.armed] = i;
      log("WELDED INTO " + s.label + ": " + it.name + ".", "ok");
      st.armed = st.locked.findIndex((l) => l == null);
      if (st.locked.every((l) => l != null)) log("chain complete — TRANSMIT is live.", "ok");
      renderPlay();
      return;
    }
    /* wrong part — costs a cell */
    st.cells--;
    log("✗ " + it.name + " " + SNARK[s.key] +
        (it.fate ? " — and anyway: " + it.fate : ""), "bad");
    renderPips();
    if (st.cells <= 0) {
      st.phase = "lose";
      log("life support exhausted.", "bad");
      renderEnd(false);
      return;
    }
    const sock = $('.socket[data-i="' + st.armed + '"]');
    if (sock) { sock.classList.remove("shake"); void sock.offsetWidth; sock.classList.add("shake"); }
    const card = $('.inv-item[data-i="' + i + '"]');
    if (card) { card.classList.remove("bad"); void card.offsetWidth; card.classList.add("bad"); }
  }

  function click(e) {
    const btn = e.target.closest("[data-act]");
    if (!btn || !$("#gameShell").contains(btn)) return;
    const act = btn.dataset.act;
    if (act === "site") startSite(+btn.dataset.i);
    else if (act === "begin") { st.phase = "play"; renderPlay(); log("scavenge pile exposed — " + st.inv.length + " pieces."); }
    else if (act === "arm") arm(+btn.dataset.i);
    else if (act === "fit") fit(+btn.dataset.i);
    else if (act === "tx") transmit();
    else if (act === "skip") { st.txToken++; /* dump: finish instantly */ transmitSkip(); }
    else if (act === "again") startSite(st.mi);
    else if (act === "back" || act === "abandon") {
      st.txToken++; st.mi = -1; st.phase = "select";
      $("#gameLog").innerHTML = "";
      log("terminal reset — awaiting site selection.");
      renderSelect(); renderPips();
    }
  }

  /* skip: reveal the full exchange at once, jump to the win screen */
  function transmitSkip() {
    const m = mission();
    const rank = RANKS[st.cells] || "SCRAPPER";
    const moon = m.target === "moon";
    const tail = moon
      ? ["> [EARTH] copy copy — acquired by the Deep Space Network.",
         "> [EARTH] " + rank + " at " + m.coords.region + ". Your beacon is logged.",
         "> [EARTH] Nobody is coming — but nobody has forgotten you. Stand fast.",
         "> reply round-trip: 2.6 s"]
      : ["> [EARTH] copy via MRO relay — signal locked.",
         "> [EARTH] " + rank + " at " + m.coords.region + ". Coordinates confirmed.",
         "> [EARTH] Rescue is the next window: about 26 months. Start digging.",
         "> reply round-trip: 11 min"];
    tail.forEach((t) => log(t, "ok"));
    writeBest(m.id, Math.max(readBest(m.id), st.cells));
    st.phase = "win";
    renderEnd(true, rank);
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shell = $("#gameShell");
    if (!shell) return;
    shell.addEventListener("click", click);
    log("field terminal online — awaiting site selection.");
    renderSelect();
    renderPips();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return {
    get state() { return st; },
    startSite, arm, fit,
    cells: CELLS, sockets: SOCKETS,
    rolesOf
  };
})();
window.Sos = Sos;
