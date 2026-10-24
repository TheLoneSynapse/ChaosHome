import { useEffect, useRef, useState } from 'react';
import type { ChatResponse, RepairSummary, Snapshot } from './types';
import { TOOL_CHIP, TOOL_PLAIN } from './plain';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  mode?: 'gemini' | 'bedrock' | 'offline';
  toolCalls?: { name: string; summary: string }[];
}

const QUICK_ASKS = [
  'What do the buttons do?',
  'What am I looking at?',
  'How healthy is my home?',
  'Run the safety tests',
  'Why did Good Night break?',
  'Does any feature have problems?',
  'Fix everything',
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'I am the ChaosHome agent - I see exactly what\u2019s on your screen. Ask me about the app ("what am I looking at?", "what does this button do?"), or about your home ("run the chaos suite", "why did Good Night break?", "fix everything").',
      mode: 'offline',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [openChip, setOpenChip] = useState<string | null>(null);
  const [awaitingFix, setAwaitingFix] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async (presetText?: string) => {
    const text = (presetText ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as ChatResponse & { error?: string };
      // On a non-OK response the server sends { error }, not { reply } - show
      // that message instead of dumping raw JSON at the user.
      const reply = res.ok
        ? (data.reply ?? '(no reply)')
        : (data.error ?? `Request failed (${res.status}).`);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: reply,
          mode: data.mode,
          toolCalls: data.toolCalls?.map((t) => ({ name: t.name, summary: t.summary })),
        },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: `Chat error: ${String(err)}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  /* Proactive check (no user interference): on mount, look for features that
     are failing right now and offer to solve them with one tap. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const snap = (await res.json()) as Snapshot;
        const failing = snap.lastReport.results.filter((r) => r.status === 'fail');
        if (cancelled || failing.length === 0) return;
        const lines = failing.map((r) => {
          const step = r.steps.find((s) => s.status === 'fail');
          return (
            `- \"${r.routineName}\" stops at \"${step?.label ?? 'a step'}\"` +
            (step?.code ? ` [${step.code}]` : '') +
            (step && step.chain.length ? `\n    Cause: ${step.chain.join(' -> ')}` : '')
          );
        });
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text:
              `I checked your home on my own and found ${failing.length} feature${failing.length === 1 ? '' : 's'} with problems right now:\n\n` +
              `${lines.join('\n')}\n\n` +
              'How to solve: I can repair them automatically (add fallbacks, relink renamed devices, remove broken dependencies) and re-run the tests to confirm.\n\n' +
              'Should I solve it for you?',
          },
        ]);
        setAwaitingFix(true);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch {
        /* proactive check is best-effort - never break the chat */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** One-tap repair from the diagnosis offer: runs the same /api/repair the
   *  topbar Auto-Fix button uses, then reports what changed. */
  const solveIt = async () => {
    if (busy) return;
    setAwaitingFix(false);
    setMessages((m) => [...m, { role: 'user', text: 'Yes, solve it for me' }]);
    setBusy(true);
    try {
      const res = await fetch('/api/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { repair?: RepairSummary; error?: string };
      if (!res.ok || !data.repair) throw new Error(data.error ?? `request failed (${res.status})`);
      const r = data.repair;
      const applied = r.applied.map((a) => `- ${a.routineId}: ${a.description}`).join('\n');
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: r.applied.length
            ? `Done - I fixed ${r.applied.length} problem${r.applied.length === 1 ? '' : 's'} for you and re-tested everything:\n\n${applied}\n\nHealth score: ${Math.round(r.healthBefore)}% -> ${Math.round(r.healthAfter)}%.`
            : 'I checked, but there was nothing safe to repair automatically - the failures need a change on your side (for example re-adding a device in your smart-home app). See the Report tab for the details.',
          toolCalls: r.applied.length
            ? [{ name: 'apply_fix', summary: `${r.applied.length} repair(s) applied` }]
            : [],
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `Could not run the repair: ${String(err)}` },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <div className="chat">
      <div className="chat-header">
        <span>Your assistant</span>
        <span className="chat-hint">tap a green chip under a reply to see what it did</span>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="msg-meta">
              {m.role === 'assistant' ? (
                <>
                  <b>ChaosHome</b>
                  {m.mode && (
                    <span
                      className={`badge ${m.mode}`}
                      title={
                        m.mode === 'offline'
                          ? 'No internet needed - quick local answers'
                          : 'Cloud AI answered this (costs a tiny bit of quota)'
                      }
                    >
                      {m.mode === 'bedrock' ? 'AI · AWS' : m.mode === 'gemini' ? 'AI · Gemini (free)' : 'quick answers (offline)'}
                    </span>
                  )}
                </>
              ) : (
                <b>you</b>
              )}
            </div>
            <pre className="msg-text">{m.text}</pre>
            {m.toolCalls && m.toolCalls.length > 0 && (
              <div className="tool-calls">
                {m.toolCalls.flatMap((t, j) => {
                  const key = `${i}-${j}`;
                  return [
                    <button
                      key={j}
                      type="button"
                      className="tool-chip"
                      aria-expanded={openChip === key}
                      title={`${t.name} - tap to see what it did`}
                      onClick={() => setOpenChip(openChip === key ? null : key)}
                    >
                      {TOOL_CHIP[t.name] ?? t.name}
                    </button>,
                    ...(openChip === key
                      ? [
                          <div key={`d-${j}`} className="plain-help tool-help">
                            <b>{t.name}</b> - {TOOL_PLAIN[t.name] ?? 'Called an app tool.'}
                            {t.summary ? <> {t.summary}</> : null}
                          </div>,
                        ]
                      : []),
                  ];
                })}
              </div>
            )}
            {awaitingFix && i === messages.length - 1 && (
              <div className="fix-offer">
                <button
                  type="button"
                  className="fix-yes"
                  disabled={busy}
                  onClick={() => void solveIt()}
                >
                  Yes, solve it
                </button>
                <button
                  type="button"
                  className="fix-no"
                  disabled={busy}
                  onClick={() => setAwaitingFix(false)}
                >
                  Not now
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="msg assistant"><div className="msg-meta"><b>ChaosHome</b></div><pre className="msg-text">thinking... (usually 2-5 seconds)</pre></div>}
        <div ref={bottomRef} />
      </div>
      <div className="chat-quickasks">
        {QUICK_ASKS.map((q) => (
          <button key={q} type="button" className="quickask" disabled={busy} onClick={() => void send(q)}>
            {q}
          </button>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Run the chaos suite, explain a failure, fix everything..."
          disabled={busy}
        />
        <button onClick={() => void send()} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
