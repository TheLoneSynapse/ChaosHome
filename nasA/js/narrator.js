/* =========================================================================
   narrator.js — the exhibit's storyteller.

   Voice engine (in order of preference):
     1. GEMINI  — the actual Google Gemini TTS voices via Puter.js
                  (bright, clear, no muddy bass). Every synthesis call
                  carries a hard timeout so a slow or unreachable service
                  can never hang the page; results are cached per text.
     2. WEB     — the browser's own speechSynthesis, scored so Moon
                  missions get the clearest female voice and Mars the
                  clearest male one. Sentence-by-sentence pacing.

   Narration is automatic: whenever a different mission becomes the one
   you're looking at, its story starts on its own — no clicking. A manual
   "listen"/"story" button still exists, and an AUTO toggle in the player
   bar turns the automatic behaviour off.
   ========================================================================= */

const Narrator = (() => {
  const synth = window.speechSynthesis;
  const webSupported = !!synth;

  /* ===================================================== engine: GEMINI */
  const GEMINI = {
    model: "gemini-2.5-flash-preview-tts",
    voice: { moon: "Zephyr", mars: "Iapetus" },   /* bright female / clear male */
    style:
      "Speak like a warm museum audio-guide narrator: natural conversational " +
      "pace, clear and bright tone, no dramatic pauses, no exaggerated " +
      "emphasis. Never sound like a newsreader."
  };

  let puterState = "unknown";   /* unknown → ready | dead (session-wide) */
  const audioCache = new Map(); /* key → Promise<string url> */

  const withTimeout = (p, ms) =>
    Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error("tts-timeout")), ms))
    ]);

  const loadPuter = () =>
    new Promise((resolve, reject) => {
      if (window.puter?.ai?.txt2speech) return resolve();
      const s = document.createElement("script");
      s.src = "https://js.puter.com/v2/";
      s.onload = () =>
        window.puter?.ai?.txt2speech ? resolve() : reject(new Error("puter-api-missing"));
      s.onerror = () => reject(new Error("puter-script-blocked"));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("puter-script-timeout")), 9000);
    });

  /* normalise whatever txt2speech hands back into a replayable URL */
  const toUrl = (res) => {
    if (typeof res === "string" && res) return res;
    if (res instanceof Blob) return URL.createObjectURL(res);
    if (res && typeof res.play === "function") {
      const src = res.currentSrc || res.src;
      if (src) return src;
      /* element without a src we can reuse — not cacheable, treat as fail */
    }
    throw new Error("tts-unusable-result");
  };

  const geminiUrl = (text, kind) => {
    const voice = GEMINI.voice[kind] || GEMINI.voice.mars;
    const key = voice + "|" + text;
    if (audioCache.has(key)) return audioCache.get(key);
    const p = (async () => {
      await withTimeout(loadPuter(), 9500);
      const res = await withTimeout(
        window.puter.ai.txt2speech(text, {
          provider: "gemini",
          model: GEMINI.model,
          voice,
          instructions: GEMINI.style
        }),
        10000
      );
      return toUrl(res);
    })().catch((e) => {
      audioCache.delete(key); /* allow a later retry */
      throw e;
    });
    audioCache.set(key, p);
    return p;
  };

  /* prefetch audio for text so narration starts warm; returns nothing */
  const geminiPrefetch = (text, kind) => {
    if (puterState !== "ready" || !text) return;   /* only warm a proven engine */
    geminiUrl(text, kind).catch(() => {});
  };

  /* ====================================================== engine: WEB */
  const FEMALE_W = ["samantha","victoria","karen","moira","tessa","fiona","zira",
                    "catherine","cathy","hazel","susan","aria","jenny","ava",
                    "serena","allison","joanna","eva","kate","nicky"];
  const MALE_W   = ["daniel","alex","fred","david","guy","mark","oliver","rishi",
                    "thomas","aaron","gordon","james","ryan","george"];
  const NATURAL_W = ["natural","premium","enhanced","neural","siri","online","google"];

  let voices = [], female = null, male = null, fallback = null;

  const wordsOf = (n) => n.toLowerCase().replace(/[()]/g, " ").split(/\s+/);

  const genderOf = (v) => {
    const n = v.name.toLowerCase();
    if (/\bfemale\b/.test(n)) return "female";
    if (/\bmale\b/.test(n)) return "male";
    const w = wordsOf(n);
    if (w.some((x) => FEMALE_W.includes(x))) return "female";
    if (w.some((x) => MALE_W.includes(x))) return "male";
    if (n.includes("google") && n.includes("english")) return "female";
    return null;
  };

  const score = (v) => {
    let s = 0;
    const n = v.name.toLowerCase();
    if (NATURAL_W.some((k) => n.includes(k))) s += 4;
    if (/^en-us/i.test(v.lang)) s += 4;
    else if (/^en-gb/i.test(v.lang)) s += 3;
    else if (/^en/i.test(v.lang)) s += 2;
    if (v.localService) s += 1;
    return s;
  };

  const pickVoices = () => {
    if (!webSupported) return;
    voices = synth.getVoices();
    if (!voices.length) return;
    const en = voices.filter((v) => /^en/i.test(v.lang));
    const pool = en.length ? en : voices;
    const best = (pred) =>
      pool.filter(pred).sort((a, b) => score(b) - score(a))[0] || null;
    female = best((v) => genderOf(v) === "female");
    male = best((v) => genderOf(v) === "male");
    fallback = [...pool].sort((a, b) => score(b) - score(a))[0] || voices[0];
  };
  if (webSupported) {
    pickVoices();
    speechSynthesis.addEventListener?.("voiceschanged", pickVoices);
    setTimeout(pickVoices, 350);
    setTimeout(pickVoices, 1200);
  }

  const voiceFor = (kind) =>
    kind === "moon" ? female || fallback : male || fallback;

  /* ================================================ sentence segmentation */
  const splitSentences = (text) => {
    const parts = text.match(/[^.!?]+(?:[.!?]+["'”’)\]]*(?=\s|$)|$)/g);
    return (parts || [text]).map((s) => s.trim()).filter(Boolean);
  };

  /* ======================================================== engine state */
  let token = 0;                /* bumped on every stop — stale async bail */
  let active = false, activeMission = null;
  let paused = false, internal = false;
  let storyMode = null;         /* missionId while a full story runs */
  let onSentence = null, onDone = null;
  let currentAudio = null;      /* HTMLAudioElement while gemini plays */
  let webWatchdog = null;
  let engine = null;            /* 'gemini' | 'web' — last engine used */

  const bar = () => document.getElementById("narratorBar");
  const showBar = (label) => {
    const b = bar();
    if (!b) return;
    document.getElementById("narrWho").textContent = label;
    document.getElementById("narrPause").textContent = "pause";
    b.classList.remove("paused");
    b.hidden = false;
  };
  const hideBar = () => {
    const b = bar();
    if (b) { b.hidden = true; b.classList.add("paused"); }
  };

  const markButtons = (missionId, on) => {
    document.querySelectorAll("[data-narrate],[data-story]").forEach((btn) => {
      const mine = (btn.dataset.narrate || btn.dataset.story) === missionId;
      btn.classList.toggle("narrating", on && mine);
      if (on && mine) {
        if (!btn.dataset.label) btn.dataset.label = btn.textContent;
        btn.textContent = btn.dataset.story ? "■ stop story" : "■ stop";
      } else if (btn.dataset.label) {
        btn.textContent = btn.dataset.label;
      }
    });
  };

  const clearHighlights = () =>
    document.querySelectorAll(".sent.speaking").forEach((s) =>
      s.classList.remove("speaking"));

  /* ---------------------------------------------------- highlight helper */
  const highlightIn = (el, sentences) => {
    el.innerHTML = "";
    (sentences || []).forEach((s) => {
      const sp = document.createElement("span");
      sp.className = "sent";
      sp.textContent = s + " ";
      el.appendChild(sp);
    });
    const spans = [...el.children];
    const mark = (i) => {
      spans.forEach((s, j) => s.classList.toggle("speaking", j === i));
      const cur = spans[i];
      if (cur) {
        /* never fight an in-flight rail/jump scroll — the page is flying
           to another section and must not be yanked back here */
        if (window.__scrollLock && performance.now() < window.__scrollLock) return;
        const r = cur.getBoundingClientRect();
        if (r.top < 80 || r.bottom > innerHeight - 120)
          cur.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    mark.index = (i) => mark(Math.max(0, Math.min(spans.length - 1, i)));
    mark.count = spans.length;
    mark.lengths = spans.map((s) => s.textContent.length);
    return mark;
  };

  /* progress → sentence index by character proportion (single-audio sync) */
  const estimateIndex = (mark, ratio) => {
    if (!mark.lengths) return 0;
    const total = mark.lengths.reduce((a, b) => a + b, 0) || 1;
    let acc = 0, seen = 0;
    const target = ratio * total;
    for (let i = 0; i < mark.lengths.length; i++) {
      acc += mark.lengths[i];
      if (target < acc) return i;
      seen = i;
    }
    return seen;
  };

  /* ==================================================== playback (both) */
  const stopWebWatchdog = () => {
    if (webWatchdog) { clearInterval(webWatchdog); webWatchdog = null; }
  };

  const finish = (myToken) => {
    if (myToken !== token) return;
    stopWebWatchdog();
    active = false; paused = false;
    const cb = onDone; onDone = null; onSentence = null;
    clearHighlights();
    hideBar();
    if (activeMission) markButtons(activeMission, false);
    activeMission = null;
    storyMode = null;
    if (cb) cb();
  };

  /* ---- gemini path: one audio file per paragraph, synced highlight ---- */
  const playGemini = async (text, kind, mark, myToken, done) => {
    const url = await geminiUrl(text, kind);
    if (myToken !== token) return false;
    const a = new Audio(url);
    currentAudio = a;
    a.onended = () => { currentAudio = null; finish(myToken); if (done) done(); };
    a.onerror = () => { currentAudio = null; finish(myToken); };
    if (mark) {
      a.ontimeupdate = () => {
        if (myToken !== token || !a.duration) return;
        mark.index(estimateIndex(mark, a.currentTime / a.duration));
      };
    }
    try {
      await a.play();
      if (myToken !== token) return false;
      engine = "gemini";
      return true;
    } catch (e) {
      currentAudio = null;
      if (e && e.name === "NotAllowedError") throw e; /* autoplay: caller queues */
      return false; /* fall back to web speech */
    }
  };

  /* ------------------------- web path: sentence-by-sentence synthesis --- */
  const playWeb = (text, kind, mark, myToken, done) => {
    if (!webSupported) return false;
    const queue = splitSentences(text);
    const v = voiceFor(kind);
    const pitch = kind === "moon" ? 1.1 : 0.9;
    engine = "web";
    stopWebWatchdog();
    webWatchdog = setInterval(() => {
      if (synth.speaking && !synth.paused) { synth.pause(); synth.resume(); }
    }, 9000);

    const next = (i) => {
      if (myToken !== token) return;
      if (i >= queue.length) { finish(myToken); if (done) done(); return; }
      const u = new SpeechSynthesisUtterance(queue[i]);
      if (v) { u.voice = v; u.lang = v.lang; }
      u.pitch = pitch;
      u.rate = 1.02;
      u.onstart = () => { if (mark) mark.index(i); };
      u.onend = () => next(i + 1);
      u.onerror = (e) => {
        if (myToken !== token) return;
        if (e.error === "interrupted" || e.error === "canceled") return;
        next(i + 1);
      };
      synth.speak(u);
    };
    next(0);
    return true;
  };

  /* ---- unified start: gemini first, web fallback, autoplay queueing --- */
  let pendingAuto = null; /* missionId waiting for a user gesture */

  const start = async ({ text, kind, label, missionId, highlight, done }) => {
    if (active) stopInternal();
    const myToken = ++token;
    active = true; paused = false;
    activeMission = missionId || null;
    if (missionId) markButtons(missionId, true);
    showBar(label);

    /* Gemini is only attempted once the boot probe has proven it works
       here — an unproven/hanging service must never delay narration. */
    if (puterState === "ready") {
      try {
        const ok = await playGemini(text, kind, highlight, myToken, done);
        if (myToken !== token) return;
        if (ok) return;
      } catch (e) {
        if (myToken !== token) return;
        if (e && e.name === "NotAllowedError") {
          /* browser needs a real user gesture — start when one arrives */
          pendingAuto = missionId || "__narr__";
          active = false;
          if (missionId) markButtons(missionId, false);
          hideBar();
          return;
        }
        /* count hard failures; two strikes and gemini is out for the session */
        geminiFails += 1;
        if (geminiFails >= 2) puterState = "dead";
      }
    }
    if (myToken !== token) return;
    if (!playWeb(text, kind, highlight, myToken, done)) {
      active = false;
      hideBar();
    }
  };

  let geminiFails = 0;

  const stopInternal = () => {
    /* silence without firing done-callback */
    token += 1;
    active = false; paused = false; storyMode = null;
    onDone = null; onSentence = null;
    stopWebWatchdog();
    try { synth.cancel(); } catch (_) {}
    if (currentAudio) { try { currentAudio.pause(); } catch (_) {} currentAudio = null; }
  };

  const stop = () => {
    pendingAuto = null;
    const wasActive = active;
    const cb = onDone;
    const mission = activeMission;
    stopInternal();
    clearHighlights();
    hideBar();
    if (mission) markButtons(mission, false);
    if (wasActive && cb) cb(true); /* true = stopped early */
  };

  const togglePause = () => {
    if (!active) return false;
    if (paused) {
      if (currentAudio) currentAudio.play().catch(() => {});
      else synth.resume();
      paused = false;
      bar()?.classList.remove("paused");
    } else {
      if (currentAudio) currentAudio.pause();
      else synth.pause();
      paused = true;
      bar()?.classList.add("paused");
    }
    document.getElementById("narrPause").textContent = paused ? "resume" : "pause";
    return paused;
  };

  /* ================================================== storytelling entry */
  const phaseText = (m, i) => {
    const ph = m.phases[i];
    return `${ph.title}. ${ph.body}`;
  };

  const tellPhase = (missionId, idx) => {
    const m = MISSIONS.find((x) => x.id === missionId);
    if (!m) return;
    if (active && activeMission === missionId) { stop(); return; }
    const i = idx != null ? idx : (phaseState.get(missionId) || 0);
    const ph = m.phases[i];
    const body = document.querySelector(`#m-${missionId} .phase-body`);
    const text = phaseText(m, i);
    start({
      text, kind: m.target,
      label: `${m.name} — ${ph.label}${autoOn ? " (auto)" : ""}`,
      missionId,
      highlight: body ? highlightIn(body, splitSentences(text)) : null
    });
  };

  const tellStory = (missionId, idx) => {
    const m = MISSIONS.find((x) => x.id === missionId);
    if (!m) return;
    const i = idx || 0;
    if (i === 0) {
      document.getElementById("m-" + missionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const ph = m.phases[i];
    const body = document.querySelector(`#m-${missionId} .phase-body`);
    const text = phaseText(m, i);
    storyMode = missionId;
    start({
      text, kind: m.target,
      label: `${m.name} — ${i + 1}/${m.phases.length} · ${ph.label}`,
      missionId,
      highlight: body ? highlightIn(body, splitSentences(text)) : null,
      done: (stoppedEarly) => {
        if (stoppedEarly) return;
        const next = i + 1;
        if (next < m.phases.length) {
          internal = true; showPhase(m.id, next); internal = false;
          tellStory(m.id, next);
        } else storyMode = null;
      }
    });
  };

  /* ------------------------------------------------------ part read-aloud */
  const tellPart = () => {
    const pop = document.getElementById("partPop");
    if (!pop || pop.hidden) return;
    if (active) { stop(); return; }
    const name = document.getElementById("partPopName").textContent;
    const desc = document.getElementById("partPopDesc").textContent;
    const fate = document.getElementById("partPopFate").textContent;
    const who = document.getElementById("partPopKicker").textContent;
    start({
      text: `${name}. ${desc} End of life. ${fate}`,
      kind: pop.dataset.target === "mars" ? "mars" : "moon",
      label: who
    });
  };

  /* ============================================ AUTO narration on switch */
  let autoOn = localStorage.getItem("narrator-auto") !== "off"; /* default ON */
  let userEngaged = false;   /* a real click/keypress has happened */
  let currentDominant = null;

  const setAutoUI = () => {
    const b = document.getElementById("narrAuto");
    if (!b) return;
    b.textContent = autoOn ? "auto ●" : "auto ○";
    b.classList.toggle("on", autoOn);
  };

  const autoTell = (missionId) => {
    if (!autoOn || !missionId) return;
    if (active && activeMission === missionId) return;  /* already telling */
    if (storyMode === missionId) return;                /* story drives itself */
    const i = phaseState.get(missionId) || 0;
    tellPhase(missionId, i);
  };

  let domTimer = null;
  const onDominant = (missionId) => {
    if (missionId === currentDominant) return;
    currentDominant = missionId;
    if (!autoOn) return;
    /* warm the audio cache while the user reads */
    const m = MISSIONS.find((x) => x.id === missionId);
    if (m) geminiPrefetch(phaseText(m, phaseState.get(missionId) || 0), m.target);
    if (!userEngaged) { pendingAuto = missionId; return; } /* first gesture later */
    /* debounce so fast scrolling doesn't restart narration on every section */
    clearTimeout(domTimer);
    const tellWhenSettled = () => {
      if (!autoOn || currentDominant !== missionId) return;
      /* a rail/jump scroll is still flying — keep re-arming until it
         lands, so narration never starts (and never yanks the page)
         for a section we're just passing through */
      if (window.__scrollLock && performance.now() < window.__scrollLock) {
        domTimer = setTimeout(tellWhenSettled, 150);
        return;
      }
      /* the scroll may have landed somewhere else entirely (a rail dot for
         a non-mission section, or a fast flick past) — only tell if this
         mission still owns the observer's centre band; otherwise drop the
         stale pick so the observer re-chooses on the next crossing */
      const el = document.getElementById("m-" + missionId);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top > innerHeight * 0.55 || r.bottom < innerHeight * 0.4) {
          currentDominant = null;
          return;
        }
      }
      if (active && activeMission !== missionId) {
        stopInternal();
        clearHighlights();
      }
      autoTell(missionId);
    };
    domTimer = setTimeout(tellWhenSettled, 350);
  };

  const observeSections = () => {
    const sections = [...document.querySelectorAll(".mission")];
    if (!sections.length) return;
    /* a section is "dominant" when it covers the middle band of the
       viewport — works no matter how tall the section is */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) onDominant(en.target.id.slice(2));
        });
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
  };

  const engage = () => {
    if (userEngaged) return;
    userEngaged = true;
    if (pendingAuto) {
      const id = pendingAuto;
      pendingAuto = null;
      if (autoOn && currentDominant === id) autoTell(id);
    }
  };

  /* app.js hook: a manual phase click inside a mission */
  const onManualPhase = (missionId) => {
    if (active && activeMission === missionId) stop();
    if (autoOn && userEngaged && !storyMode) autoTell(missionId);
  };

  /* ---------------------------------------------------------------- boot */
  const boot = () => {
    setAutoUI();
    if (!webSupported && !window.puter) {
      document.documentElement.classList.add("no-tts");
      return;
    }
    /* first real gesture unlocks audio + pending auto narration */
    ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
      document.addEventListener(ev, engage, { capture: true, passive: true }));

    document.addEventListener("click", (e) => {
      const listen = e.target.closest("[data-narrate]");
      if (listen) { e.preventDefault(); tellPhase(listen.dataset.narrate); return; }
      const story = e.target.closest("[data-story]");
      if (story) { e.preventDefault(); tellStory(story.dataset.story, 0); return; }
      const auto = e.target.closest("#narrAuto");
      if (auto) {
        autoOn = !autoOn;
        localStorage.setItem("narrator-auto", autoOn ? "on" : "off");
        setAutoUI();
        if (!autoOn) {
          stop();
          clearTimeout(domTimer);
        } else if (currentDominant && userEngaged) {
          autoTell(currentDominant);
        }
      }
    });
    document.getElementById("partPopSpeak")?.addEventListener("click", tellPart);
    document.getElementById("narrPause")?.addEventListener("click", togglePause);
    document.getElementById("narrStop")?.addEventListener("click", () => stop());
    window.addEventListener("beforeunload", () => { try { synth.cancel(); } catch (_) {} });

    /* boot probe: one tiny synthesis tells us whether Gemini actually
       works here. If it hangs or fails, gemini is out for the session and
       every narration starts instantly on the web engine instead.
       Puter requires a free one-time sign-in for its AI voices — if the
       visitor isn't signed in yet, don't probe (it would hang); offer a
       one-click "enable gemini voice" button in the player bar instead. */
    const gemBtn = document.getElementById("narrGemini");
    const offerGemini = () => {
      if (!gemBtn) return;
      gemBtn.hidden = false;
      /* the bar is hidden unless narrating — surface it so the offer is
         actually visible; the label explains what the button does */
      const b = bar();
      if (b && b.hidden) {
        document.getElementById("narrWho").textContent =
          "voice: system · tap ✦ for the clear gemini voice";
        b.hidden = false;
      }
    };
    const probeGemini = () => {
      geminiUrl("Hello.", "moon").then(() => {
        puterState = "ready";
        if (gemBtn) gemBtn.hidden = true;
      }).catch(() => {
        geminiFails = 2;
        puterState = "dead";
        /* signed in but the service hiccuped — keep a retry affordance */
        if (gemBtn && window.puter?.auth?.isSignedIn?.()) {
          gemBtn.hidden = false;
          gemBtn.textContent = "✦ retry gemini voice";
        }
      });
    };
    /* LAZY by design: the Puter SDK is NEVER fetched on page load.
       Auto-injecting an external script at boot is what trips SmartScreen /
       antivirus false positives ("this content may cause damage to your
       device"). The SDK loads only on an explicit click of the button. */
    if (window.puter?.auth) {
      Promise.resolve()
        .then(() => window.puter.auth.isSignedIn())
        .then((yes) => {
          if (yes === false) {
            puterState = "blocked";   /* needs sign-in — never probe */
            offerGemini();
          } else probeGemini();
        })
        .catch(() => probeGemini());
    } else {
      /* not loaded yet — don't touch the network; just offer the button */
      puterState = "blocked";
      offerGemini();
    }

    /* the one click that unlocks the real Gemini voices: sign in (free),
       then re-probe and start narrating the section you're looking at.
       A blocked popup makes signIn() hang forever — race it against a
       timeout so the button always recovers and says what went wrong. */
    gemBtn?.addEventListener("click", async () => {
      try {
        gemBtn.disabled = true;
        gemBtn.textContent = "✦ loading…";
        await withTimeout(loadPuter(), 9500);   /* first external fetch, on click only */
        const signedIn = await Promise.resolve(window.puter.auth.isSignedIn());
        if (signedIn === false) {
          gemBtn.textContent = "✦ signing in…";
          await withTimeout(window.puter.auth.signIn(), 20000);
        }
        gemBtn.textContent = "✦ enabling…";
        puterState = "unknown";
        geminiFails = 0;
        audioCache.clear();
        await new Promise((res) => {
          geminiUrl("Hello.", "moon").then(() => { puterState = "ready"; res(); }).catch(() => { puterState = "dead"; res(); });
        });
        gemBtn.disabled = false;
        gemBtn.hidden = puterState === "ready";
        if (puterState === "ready" && autoOn && currentDominant && userEngaged)
          autoTell(currentDominant);
        else if (puterState !== "ready") {
          gemBtn.textContent = "✦ gemini busy — retry";   /* stale-label fix */
          setTimeout(() => {
            if (gemBtn.textContent.includes("busy"))
              gemBtn.textContent = "✦ enable gemini voice";
          }, 6000);
        }
      } catch (e) {
        gemBtn.disabled = false;
        const blocked = String(e && e.message).includes("timeout");
        gemBtn.textContent = blocked
          ? "✦ allow popups, then retry"
          : "✦ enable gemini voice";
        setTimeout(() => { gemBtn.textContent = "✦ enable gemini voice"; }, 6000);
      }
    });

    observeSections();
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();

  return {
    supported: webSupported || !!window.puter,
    get active() { return active; },
    get internal() { return internal; },
    get engine() { return engine; },
    isNarrating: (missionId) => active && activeMission === missionId,
    onManualPhase,
    stop, togglePause, tellPhase, tellStory
  };
})();
window.Narrator = Narrator;
