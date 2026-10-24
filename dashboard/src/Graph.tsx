import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot } from './types';

interface Node {
  id: string;
  kind: 'device' | 'group' | 'routine';
  label: string;
  sub?: string;
  status?: 'pass' | 'fail' | 'neutral';
  fragility?: number;
  faulted?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  source: string;
  target: string;
  kind: 'member' | 'depends';
}

/** Raw fault shape as it arrives from the core suite (typed loosely on the wire). */
interface RawFault {
  type: string;
  deviceId?: string;
  groupId?: string;
  removedDeviceId?: string;
  skillId?: string;
}

interface FaultName {
  label: string;
  type: string;
}

interface SelectedNode {
  id: string;
  kind: 'device' | 'group' | 'routine';
  label: string;
  sub?: string;
}

const W = 900;
const H = 620;

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 4;

/** Network-wide faults: they break anything reaching the device through the cloud. */
const GLOBAL_FAULT_TYPES = new Set(['cloud_unreachable', 'latency_spike']);

function buildGraph(snapshot: Snapshot): { nodes: Node[]; edges: Edge[] } {
  const { home, lastReport, suite, lastFaults } = snapshot;
  const healthByRoutine = new Map(suite.routineHealth.map((h) => [h.routineId, h]));
  const statusByRoutine = new Map(lastReport.results.map((r) => [r.routineId, r.status]));

  // Devices/groups currently targeted by an injected fault.
  const faultedIds = new Set<string>();
  for (const f of (lastFaults ?? []) as RawFault[]) {
    if (f.type === 'device_offline' || f.type === 'device_renamed') {
      if (f.deviceId) faultedIds.add(f.deviceId);
    }
    if (f.type === 'group_modified' && f.groupId) faultedIds.add(f.groupId);
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const d of home.devices) {
    nodes.push({
      id: d.id,
      kind: 'device',
      label: d.name,
      sub: d.room,
      status: d.online ? 'neutral' : 'fail',
      faulted: faultedIds.has(d.id),
      x: W / 2 + (Math.random() - 0.5) * 300,
      y: H / 2 + (Math.random() - 0.5) * 240,
      vx: 0,
      vy: 0,
    });
  }
  for (const g of home.groups) {
    nodes.push({
      id: g.id,
      kind: 'group',
      label: g.name,
      sub: 'group',
      faulted: faultedIds.has(g.id),
      x: W / 2 + (Math.random() - 0.5) * 300,
      y: H / 2 + (Math.random() - 0.5) * 240,
      vx: 0,
      vy: 0,
    });
    for (const memberId of g.deviceIds) {
      edges.push({ source: g.id, target: memberId, kind: 'member' });
    }
  }
  for (const r of home.routines) {
    const health = healthByRoutine.get(r.id);
    nodes.push({
      id: r.id,
      kind: 'routine',
      label: r.name,
      sub: `${r.trigger.type} trigger`,
      status: statusByRoutine.get(r.id) ?? 'neutral',
      fragility: health?.fragility ?? 0,
      x: W / 2 + (Math.random() - 0.5) * 360,
      y: H / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    });
    for (const a of r.actions) {
      if (a.deviceId) edges.push({ source: r.id, target: a.deviceId, kind: 'depends' });
      if (a.groupId) edges.push({ source: r.id, target: a.groupId, kind: 'depends' });
      for (const id of a.deviceIds ?? []) edges.push({ source: r.id, target: id, kind: 'depends' });
    }
  }
  return { nodes, edges };
}

/** Small deterministic-enough force simulation: repulsion + springs + centering. */
function simulate(nodes: Node[], edges: Edge[], ticks = 360): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
  }

  const radiusFor = (n: Node) => (n.kind === 'device' ? 24 : n.kind === 'group' ? 30 : 34);

  for (let t = 0; t < ticks; t++) {
    const alpha = 1 - t / ticks;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist2 = dx * dx + dy * dy;
        if (dist2 < 1) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          dist2 = 1;
        }
        const dist = Math.sqrt(dist2);
        const minDist = radiusFor(a) + radiusFor(b) + 26;
        const force = Math.min(2600 / dist2, 2.4) * alpha + (dist < minDist ? (minDist - dist) * 0.05 : 0);
        const ux = dx / dist;
        const uy = dy / dist;
        a.vx -= ux * force;
        a.vy -= uy * force;
        b.vx += ux * force;
        b.vy += uy * force;
      }
    }

    // Springs along edges
    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const rest = e.kind === 'member' ? 85 : 150;
      const force = (dist - rest) * 0.012 * alpha;
      const ux = dx / dist;
      const uy = dy / dist;
      a.vx += ux * force;
      a.vy += uy * force;
      b.vx -= ux * force;
      b.vy -= uy * force;
    }

    // Centering + integration
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * 0.0045 * alpha;
      n.vy += (H / 2 - n.y) * 0.0045 * alpha;
      n.vx *= 0.82;
      n.vy *= 0.82;
      n.x = Math.max(46, Math.min(W - 46, n.x + n.vx));
      n.y = Math.max(34, Math.min(H - 34, n.y + n.vy));
    }
  }
}

/**
 * Refresh pass/fail/fragility/faulted flags on an EXISTING layout so the
 * 2-second /api/state poll recolors nodes without re-running the simulation.
 * (Rebuilding here re-randomised every position each poll - the graph appeared
 * to reshuffle itself every 2 seconds.)
 */
function refreshNodeStates(nodes: Node[], snapshot: Snapshot): void {
  const statusByRoutine = new Map(
    snapshot.lastReport.results.map((r) => [r.routineId, r.status])
  );
  const fragilityByRoutine = new Map(
    snapshot.suite.routineHealth.map((h) => [h.routineId, h.fragility])
  );
  const online = new Map(snapshot.home.devices.map((d) => [d.id, d.online]));
  const faultedIds = new Set<string>();
  for (const f of (snapshot.lastFaults ?? []) as RawFault[]) {
    if ((f.type === 'device_offline' || f.type === 'device_renamed') && f.deviceId) {
      faultedIds.add(f.deviceId);
    }
    if (f.type === 'group_modified' && f.groupId) faultedIds.add(f.groupId);
  }
  for (const n of nodes) {
    if (n.kind === 'routine') {
      n.status = statusByRoutine.get(n.id) ?? 'neutral';
      n.fragility = fragilityByRoutine.get(n.id) ?? 0;
    } else if (n.kind === 'device') {
      n.status = online.get(n.id) === false ? 'fail' : 'neutral';
    }
    n.faulted = faultedIds.has(n.id);
  }
}

const CAPABILITY_GLYPH: Record<string, string> = {
  light: '\u{1F4A1}',
  plug: '\u{1F50C}',
  speaker: '\u{1F50A}',
  thermostat: '\u{1F321}\u{FE0F}',
  lock: '\u{1F512}',
  blind: '\u{1F5DC}\u{FE0F}',
  camera: '\u{1F4F7}',
  sensor: '\u{1F4E1}',
  display: '\u{1F4FA}',
};

/** Fault type of the scenario with this label, for the small tag in the list. */
function scenarioFaultType(snapshot: Snapshot, label: string): string {
  const scenario = snapshot.suite.scenarios.find((s) => s.label === label);
  const first = (scenario?.faults as RawFault[] | undefined)?.[0];
  return first?.type ?? 'scenario';
}

/**
 * The names of the faults that can take this node down.
 *
 * - device: faults that target it (offline / renamed / dropped from a group) plus
 *   network-wide faults while it is cloud-dependent.
 * - group: edits to the group itself and any member going offline (the group action
 *   then fails on the unreachable member).
 * - routine: every suite scenario it fails today, plus the scenario on screen.
 */
function faultsFor(snapshot: Snapshot, node: SelectedNode): FaultName[] {
  const out: FaultName[] = [];
  const seen = new Set<string>();
  const add = (label: string, type: string, key = `${label}|${type}`) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, type });
  };

  /** Same fault + same target = the same fault, whatever scenario labelled it. */
  const faultKey = (f: RawFault) => {
    if (f.type === 'device_offline' || f.type === 'device_renamed' || f.type === 'skill_disabled') {
      return `${f.type}|${f.deviceId ?? f.skillId ?? ''}`;
    }
    if (f.type === 'group_modified') return `${f.type}|${f.groupId ?? ''}|${f.removedDeviceId ?? ''}`;
    return `${f.type}|`;
  };

  const device = node.kind === 'device' ? snapshot.home.devices.find((d) => d.id === node.id) : undefined;
  const group = node.kind === 'group' ? snapshot.home.groups.find((g) => g.id === node.id) : undefined;
  const cloudVulnerable = Boolean(device?.cloudDependent);

  const consider = (label: string, f: RawFault) => {
    if (node.kind === 'device') {
      if ((f.type === 'device_offline' || f.type === 'device_renamed') && f.deviceId === node.id) {
        add(label, f.type, faultKey(f));
      } else if (f.type === 'group_modified' && f.removedDeviceId === node.id) {
        add(label, f.type, faultKey(f));
      } else if (GLOBAL_FAULT_TYPES.has(f.type) && cloudVulnerable) {
        add(label, f.type, faultKey(f));
      }
      return;
    }
    if (node.kind === 'group' && group) {
      if (f.type === 'group_modified' && f.groupId === node.id) add(label, f.type, faultKey(f));
      else if (f.type === 'device_offline' && f.deviceId && group.deviceIds.includes(f.deviceId)) {
        add(label, f.type, faultKey(f));
      }
    }
  };

  for (const s of snapshot.suite.scenarios) {
    for (const f of (s.faults ?? []) as RawFault[]) consider(s.label, f);
  }

  if (node.kind === 'routine') {
    for (const r of snapshot.suite.results) {
      if (r.failedRoutines.includes(node.id)) add(r.scenario, scenarioFaultType(snapshot, r.scenario));
    }
    const inLast = snapshot.lastReport.results.find((r) => r.routineId === node.id);
    if (inLast?.status === 'fail') {
      const current = ((snapshot.lastFaults ?? []) as RawFault[])[0]?.type ?? 'scenario';
      add(snapshot.lastScenarioLabel, current);
    }
  } else {
    for (const f of (snapshot.lastFaults ?? []) as RawFault[]) consider(snapshot.lastScenarioLabel, f);
  }

  return out;
}

export function Graph({
  snapshot,
  selectedRoutine,
  onSelectRoutine,
}: {
  snapshot: Snapshot;
  selectedRoutine: string | null;
  onSelectRoutine: (id: string | null) => void;
}) {
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  /** User-pinned node positions, kept across re-layouts. */
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ px: number; py: number } | null>(null);
  const didDragRef = useRef(false);

  // Re-layout ONLY when the structure (home model) changes, e.g. after a repair.
  // The 2s /api/state poll always delivers a fresh snapshot object, so the old
  // [layoutKey, lastReport, suite] deps re-ran buildGraph+simulate every poll
  // and re-randomised every node position (graph "moving itself"). Statuses and
  // fragility are now overlaid by refreshNodeStates() instead.
  const layoutKey = JSON.stringify({
    d: snapshot.home.devices.map((d) => d.id),
    g: snapshot.home.groups.map((g) => [g.id, g.deviceIds]),
    r: snapshot.home.routines.map((r) => [r.id, r.actions.map((a) => [a.deviceId, a.groupId, a.deviceIds])]),
  });

  const { nodes, edges } = useMemo(() => {
    const graph = buildGraph(snapshot);
    simulate(graph.nodes, graph.edges);
    return graph;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  // Live pass/fail/fault colours on the stable layout (no re-layout).
  refreshNodeStates(nodes, snapshot);

  // Apply user-dragged positions on top of the computed layout.
  for (const n of nodes) {
    const p = positions[n.id];
    if (p) {
      n.x = p.x;
      n.y = p.y;
    }
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));

  /* ---------------------------------------------------------------- */
  /* Pan & zoom                                                       */
  /* ---------------------------------------------------------------- */

  /** Client (screen) pixels -> plot coordinates, ignoring the pan/zoom transform. */
  const clientToPlot = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  /** Screen pixels per plot unit (the SVG viewBox fit), to convert wheel deltas. */
  const pixelsPerUnit = () => svgRef.current?.getScreenCTM()?.a || 1;

  const zoomAt = useCallback((factor: number, center?: { x: number; y: number }) => {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
      const c = center ?? { x: W / 2, y: H / 2 };
      const qx = (c.x - v.x) / v.k;
      const qy = (c.y - v.y) / v.k;
      return { k, x: c.x - k * qx, y: c.y - k * qy };
    });
  }, []);

  // Wheel must be a native listener: React's onWheel is passive, so preventDefault is ignored.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch arrives as ctrl+wheel; ctrl+scroll works too.
        const center = clientToPlot(e.clientX, e.clientY) ?? undefined;
        zoomAt(Math.exp(-e.deltaY * 0.01), center);
      } else {
        // Two-finger trackpad scroll (or wheel) pans the graph.
        const scale = pixelsPerUnit();
        setView((v) => ({ ...v, x: v.x - e.deltaX / scale, y: v.y - e.deltaY / scale }));
      }
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [clientToPlot, zoomAt]);

  /** Client pixels -> coordinates inside the pan/zoom group (node space). */
  const clientToNode = (clientX: number, clientY: number, v: typeof view) => {
    const p = clientToPlot(clientX, clientY);
    if (!p) return null;
    return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k };
  };

  /** Dragging a node moves just that node; the background drag still pans. */
  const onNodePointerDown = (e: React.PointerEvent, n: Node) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const start = clientToNode(e.clientX, e.clientY, view);
    if (!start) return;
    const origin = positions[n.id] ?? { x: n.x, y: n.y };
    didDragRef.current = false;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const cur = clientToNode(ev.clientX, ev.clientY, view);
      if (!cur) return;
      const nx = origin.x + (cur.x - start.x);
      const ny = origin.y + (cur.y - start.y);
      if (!moved && Math.abs(nx - origin.x) + Math.abs(ny - origin.y) > 4) moved = true;
      if (!moved) return;
      didDragRef.current = true;
      setPositions((p) => ({
        ...p,
        [n.id]: {
          x: Math.max(46, Math.min(W - 46, nx)),
          y: Math.max(34, Math.min(H - 34, ny)),
        },
      }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // Drag-to-pan lives on window listeners: capturing the pointer on the <svg> would
  // retarget the subsequent click and swallow node selections.
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    didDragRef.current = false;
    dragRef.current = { px: e.clientX, py: e.clientY };

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.px;
      const dy = ev.clientY - d.py;
      if (Math.abs(dx) + Math.abs(dy) > 3) didDragRef.current = true;
      d.px = ev.clientX;
      d.py = ev.clientY;
      if (!didDragRef.current) return;
      const scale = pixelsPerUnit();
      setView((v) => ({ ...v, x: v.x + dx / scale, y: v.y + dy / scale }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  /* ---------------------------------------------------------------- */
  /* Selection                                                        */
  /* ---------------------------------------------------------------- */

  const selectNode = (n: Node) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (selected?.id === n.id) {
      setSelected(null);
      if (n.kind === 'routine') onSelectRoutine(null);
      return;
    }
    setSelected({ id: n.id, kind: n.kind, label: n.label, sub: n.sub });
    if (n.kind === 'routine') onSelectRoutine(n.id);
  };

  const nodeProps = (n: Node) => ({
    onClick: () => selectNode(n),
    onPointerDown: (e: React.PointerEvent) => onNodePointerDown(e, n),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectNode(n);
      }
    },
    role: 'button' as const,
    tabIndex: 0,
    style: { cursor: 'grab' as const },
  });

  const focusedId = selected?.id ?? selectedRoutine;
  const faults = useMemo(
    () => (selected ? faultsFor(snapshot, selected) : []),
    [selected, snapshot]
  );

  return (
    <div className="graph-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="graph-svg"
        role="img"
        aria-label="Smart home graph"
        onPointerDown={onPointerDown}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#9db0cd" />
          </marker>
        </defs>

        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {edges.map((e, i) => {
            const a = byId.get(e.source);
            const b = byId.get(e.target);
            if (!a || !b) return null;
            const stressed =
              (focusedId && (e.source === focusedId || e.target === focusedId)) || false;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`edge ${e.kind} ${stressed ? 'stressed' : ''}`}
                markerEnd={e.kind === 'depends' ? 'url(#arrow)' : undefined}
              />
            );
          })}

          {nodes.map((n) => {
            const selectedNode = n.id === selected?.id;
            const frag = n.fragility ?? 0;
            if (n.kind === 'device') {
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className={`node device ${n.status === 'fail' ? 'fail' : ''} ${n.faulted ? 'faulted' : ''} ${
                    selectedNode ? 'selected' : ''
                  }`}
                  {...nodeProps(n)}
                >
                  <circle r="22" />
                  <text y="6" textAnchor="middle" fontSize="15" className="glyph">
                    {CAPABILITY_GLYPH[snapshot.home.devices.find((d) => d.id === n.id)?.capability ?? ''] ?? '\u{1F50C}'}
                  </text>
                  <text y="38" textAnchor="middle" className="node-label">
                    {n.label}
                  </text>
                  <title>{`${n.label} (${n.sub})${n.faulted ? ' - FAULT INJECTED HERE' : ''} - click to see what can take it out`}</title>
                </g>
              );
            }
            if (n.kind === 'group') {
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  className={`node group ${n.faulted ? 'faulted' : ''} ${selectedNode ? 'selected' : ''}`}
                  {...nodeProps(n)}
                >
                  <rect x="-34" y="-22" width="68" height="44" rx="10" />
                  <text y="5" textAnchor="middle" className="glyph">
                    {'\u{1F3E0}'}
                  </text>
                  <text y="40" textAnchor="middle" className="node-label">
                    {n.label}
                  </text>
                  <title>{`Group: ${n.label}${n.faulted ? ' - FAULT INJECTED HERE' : ''} - click to see what can take it out`}</title>
                </g>
              );
            }
            const statusClass = n.status === 'fail' ? 'fail' : n.status === 'pass' ? 'pass' : '';
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                className={`node routine ${statusClass} ${selectedNode ? 'selected' : ''}`}
                {...nodeProps(n)}
              >
                <rect x="-44" y="-20" width="88" height="40" rx="20" />
                {frag > 0 && (
                  <rect
                    x="-44"
                    y="-20"
                    width={Math.max(4, 88 * frag)}
                    height="40"
                    rx="20"
                    className="fragility-bar"
                  />
                )}
                <text y="5" textAnchor="middle" className="routine-label">
                  {n.label.length > 14 ? n.label.slice(0, 13) + '\u2026' : n.label}
                </text>
                <title>{`${n.label} - fragility ${Math.round(frag * 100)}% - click to see what breaks it`}</title>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="graph-zoom">
        <button type="button" onClick={() => zoomAt(1 / 1.25)} title="Zoom out (pinch in / ctrl+scroll)">
          {'\u2212'}
        </button>
        <span className="zoom-level">{Math.round(view.k * 100)}%</span>
        <button type="button" onClick={() => zoomAt(1.25)} title="Zoom in (pinch out / ctrl+scroll)">
          +
        </button>
        <button
          type="button"
          className="zoom-reset"
          onClick={() => setView({ x: 0, y: 0, k: 1 })}
          title="Reset pan & zoom"
        >
          Reset view
        </button>
      </div>

      {selected && (
        <aside className="node-info">
          <div className="node-info-head">
            <span className="node-info-title">{selected.label}</span>
            <span className="node-info-kind">
              {selected.kind}
              {selected.sub && selected.kind !== 'group' ? ` \u00b7 ${selected.sub}` : ''}
            </span>
            <button type="button" className="node-info-close" onClick={() => setSelected(null)} aria-label="Close">
              {'\u00d7'}
            </button>
          </div>
          <div className="node-info-sub">
            {selected.kind === 'routine'
              ? 'Faults that break this routine'
              : 'Faults that can take this offline'}
          </div>
          {faults.length === 0 ? (
            <div className="node-info-empty">Nothing in the chaos suite breaks this today.</div>
          ) : (
            <ul className="fault-list">
              {faults.map((f, i) => (
                <li key={`${f.label}-${f.type}-${i}`}>
                  <span className="fault-name">{f.label}</span>
                  <span className="fault-type">{f.type}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      <div className="legend">
        <span><i className="dot device-dot" /> device</span>
        <span><i className="dot group-dot" /> group</span>
        <span><i className="dot routine-dot" /> routine - green = works, red = broken</span>
        <span>red fill = how easily it breaks</span>
        <span>scroll = zoom · drag background = move around · drag a shape = reposition it · tap a shape = what could break it</span>
      </div>
    </div>
  );
}
