import { useRef, useState } from 'react';
import type { ChatResponse } from './types';
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
      const data = (await res.json()) as ChatResponse;
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: data.reply ?? `Error: ${JSON.stringify(data)}`,
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
