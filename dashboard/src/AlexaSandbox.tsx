import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from './types';
import { CODE_SHORT, FAILURE_PLAIN, FAULT_PLAIN } from './plain';

/**
 * Echo Dot sandbox - a REAL working voice assistant for your home.
 *
 * Real voice INPUT  : Web Speech API (Chrome/Edge) - tap the mic and talk, or
 *                     switch on "always listening" and wake it with "Alexa, ...".
 * Real voice OUTPUT : speechSynthesis speaks every answer out loud, with
 *                     Alexa-style start/stop/success/failure chimes (WebAudio).
 *
 * The answers are still computed from the LIVE simulation state: whatever
 * faults are active right now determine whether a command succeeds and, if it
 * fails, exactly which step died and why - in plain language. Faults can be
 * injected from here, and every failure links into the Report tab and
 * highlights the routine in the graph.
 */

interface Props {
  snapshot: Snapshot;
  busy: boolean;
  onSelectRoutine: (id: string | null) => void;
  onOpenReport: () => void;
  onInjectFault: (presetId: string) => void;
  onRepair: () => void;
  onReset: () => void;
}

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Exchange {
  id: number;
  kind: 'pass' | 'fail' | 'info' | 'warn';
  command: string;
  headline: string;
  details: string[];
  routineId?: string;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');

/** Find the routine the user means, tolerating "turn on good night" etc. */
function findRoutine(snapshot: Snapshot, text: string) {
  const lower = normalize(text);
  let best: { id: string; name: string } | null = null;
  let bestScore = 0;
  for (const r of snapshot.home.routines) {
    const name = r.name.toLowerCase();
    if (lower.includes(name)) return { id: r.id, name: r.name };
    const words = name.split(/\s+/).filter((w) => w.length > 2);
    const score = words.length ? words.filter((w) => lower.includes(w)).length / words.length : 0;
    if (score > bestScore) {
      bestScore = score;
      best = { id: r.id, name: r.name };
    }
  }
  return bestScore >= 0.5 ? best : null;
}

/* ================= real voice plumbing ================= */

/** Speech recognition - Chrome/Edge only; the UI degrades gracefully. */
const SR: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;
const HAS_TTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Short Alexa-style tones via WebAudio: activation, deactivation, ok, error. */
function chime(kind: 'start' | 'stop' | 'ok' | 'err', muted: boolean) {
  if (muted) return;
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    const ctx: AudioContext | null = audioCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const seq: Array<[number, number]> =
      kind === 'start'
        ? [[784, 0], [1175, 0.11]]
        : kind === 'stop'
          ? [[1175, 0], [784, 0.11]]
          : kind === 'ok'
            ? [[659, 0], [988, 0.1]]
            : [[392, 0], [294, 0.13]];
    for (const [freq, t0] of seq) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + t0;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  } catch {
    /* audio unavailable - silent is fine */
  }
}
let audioCtx: AudioContext | null = null;

/** What Alexa would actually say: headline + details minus on-screen hints. */
function spokenText(x: { headline: string; details: string[] }): string {
  const skip = /^(exactly what happened|tap |show me|open the |watch the)/i;
  return [x.headline, ...x.details.filter((d) => !skip.test(d))]
    .join(' ')
    .replace(/[→"“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const WAKE = /\b(alexa|echo|computer)\b/i;

export function AlexaSandbox({ snapshot, busy, onSelectRoutine, onOpenReport, onInjectFault, onRepair, onReset }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [input, setInput] = useState('');
  const [log, setLog] = useState<Exchange[]>([]);
  const [heard, setHeard] = useState(''); // live transcription while listening
  const [pushing, setPushing] = useState(false); // one-shot mic session
  const [voiceOn, setVoiceOn] = useState(false); // hands-free wake-word mode
  const [muted, setMuted] = useState(false); // voice replies on/off
  const [voiceErr, setVoiceErr] = useState<string | null>(null);

  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const seenFaults = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const recRef = useRef<any>(null);
  const wantRec = useRef(false); // keep the mic pipeline alive
  const pushingRef = useRef(false);
  const voiceOnRef = useRef(false);
  const mutedRef = useRef(false);
  const awaitingRef = useRef(false); // heard the wake word, waiting for the ask
  const phaseRef = useRef<Phase>('idle');
  const voices = useRef<SpeechSynthesisVoice[]>([]);
  const cmdRef = useRef<(text: string, fromVoice?: boolean) => void>(() => {});

  const goPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);
  useEffect(() => {
    pushingRef.current = pushing;
  }, [pushing]);

  /* load TTS voices (Chrome loads them async) */
  useEffect(() => {
    if (!HAS_TTS) return;
    const load = () => {
      voices.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  /* ---------------- recognition lifecycle ---------------- */
  const startRec = () => {
    if (!SR || recRef.current) return;
    try {
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e: any) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        const live = (final || interim).trim();
        setHeard(live);
        if (final) onHeard(final.trim());
      };
      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          wantRec.current = false;
          setVoiceOn(false);
          setPushing(false);
          setVoiceErr('Microphone access was blocked - allow the mic in your browser, or just tap the chips below.');
          try {
            rec.stop();
          } catch {
            /* ignore */
          }
        }
      };
      rec.onend = () => {
        recRef.current = null;
        // Chrome stops after silence; keep going only while still wanted and not mid-reply
        if (wantRec.current && phaseRef.current !== 'speaking') {
          window.setTimeout(() => {
            if (wantRec.current && phaseRef.current !== 'speaking') startRec();
          }, 250);
        }
      };
      recRef.current = rec;
      rec.start();
      setVoiceErr(null);
    } catch {
      setVoiceErr('Could not start the microphone - check browser permissions.');
    }
  };

  const pauseRec = () => {
    wantRec.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  };

  /* ---------- turn recognised speech into a command ---------- */
  const onHeard = (raw: string) => {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const phaseNow = phaseRef.current;
    if (phaseNow === 'speaking' || phaseNow === 'thinking') return; // heard ourselves / busy

    let cmd: string | null = null;
    if (pushingRef.current) {
      cmd = WAKE.test(text) ? text.replace(/^[\s\S]*?\b(alexa|echo|computer)\b[\s,]*/i, '') : text;
    } else if (voiceOnRef.current) {
      if (awaitingRef.current) {
        awaitingRef.current = false;
        cmd = text;
      } else if (WAKE.test(text)) {
        cmd = text.replace(/^[\s\S]*?\b(alexa|echo|computer)\b[\s,]*/i, '');
      } else {
        return; // not addressed to the Dot
      }
    } else {
      return;
    }

    if (!cmd) {
      // wake word only - chime and wait for the actual request
      awaitingRef.current = true;
      chime('start', mutedRef.current);
      goPhase('listening');
      setHeard('');
      return;
    }

    setHeard('');
    setPushing(false);
    chime('stop', mutedRef.current);
    // Stay in 'listening': handleCommand accepts it and respond() switches to
    // 'thinking' itself. Forcing the phase here would trip handleCommand's
    // busy-guard and silently drop the spoken command.
    cmdRef.current(cmd);
  };

  const togglePush = () => {
    if (!SR) return;
    if (pushing || (voiceOn && recRef.current)) {
      // stop listening
      setPushing(false);
      awaitingRef.current = false;
      pauseRec();
      setHeard('');
      if (phaseRef.current === 'listening') goPhase('idle');
      if (voiceOnRef.current) {
        wantRec.current = true; // pauseRec cleared it; keep hands-free alive
        window.setTimeout(startRec, 300);
      }
      return;
    }
    setVoiceErr(null);
    setPushing(true);
    wantRec.current = true;
    chime('start', mutedRef.current);
    goPhase('listening');
    startRec();
  };

  const toggleVoiceOn = () => {
    if (!SR) return;
    const next = !voiceOn;
    setVoiceOn(next);
    voiceOnRef.current = next;
    awaitingRef.current = false;
    if (next) {
      wantRec.current = true;
      startRec();
    } else {
      setPushing(false);
      pauseRec();
      if (phaseRef.current === 'listening') goPhase('idle');
    }
  };

  /* cleanup on unmount */
  useEffect(
    () => () => {
      wantRec.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
      if (HAS_TTS) window.speechSynthesis.cancel();
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    []
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [log, phase]);

  /* ---------------- speak a reply (TTS + animation) ---------------- */
  const deliver = (x: Exchange) => {
    chime(x.kind === 'fail' ? 'err' : x.kind === 'warn' ? 'stop' : 'ok', mutedRef.current);
    goPhase('speaking');
    // pause the mic so the Dot never hears itself
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      goPhase('idle');
      // Re-check at finish time: the user may have switched modes mid-reply.
      if (voiceOnRef.current) {
        wantRec.current = true;
        window.setTimeout(startRec, 250);
      } else {
        wantRec.current = false;
      }
    };

    const text = spokenText(x);
    if (HAS_TTS && !mutedRef.current && text) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        const v =
          voices.current.find((vv) => /en/i.test(vv.lang) && /samantha|zira|female|google/i.test(vv.name)) ||
          voices.current.find((vv) => /^en/i.test(vv.lang)) ||
          voices.current[0];
        if (v) u.voice = v;
        u.rate = 1.03;
        u.pitch = 1;
        u.onend = finish;
        u.onerror = finish;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        // safety net if onend never fires
        timers.current.push(window.setTimeout(finish, Math.min(15000, 2500 + text.length * 80)));
        return;
      } catch {
        /* fall through to silent timing */
      }
    }
    timers.current.push(window.setTimeout(finish, Math.min(6000, 1100 + text.length * 45)));
  };

  /** Hard-stop: cut off a reply that is playing or about to play (the
   *  "Alexa, stop" button). Cancels TTS, drops the pending thinking timer,
   *  acknowledges it in the log, and hands the mic back to hands-free mode. */
  const stopResponse = () => {
    if (phaseRef.current !== 'speaking' && phaseRef.current !== 'thinking') return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    try {
      // Fires the utterance's onerror -> deliver's finish() runs its own
      // cleanup too; both paths are idempotent.
      window.speechSynthesis.cancel();
    } catch {
      /* TTS unavailable */
    }
    chime('stop', mutedRef.current);
    goPhase('idle');
    if (voiceOnRef.current) {
      wantRec.current = true;
      window.setTimeout(startRec, 250);
    } else {
      wantRec.current = false;
    }
    setLog((l) => [
      ...l,
      {
        id: nextId.current++,
        kind: 'info' as const,
        command: '[system]',
        headline: '⏹ Stopped talking.',
        details: ['I cut my reply short. Ask me anything else.'],
      },
    ]);
  };

  /** Short thinking pause, then show + speak the reply. */
  const respond = (build: () => Omit<Exchange, 'id' | 'command'>, command: string) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    goPhase('thinking');
    timers.current.push(
      window.setTimeout(() => {
        const entry: Exchange = { id: nextId.current++, command, ...build() };
        setLog((l) => [...l, entry]);
        deliver(entry);
      }, 550)
    );
  };

  const activeFaultTypes = () =>
    Array.from(
      new Set(
        ((snapshot.lastFaults ?? []) as Array<{ type?: string }>)
          .map((f) => f.type)
          .filter((t): t is string => Boolean(t))
      )
    );

  /** Answer any typed/spoken/chosen command from the LIVE simulation result. */
  const handleCommand = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const lower = normalize(text);

    // "stop" / "be quiet" cuts off a playing or pending reply; when idle it
    // just gets a friendly acknowledgement instead of "unknown routine".
    if (/^(stop|be quiet|quiet|silence|cancel|never ?mind|shut up)$/.test(lower)) {
      if (phaseRef.current === 'speaking' || phaseRef.current === 'thinking') {
        stopResponse();
      } else {
        respond(
          () => ({
            kind: 'info' as const,
            headline: 'Nothing is playing right now.',
            details: ['Say a routine like “good night”, or ask me anything.'],
          }),
          text
        );
      }
      return;
    }

    if (phaseRef.current !== 'idle' && phaseRef.current !== 'listening') return;
    setInput('');

    if (/\b(help|what can you do|commands)\b/.test(lower)) {
      respond(
        () => ({
          kind: 'info',
          headline: 'I can run any routine in your home and tell you what happened.',
          details: [
            'Just say it - tap the microphone and say “good night”, or turn on always-listening and say “Alexa, good night”.',
            'First inject a problem from the Home tab - or the buttons right here - then give me a command to watch it fail.',
            'If something breaks, tap “Show me why” and I will open the full explanation.',
          ],
        }),
        text
      );
      return;
    }

    // "healthy" and "resilience" must be alternatives of their own: \bhealth\b
    // does not match "healthy" (no boundary before "y") and "how (is|are)"
    // does not match "how healthy is ...", which is the exact phrase the
    // empty-state help and the shield chip tell the user to say.
    if (/\b(health|healthy|status|score|resilien\w*|how (is|are))\b/.test(lower)) {
      const h = snapshot.suite.health;
      respond(
        () => ({
          kind: 'info',
          headline: `Your home health score is ${Math.round(h.score * 100)} percent.`,
          details: [
            `${h.passedRuns} of ${h.totalRuns} test runs passed.`,
            `${h.failingRoutines} routine(s) have at least one weak spot in the tests.`,
            'Open the Health tab for the full breakdown.',
          ],
        }),
        text
      );
      return;
    }

    if (/\b(fix|repair|solve|heal)\b/.test(lower)) {
      onRepair();
      respond(
        () => ({
          kind: 'info',
          headline: 'On it - repairing every broken routine now.',
          details: [
            'I am applying the safe automatic fixes and re-testing each one.',
            'Watch the health score in the top bar go up. I will report back here.',
          ],
        }),
        text
      );
      return;
    }

    const routine = findRoutine(snapshot, text);
    if (!routine) {
      respond(
        () => ({
          kind: 'fail',
          headline: `Sorry - I don’t know the routine “${text}”.`,
          details: ['I do know these:', ...snapshot.home.routines.slice(0, 8).map((r) => `“${r.name}”`)],
        }),
        text
      );
      return;
    }

    // Evaluate this routine against the currently active faults.
    const result = snapshot.lastReport.results.find((r) => r.routineId === routine.id);
    const health = snapshot.suite.routineHealth.find((h) => h.routineId === routine.id);
    const faults = activeFaultTypes();
    const faultLines = faults.map((f) => FAULT_PLAIN[f] ?? f);
    const canBreak =
      health && health.failedCodes.length > 0
        ? `It can still break when: ${health.failedCodes.map((c) => CODE_SHORT[c] ?? c).join(', ')}.`
        : 'Nothing in the test suite breaks it right now.';

    onSelectRoutine(routine.id);

    if (!result) {
      respond(
        () => ({
          kind: 'info',
          headline: `“${routine.name}” is ready.`,
          details: ['No test has run for it yet - inject a problem and ask me again.', canBreak],
        }),
        text
      );
      return;
    }

    if (result.status === 'pass') {
      respond(
        () => ({
          kind: 'pass',
          headline: `“${routine.name}” ran perfectly - all ${result.steps.length} steps finished.`,
          details: [
            `Tested under: ${snapshot.lastScenarioLabel}.`,
            faultLines.length > 0
              ? `Even with the active problem (${faultLines.join(' ')}) it still worked.`
              : 'No problems were active, so everything responded normally.',
            canBreak,
          ],
          routineId: routine.id,
        }),
        text
      );
      return;
    }

    const failedStep = result.steps.find((s) => s.status === 'fail');
    const reason = failedStep
      ? FAILURE_PLAIN[failedStep.code ?? ''] ??
        failedStep.chain[failedStep.chain.length - 1] ??
        failedStep.label
      : 'An unknown error stopped it.';
    respond(
      () => ({
        kind: 'fail',
        headline: `I could not finish “${routine.name}”. It stopped at: “${failedStep?.label ?? 'a step'}”.`,
        details: [
          `Why: ${reason}`,
          ...(failedStep ? [`Exactly what happened: ${failedStep.chain.join(' → ')}`] : []),
          ...(faultLines.length > 0 ? [`Active problem - ${snapshot.lastScenarioLabel}: ${faultLines.join(' ')}`] : []),
          canBreak,
          'Tap “Show me why” and I will open the full report for this routine.',
        ],
        routineId: routine.id,
      }),
      text
    );
  };
  cmdRef.current = handleCommand;

  /** Auto-announce whenever the active fault set changes (the Dot "notices"). */
  const faultKey = JSON.stringify(activeFaultTypes());
  useEffect(() => {
    if (seenFaults.current === null) {
      seenFaults.current = faultKey;
      return;
    }
    if (seenFaults.current === faultKey) return;
    seenFaults.current = faultKey;
    const types = activeFaultTypes();
    if (types.length === 0) {
      respond(
        () => ({
          kind: 'pass',
          headline: 'The problem has been cleared - everything is back to normal.',
          details: ['Give me a routine to run and I will confirm it works again.'],
        }),
        '[system]'
      );
    } else {
      respond(
        () => ({
          kind: 'warn',
          headline: 'Heads up - I just noticed a problem in your home.',
          details: [
            ...types.map((t) => FAULT_PLAIN[t] ?? t),
            'Anything that depends on what just broke may fail now. Give me a command to find out.',
          ],
        }),
        '[system]'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faultKey]);

  const statusText: Record<Phase, string> = {
    idle: voiceOn
      ? 'Always listening - say “Alexa, …”'
      : SR
        ? 'Tap 🎤 and speak, or tap a command below'
        : 'Voice input needs Chrome or Edge - tap a command below',
    listening: heard ? `“${heard}”` : awaitingRef.current ? 'Yes? What would you like?' : 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Responding…',
  };

  const quickFaults: { id: string; label: string }[] = [
    { id: 'cloud_outage', label: '☁️ Internet down' },
    { id: 'latency_spike', label: '📶 Slow network' },
    { id: 'lamp_offline', label: '💡 Lamp offline' },
    { id: 'thermo_offline', label: '🌡️ Thermostat offline' },
  ];

  const chipDisabled = busy || phase === 'thinking' || phase === 'speaking';

  return (
    <div className="echo-sandbox">
      <div className="echo-stage">
        <div className={`echo-dot ${phase}`} aria-hidden="true">
          <div className="echo-ring" />
          <div className="echo-face">
            <div className="echo-wave">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
        <div className={`echo-status ${phase}`}>{statusText[phase]}</div>

        <div className="echo-voice-bar">
          <button
            type="button"
            className={`echo-voice-btn mic ${pushing || phase === 'listening' ? 'on' : ''}`}
            disabled={!SR || busy || phase === 'thinking' || phase === 'speaking'}
            title={SR ? 'Push to talk - tap, wait for the chime, then speak' : 'Voice input needs Chrome or Edge'}
            onClick={togglePush}
          >
            {pushing || phase === 'listening' ? '⏹ Stop listening' : '🎤 Talk to Alexa'}
          </button>
          <button
            type="button"
            className={`echo-voice-btn wake ${voiceOn ? 'on' : ''}`}
            disabled={!SR || busy}
            title="Hands-free: the mic stays on and you wake it by saying Alexa"
            onClick={toggleVoiceOn}
          >
            👂 Always listening {voiceOn ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={`echo-voice-btn mute ${muted ? 'off' : ''}`}
            title={muted ? 'Turn spoken replies back on' : 'Mute spoken replies'}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? '🔇 Voice replies off' : '🔊 Voice replies on'}
          </button>
          <button
            type="button"
            className="echo-voice-btn stop"
            title={
              phase === 'speaking' || phase === 'thinking'
                ? 'Interrupt the Dot and stop the reply right now'
                : 'Nothing is playing right now - ask me something first'
            }
            onClick={stopResponse}
            disabled={phase !== 'speaking' && phase !== 'thinking'}
          >
            ⏹ Stop
          </button>
        </div>
        {voiceErr && <div className="echo-voice-err">{voiceErr}</div>}

        <div className="echo-fault-bar">
          <span className="echo-fault-label">Make a problem happen:</span>
          {quickFaults.map((f) => (
            <button
              key={f.id}
              type="button"
              className="echo-fault-btn"
              disabled={busy}
              title={`Simulate: ${f.label.replace(/^\S+\s/, '')}`}
              onClick={() => onInjectFault(f.id)}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            className="echo-fault-btn clear"
            disabled={busy}
            title="Clear every problem and go back to normal"
            onClick={() => onReset()}
          >
            ✕ Clear problems
          </button>
        </div>
      </div>

      <div className="echo-log">
        {log.length === 0 && (
          <div className="echo-empty">
            <b>Try it with your voice:</b> tap <b>“🎤 Talk to Alexa”</b>, wait for the chime and say “good night” -
            or switch on <b>“Always listening”</b> and just say <b>“Alexa, how healthy is my home?”</b>. No mic?
            Tap “☁️ Internet down” then <b>“Weather Briefing”</b> to watch a command fail.
          </div>
        )}
        {log.map((x) => (
          <div key={x.id} className={`echo-exchange ${x.kind}`}>
            <div className="echo-cmd">
              {x.command === '[system]' ? '🔔 system event' : `you said: “${x.command}”`}
            </div>
            <div className="echo-reply">
              <div className="echo-headline">
                {x.kind === 'pass' ? '✅ ' : x.kind === 'fail' ? '❌ ' : x.kind === 'warn' ? '⚠️ ' : 'ℹ️ '}
                {x.headline}
              </div>
              {x.details.length > 0 && (
                <ul className="echo-details">
                  {x.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
              {x.kind === 'fail' && x.routineId && (
                <button
                  type="button"
                  className="echo-why"
                  onClick={() => {
                    onSelectRoutine(x.routineId ?? null);
                    onOpenReport();
                  }}
                >
                  Show me why →
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="echo-asks">
        {snapshot.home.routines.map((r) => (
          <button
            key={r.id}
            type="button"
            className="echo-ask"
            disabled={chipDisabled}
            title={`Say: “Alexa, ${r.name}”`}
            onClick={() => handleCommand(r.name)}
          >
            🎙 {r.name}
          </button>
        ))}
        <button
          type="button"
          className="echo-ask"
          disabled={chipDisabled}
          onClick={() => handleCommand('how healthy is my home')}
        >
          🛡 How healthy is my home?
        </button>
        <button
          type="button"
          className="echo-ask"
          disabled={chipDisabled}
          onClick={() => handleCommand('fix everything')}
        >
          🔧 Fix everything
        </button>
        <button
          type="button"
          className="echo-ask"
          disabled={chipDisabled}
          onClick={() => handleCommand('what can you do')}
        >
          ❓ What can you do?
        </button>
      </div>

      <div className="echo-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCommand(input)}
          placeholder='Or type what you would say, e.g. "good night" or "run movie night"'
          disabled={busy || phase === 'thinking' || phase === 'speaking'}
        />
        <button
          onClick={() => handleCommand(input)}
          disabled={busy || phase === 'thinking' || phase === 'speaking' || !input.trim()}
        >
          Say it
        </button>
      </div>
    </div>
  );
}
