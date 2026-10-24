import { useCallback, useEffect, useState } from 'react';
import { Graph } from './Graph';
import { AlexaSandbox } from './AlexaSandbox';
import { Chat } from './Chat';
import type { RepairSummary, Snapshot } from './types';
import {
  CARD_HELP,
  CODE_SHORT,
  FAULT_PLAIN,
  FAILURE_PLAIN,
  REMEDIATION_PLAIN,
} from './plain';

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

type TabId = 'home' | 'sandbox' | 'report' | 'health' | 'assistant';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '\u{1F3E0}' },
  { id: 'sandbox', label: 'Echo Dot', icon: '\u{1F50A}' },
  { id: 'report', label: 'Report', icon: '\u{1F4CA}' },
  { id: 'health', label: 'Health', icon: '\u{1F6E1}️' },
  { id: 'assistant', label: 'Assistant', icon: '\u{1F916}' },
];

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [repair, setRepair] = useState<RepairSummary | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<string | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [now, setNow] = useState(() => Date.now());
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  // Zero-knowledge UI: which plain-language help panels are open.
  const [showTech, setShowTech] = useState(false);
  const [faultHelp, setFaultHelp] = useState(false);
  const [cardHelp, setCardHelp] = useState<string | null>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      setSnapshot((await res.json()) as Snapshot);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep the snapshot fresh: the auto-fix countdown and the generated
  // messages are driven by the server clock, not the tab being open.
  useEffect(() => {
    const id = setInterval(() => void refresh(), 2000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const runPreset = async (presetId: string) => {
    setRunning(presetId);
    setRepair(null);
    try {
      const data = await post<Snapshot>('/api/scenario', { presetId });
      setSnapshot(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(null);
    }
  };

  const repairAll = async () => {
    setRunning('repair');
    try {
      const data = await post<{ repair: RepairSummary; state: Snapshot }>('/api/repair', {});
      setRepair(data.repair);
      setSnapshot(data.state);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(null);
    }
  };

  const reset = async () => {
    setRunning('reset');
    setRepair(null);
    setSelectedRoutine(null);
    try {
      setSnapshot(await post<Snapshot>('/api/reset'));
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(null);
    }
  };

  const saveDesign = async () => {
    setRunning('save-design');
    try {
      setSnapshot(await post<Snapshot>('/api/design', { mode: 'save' }));
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(null);
    }
  };

  const restoreDesign = async () => {
    setRunning('restore-design');
    setRepair(null);
    try {
      setSnapshot(await post<Snapshot>('/api/design', { mode: 'restore' }));
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(null);
    }
  };

  const repairOne = async (routineId: string) => {
    setRunning(`repair:${routineId}`);
    setRepair(null);
    try {
      const data = await post<{ repair: RepairSummary; state: Snapshot }>('/api/repair', { routineId });
      setRepair(data.repair);
      setSnapshot(data.state);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(null);
    }
  };

  /** Tap a situation in the Health tab to re-run just that situation. */
  const runScenarioRow = async (label: string) => {
    const s = snapshot?.suite.scenarios.find((x) => x.label === label);
    if (!s) return;
    setRunning('scenario-row');
    setRepair(null);
    try {
      const data = await post<Snapshot>('/api/scenario', { faults: s.faults, label: s.label });
      setSnapshot(data);
      setTab('report');
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(null);
    }
  };

  if (!snapshot) {
    return (
      <div className="loading">
        {error ? `Failed to reach ChaosHome server: ${error}` : 'Connecting to ChaosHome MCP server...'}
      </div>
    );
  }

  const health = snapshot.suite.health;
  const healthPct = Math.round(health.score * 100);
  // Names of the fault types currently injected (what can cause the problem on screen).
  const faultNames = Array.from(
    new Set(
      ((snapshot.lastFaults ?? []) as Array<{ type?: string }>)
        .map((f) => f.type)
        .filter((t): t is string => Boolean(t))
    )
  );
  const baselineOk = snapshot.suite.baseline.failed === 0;
  const report = snapshot.lastReport;
  const selectedResult = report.results.find((r) => r.routineId === selectedRoutine);
  const selectedHealth = snapshot.suite.routineHealth.find((h) => h.routineId === selectedRoutine);

  const failedCount = report.summary.failed;
  const dueAt = snapshot.autoFix?.dueAt ?? null;
  const remaining = dueAt !== null ? Math.max(0, dueAt - now) : 0;
  const autoFixMessage = snapshot.autoFix?.message ?? null;
  const design = snapshot.design;

  return (
    <div className="app">
      {/* ---------------- Left navigation sidebar ---------------- */}
      <nav className="sidebar" aria-label="App navigation">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
              <polygon
                className="lg-hex"
                points="24,4 41,14 41,34 24,44 7,34 7,14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle
                className="lg-orbit"
                cx="24"
                cy="24"
                r="13.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeDasharray="7 5"
              />
              <circle className="lg-pulse" cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="1.6" />
              <circle className="lg-core" cx="24" cy="24" r="5" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h1>ChaosHome</h1>
            <span className="tagline">Smart home resilience</span>
          </div>
        </div>

        <div className="nav-items" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-label">{t.label}</span>
              {t.id === 'report' && failedCount > 0 && <span className="nav-badge">{failedCount}</span>}
              {t.id === 'health' && (
                <span className={`nav-score ${healthPct >= 90 ? 'good' : healthPct >= 70 ? 'mid' : 'bad'}`}>
                  {healthPct}%
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="sidebar-foot"
          onClick={() => setShowTech((v) => !v)}
          title="Connection info - tap to switch between plain and technical wording"
        >
          {showTech ? (
            <>
              MCP · Streamable HTTP <span className="sidebar-foot-dim">spec 2025-11-25</span>
            </>
          ) : (
            <>
              ✓ Connected <span className="sidebar-foot-dim">tap for tech info</span>
            </>
          )}
        </button>
      </nav>

      {/* ---------------- Main column ---------------- */}
      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="health-block"
            onClick={() => setTab('health')}
            title="Tap to open your home’s health details"
          >
            <div className={`health-score ${healthPct >= 90 ? 'good' : healthPct >= 70 ? 'mid' : 'bad'}`}>
              {healthPct}%
            </div>
            <div className="health-meta">
              <span>home health score - tap for details</span>
              <span>
                {health.passedRuns} of {health.totalRuns} tests passed ({snapshot.suite.results.length}{' '}
                situations tried)
              </span>
              <span className={baselineOk ? 'ok' : 'bad-text'}>
                normally: {snapshot.suite.baseline.passed}/{snapshot.suite.baseline.total} routines all work
              </span>
            </div>
          </button>

          <div className="top-actions">
            <button className="primary" onClick={repairAll} disabled={running !== null}>
              {running === 'repair' ? 'Repairing...' : '\u2699\uFE0F Auto-Fix All'}
            </button>
            <button onClick={reset} disabled={running !== null}>
              Reset home
            </button>
          </div>
        </header>

        <main className="layout">
          {tab === 'home' && (
            <>
              <div className="presets">
                <span className="presets-label">Simulate a problem (safe):</span>
                {snapshot.presets.map((p) => (
                  <button
                    key={p.id}
                    className={`preset ${snapshot.lastScenarioLabel === p.label ? 'active' : ''}`}
                    onClick={() => void runPreset(p.id)}
                    disabled={running !== null}
                  >
                    {running === p.id ? '...' : p.label}
                  </button>
                ))}
                {faultNames.length > 0 && (
                  <button
                    type="button"
                    className="fault-name-badge"
                    title="What is being simulated right now?"
                    onClick={() => setFaultHelp((v) => !v)}
                  >
                    ⚠ {faultNames.join(', ')} - what does this mean? {faultHelp ? '▲' : '▼'}
                  </button>
                )}
              </div>

              {faultHelp && (
                <div className="plain-help" role="note">
                  {faultNames.map((n) => FAULT_PLAIN[n] ?? n).join(' ')}
                  {' '}This is only a simulation - nothing in your real home is touched.
                </div>
              )}

              <section className="panel graph-panel">
                <div className="panel-title">
                  <span>Your home - tap any circle, box or pill</span>
                  <span className="scenario-tag">{snapshot.lastScenarioLabel}</span>
                </div>
                <Graph
                  snapshot={snapshot}
                  selectedRoutine={selectedRoutine}
                  onSelectRoutine={setSelectedRoutine}
                />
              </section>
            </>
          )}

          {tab === 'sandbox' && (
            <section className="panel echo-panel">
              <div className="panel-title">
                <span>Echo Dot sandbox - talk to your home</span>
                <span className="scenario-tag">{snapshot.lastScenarioLabel}</span>
              </div>
              <AlexaSandbox
                snapshot={snapshot}
                busy={running !== null}
                onSelectRoutine={setSelectedRoutine}
                onOpenReport={() => setTab('report')}
                onInjectFault={(id) => void runPreset(id)}
                onRepair={() => void repairAll()}
                onReset={() => void reset()}
              />
            </section>
          )}

          {tab === 'report' && (
            <section className="panel report-panel">
              <div className="panel-title">
                <span>Test results</span>
                <span className={`summary ${failedCount ? 'bad-text' : 'ok'}`}>
                  {report.summary.passed}/{report.summary.total} passed
                </span>
              </div>

              {/* Designed (primary) state: what "fixed" looks like for this user */}
              <div className="design-bar">
                <div className="design-info">
                  <b>Your saved “good” setup:</b>{' '}
                  {design?.saved ? (
                    <>
                      saved at {new Date(design.savedAt ?? Date.now()).toLocaleTimeString()}{' '}
                      {design.matches ? (
                        <span className="ok">- matches it right now</span>
                      ) : (
                        <span className="bad-text">- has drifted away from it</span>
                      )}
                    </>
                  ) : (
                    <span className="muted-text">none saved yet - press “Save current setup” to remember how things are now</span>
                  )}
                </div>
                <div className="design-actions">
                  <button
                    onClick={() => void saveDesign()}
                    disabled={running !== null}
                    title="Remember the setup you have right now as the one you want to keep"
                  >
                    {running === 'save-design' ? 'Saving...' : 'Save current setup'}
                  </button>
                  <button
                    onClick={() => void restoreDesign()}
                    disabled={running !== null || !design?.saved}
                    title="Put every routine back the way your saved setup had it"
                  >
                    {running === 'restore-design' ? 'Restoring...' : 'Restore saved setup'}
                  </button>
                </div>
              </div>

              {/* Auto-fix countdown: fires 5 minutes after a failure appears */}
              {dueAt !== null && failedCount > 0 && (
                <div className={`autofix-banner ${remaining <= 30000 ? 'urgent' : ''}`}>
                  <span className="autofix-clock">
                    {remaining > 0 ? (
                      <>
                        {"\u23F1"} Auto-fix in <b>{`${Math.floor(Math.ceil(remaining / 1000) / 60)}:${String(Math.ceil(remaining / 1000) % 60).padStart(2, '0')}`}</b>
                      </>
                    ) : (
                      <b>auto-fixing now...</b>
                    )}
                  </span>
                  <span className="autofix-hint">
                    Fix it yourself before the timer ends, or it repairs automatically and posts a message here.
                  </span>
                  <button
                    className="primary"
                    onClick={() => void repairAll()}
                    disabled={running !== null}
                  >
                    Fix now
                  </button>
                </div>
              )}

              {/* Generated message after an automatic (or manual) repair */}
              {autoFixMessage && autoFixMessage !== dismissedMessage && (
                <div className="autofix-message" role="status">
                  <span className="autofix-robot">{'\u{1F916}'}</span>
                  <div className="autofix-text">{autoFixMessage}</div>
                  <button
                    className="icon-btn"
                    onClick={() => setDismissedMessage(autoFixMessage)}
                    aria-label="Dismiss message"
                  >
                    {'\u2715'}
                  </button>
                </div>
              )}

              <div className="report-list">
                {report.results.map((r) => {
                  const selected = r.routineId === selectedRoutine;
                  const frag = snapshot.suite.routineHealth.find((h) => h.routineId === r.routineId);
                  const expanded = selected || showAllSteps;
                  return (
                    <div
                      key={r.routineId}
                      className={`report-item ${r.status} ${selected ? 'selected' : ''}`}
                      onClick={() => setSelectedRoutine(selected ? null : r.routineId)}
                    >
                      <div className="report-item-head">
                        <span className={`status-pill ${r.status}`}>{r.status === 'pass' ? 'PASS' : 'FAIL'}</span>
                        <span className="routine-name">{r.routineName}</span>
                        <span className="fragility" title="How often this breaks across all tests">
                          {frag ? `risk ${Math.round(frag.fragility * 100)}%` : ''}
                        </span>
                        {r.status === 'fail' && (
                          <button
                            className="row-fix"
                            disabled={running !== null}
                            title="Fix this routine back to the designed state"
                            onClick={(e) => {
                              e.stopPropagation();
                              void repairOne(r.routineId);
                            }}
                          >
                            {running === `repair:${r.routineId}` ? 'Fixing...' : 'Fix this routine'}
                          </button>
                        )}
                      </div>
                      {r.status === 'fail' && expanded && (
                        <div className="failures">
                          {r.steps
                            .filter((s) => s.status === 'fail')
                            .map((s, i) => (
                              <div key={i} className="failure">
                                <button
                                  type="button"
                                  className="failure-code"
                                  title="What does this mean?"
                                  onClick={() =>
                                    setOpenCode(
                                      openCode === `${r.routineId}-${i}` ? null : `${r.routineId}-${i}`
                                    )
                                  }
                                >
                                  {s.label || s.code}{' '}
                                  <span className="code-tag">{s.code} ?</span>
                                </button>
                                {openCode === `${r.routineId}-${i}` && (
                                  <div className="plain-help">
                                    {FAILURE_PLAIN[s.code ?? ''] ?? s.label}
                                  </div>
                                )}
                                <ol className="chain">
                                  {s.chain.map((c, j) => (
                                    <li key={j}>{c}</li>
                                  ))}
                                </ol>
                              </div>
                            ))}
                        </div>
                      )}
                      {r.status === 'pass' && selected && selectedHealth && (
                        <div className="pass-detail">
                          Works in {selectedHealth.scenarios - selectedHealth.failures}
                          of {selectedHealth.scenarios} tests
                          {selectedHealth.failedCodes.length > 0 && (
                            <> - breaks when: {selectedHealth.failedCodes.map((c) => CODE_SHORT[c] ?? c).join(', ')}</>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="link-btn" onClick={() => setShowAllSteps((v) => !v)}>
                {showAllSteps ? 'Hide all reasons' : 'Show why each test failed'}
              </button>

              {repair && (
                <div className="repair-box">
                  <div className="repair-head">
                    We fixed: <b>{repair.applied.length} repair{repair.applied.length === 1 ? '' : 's'}</b> (health{' '}
                    {Math.round(repair.healthBefore * 100)}% -&gt; {Math.round(repair.healthAfter * 100)}%)
                  </div>
                  <ul>
                    {repair.applied.slice(0, 8).map((f, i) => (
                      <li key={i} title={`${f.remediation} - ${f.routineId}${f.actionId ? ` / ${f.actionId}` : ''}`}>
                        <b>{REMEDIATION_PLAIN[f.remediation] ?? f.remediation}</b> - {f.description}
                      </li>
                    ))}
                  </ul>
                  {repair.skipped.length > 0 && (
                    <div className="repair-skipped">
                      Needs manual attention: {repair.skipped.map((s) => s.routineId).join(', ')}
                    </div>
                  )}
                </div>
              )}

              {!repair && (
                <div className="report-hint">
                  {failedCount === 0
                    ? 'Everything passed this test. Try a problem from the Home tab to see failures.'
                    : `${failedCount} routine(s) broke - tap a row to see exactly why it failed.`}
                  {selectedResult && selectedResult.status === 'pass' && ' This routine survived.'}
                </div>
              )}
            </section>
          )}

          {tab === 'health' && (
            <section className="panel health-panel">
              <div className="panel-title">
                <span>Home health</span>
                <span className={`summary ${baselineOk ? 'ok' : 'bad-text'}`}>
                  normally: {snapshot.suite.baseline.passed}/{snapshot.suite.baseline.total} routines work
                </span>
              </div>

              <div className="health-scroll">
                <div className="health-cards">
                  <button
                    type="button"
                    className={`health-card ${cardHelp === 'score' ? 'active' : ''}`}
                    onClick={() => setCardHelp(cardHelp === 'score' ? null : 'score')}
                    title="What does this number mean?"
                  >
                    <span className="health-card-value">{healthPct}%</span>
                    <span className="health-card-label">health score - tap to explain</span>
                  </button>
                  <button
                    type="button"
                    className={`health-card ${cardHelp === 'runs' ? 'active' : ''}`}
                    onClick={() => setCardHelp(cardHelp === 'runs' ? null : 'runs')}
                    title="What does this number mean?"
                  >
                    <span className="health-card-value">
                      {health.passedRuns}/{health.totalRuns}
                    </span>
                    <span className="health-card-label">tests passed - tap to explain</span>
                  </button>
                  <button
                    type="button"
                    className={`health-card ${cardHelp === 'broken' ? 'active' : ''}`}
                    onClick={() => setCardHelp(cardHelp === 'broken' ? null : 'broken')}
                    title="What does this number mean?"
                  >
                    <span className="health-card-value">
                      {health.failingRoutines}/{health.totalRoutines}
                    </span>
                    <span className="health-card-label">routines broken now - tap to explain</span>
                  </button>
                  <button
                    type="button"
                    className={`health-card ${cardHelp === 'situations' ? 'active' : ''}`}
                    onClick={() => setCardHelp(cardHelp === 'situations' ? null : 'situations')}
                    title="What does this number mean?"
                  >
                    <span className="health-card-value">{snapshot.suite.results.length}</span>
                    <span className="health-card-label">situations tested - tap to explain</span>
                  </button>
                </div>

                {cardHelp && (
                  <div className="plain-help" role="note">
                    {CARD_HELP[cardHelp]}
                  </div>
                )}

                <h3 className="health-heading">Which routines break easiest (tap one to open its report)</h3>
                <div className="risk-list">
                  {snapshot.suite.routineHealth.map((r) => (
                    <button
                      type="button"
                      key={r.routineId}
                      className="risk-row"
                      title="Open this routine in Test results"
                      onClick={() => {
                        setSelectedRoutine(r.routineId);
                        setTab('report');
                      }}
                    >
                      <span className="routine-name">{r.routineName}</span>
                      <span className="risk-bar" title={`${Math.round(r.fragility * 100)}% likely to break`}>
                        <span
                          className={`risk-fill ${r.fragility >= 0.3 ? 'bad' : r.fragility >= 0.15 ? 'mid' : 'ok'}`}
                          style={{ width: `${Math.max(4, Math.round(r.fragility * 100))}%` }}
                        />
                      </span>
                      <span className="fragility">{Math.round(r.fragility * 100)}%</span>
                      <span className="risk-detail" title="Broken in this many tests / total tests">
                        {r.failures}/{r.scenarios}
                        {r.failedCodes.length > 0
                          ? ` · ${r.failedCodes.map((c) => CODE_SHORT[c] ?? c).join(', ')}`
                          : ''}
                      </span>
                    </button>
                  ))}
                </div>

                <h3 className="health-heading">Every situation we tested (tap one to run it again)</h3>
                <div className="scenario-list">
                  {snapshot.suite.results.map((s) => (
                    <button
                      type="button"
                      key={s.scenario}
                      className={`scenario-row ${s.failed ? 'bad' : 'ok'}`}
                      disabled={running !== null}
                      title="Run this situation again and show me the results"
                      onClick={() => void runScenarioRow(s.scenario)}
                    >
                      <span className="routine-name">
                        {s.failed ? '✗ ' : '✓ '}
                        {s.scenario}
                      </span>
                      <span className="fragility">
                        {s.passed} passed / {s.failed} broken
                      </span>
                    </button>
                  ))}
                </div>

                {snapshot.history.length > 0 && (
                  <div className="history">
                    <b>What we fixed so far ({snapshot.history.length})</b>
                    <ul>
                      {snapshot.history.slice(-5).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === 'assistant' && (
            <section className="panel chat-panel">
              <Chat />
            </section>
          )}
        </main>

        <footer className="footer">
          <button
            type="button"
            className="footer-toggle"
            onClick={() => setShowTech((v) => !v)}
            title="Technical details"
          >
            {showTech ? 'Hide technical details' : 'Connected & running on this computer - tap for technical details'}
          </button>
          {showTech && (
            <div className="footer-tech">
              MCP server: Streamable HTTP (spec 2025-11-25) - tools: list_home, get_routines, run_chaos_sim,
              get_report, home_health, explain_failure, apply_fix, verify_fix
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
