import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ArrowLeft, GitBranch, Info } from 'lucide-react';
import useProjectStore from '../../store/projectStore';

const STATUS_CONFIG = {
  todo:        { color: '#94a3b8', label: 'To Do',       dot: 'bg-slate-400' },
  in_progress: { color: '#6366f1', label: 'In Progress', dot: 'bg-brand-400' },
  review:      { color: '#8b5cf6', label: 'Review',      dot: 'bg-violet-400' },
  done:        { color: '#10b981', label: 'Done',         dot: 'bg-emerald-400' },
  blocked:     { color: '#ef4444', label: 'Blocked',      dot: 'bg-red-400' },
};

const PRIORITY_COLOR = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#6366f1',
  low:      '#64748b',
};

const NODE_W = 200;
const NODE_H = 70;
const COL_GAP = 100;
const ROW_GAP = 24;
const PAD = 40;

function buildLevels(tasks, dependencies) {
  const incomingCount = {};
  const outgoing = {};
  const taskMap = {};

  for (const t of tasks) {
    taskMap[t.id] = t;
    incomingCount[t.id] = 0;
    outgoing[t.id] = [];
  }

  for (const dep of dependencies) {
    // dep.depends_on_task_id → dep.task_id  (A must finish before B)
    if (!taskMap[dep.depends_on_task_id] || !taskMap[dep.task_id]) continue;
    incomingCount[dep.task_id] = (incomingCount[dep.task_id] || 0) + 1;
    outgoing[dep.depends_on_task_id].push(dep.task_id);
  }

  // BFS to assign levels
  const level = {};
  const queue = tasks.filter(t => incomingCount[t.id] === 0).map(t => t.id);
  for (const id of queue) level[id] = 0;

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const next of outgoing[cur]) {
      level[next] = Math.max(level[next] ?? 0, (level[cur] ?? 0) + 1);
      queue.push(next);
    }
  }

  // Tasks not reached → level 0
  for (const t of tasks) {
    if (level[t.id] == null) level[t.id] = 0;
  }

  // Group by level
  const cols = {};
  for (const t of tasks) {
    const l = level[t.id];
    if (!cols[l]) cols[l] = [];
    cols[l].push(t);
  }

  return { cols, level, outgoing };
}

function DependencyGraph({ onBack }) {
  const { tasks, dependencies } = useProjectStore();
  const [hovered, setHovered] = useState(null);

  const { nodes, edges, svgWidth, svgHeight } = useMemo(() => {
    if (!tasks.length) return { nodes: [], edges: [], svgWidth: 400, svgHeight: 200 };

    const { cols, level, outgoing } = buildLevels(tasks, dependencies);
    const colNums = Object.keys(cols).map(Number).sort((a, b) => a - b);
    const maxRows = Math.max(...colNums.map(c => cols[c].length));

    // Position nodes
    const nodeMap = {};
    const nodes = [];
    for (const col of colNums) {
      const items = cols[col];
      const colH = items.length * (NODE_H + ROW_GAP) - ROW_GAP;
      const totalH = maxRows * (NODE_H + ROW_GAP) - ROW_GAP;
      const startY = PAD + (totalH - colH) / 2;

      items.forEach((task, row) => {
        const x = PAD + col * (NODE_W + COL_GAP);
        const y = startY + row * (NODE_H + ROW_GAP);
        const node = { id: task.id, task, x, y };
        nodeMap[task.id] = node;
        nodes.push(node);
      });
    }

    // Build edges from dependencies
    const edges = [];
    for (const dep of dependencies) {
      const from = nodeMap[dep.depends_on_task_id];
      const to = nodeMap[dep.task_id];
      if (!from || !to) continue;
      edges.push({
        id: `${dep.depends_on_task_id}-${dep.task_id}`,
        from, to,
        blocked: to.task.status === 'blocked'
      });
    }

    const svgWidth = PAD * 2 + colNums.length * NODE_W + (colNums.length - 1) * COL_GAP;
    const svgHeight = PAD * 2 + maxRows * (NODE_H + ROW_GAP) - ROW_GAP;

    return { nodes, edges, svgWidth: Math.max(svgWidth, 400), svgHeight: Math.max(svgHeight, 200) };
  }, [tasks, dependencies]);

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <GitBranch size={32} className="opacity-30" />
        <p>No tasks to show in dependency graph</p>
      </div>
    );
  }

  const hasDeps = dependencies.length > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="btn-secondary text-sm">
            <ArrowLeft size={14} /> Back to Board
          </button>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-surface-elevated border border-surface-border rounded-xl px-3 py-2">
          <Info size={12} />
          {hasDeps
            ? 'Arrows show task dependencies — left side must finish before right side'
            : 'No dependencies set yet. Add them by editing tasks.'}
        </div>
      </div>

      {/* Graph */}
      <div className="overflow-auto border border-surface-border rounded-2xl bg-surface-card">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block"
          style={{ minWidth: '100%' }}
        >
          <defs>
            <marker id="arrow-normal" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" opacity="0.7" />
            </marker>
            <marker id="arrow-blocked" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" opacity="0.8" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map(edge => {
            const sx = edge.from.x + NODE_W;
            const sy = edge.from.y + NODE_H / 2;
            const tx = edge.to.x;
            const ty = edge.to.y + NODE_H / 2;
            const mx = (sx + tx) / 2;
            const isHovered = hovered === edge.from.id || hovered === edge.to.id;

            return (
              <path
                key={edge.id}
                d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`}
                stroke={edge.blocked ? '#ef4444' : '#6366f1'}
                strokeWidth={isHovered ? 2 : 1.5}
                strokeOpacity={isHovered ? 0.9 : edge.blocked ? 0.7 : 0.4}
                strokeDasharray={edge.blocked ? '5 3' : 'none'}
                fill="none"
                markerEnd={`url(#arrow-${edge.blocked ? 'blocked' : 'normal'})`}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const { task, x, y } = node;
            const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
            const priorityColor = PRIORITY_COLOR[task.priority] || '#64748b';
            const isDone = task.status === 'done';
            const isBlocked = task.status === 'blocked';
            const isHov = hovered === task.id;

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setHovered(task.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Shadow */}
                {isHov && (
                  <rect x={-2} y={-2} width={NODE_W + 4} height={NODE_H + 4}
                    rx={13} fill={status.color} fillOpacity={0.12} />
                )}

                {/* Card */}
                <rect
                  width={NODE_W} height={NODE_H} rx={11}
                  fill="#1e1e2e"
                  stroke={isBlocked ? '#ef4444' : isHov ? status.color : '#2a2a3d'}
                  strokeWidth={isBlocked || isHov ? 1.5 : 1}
                  strokeOpacity={isDone ? 0.4 : 1}
                />

                {/* Status bar (left edge) */}
                <rect x={0} y={8} width={3} height={NODE_H - 16} rx={2}
                  fill={status.color} opacity={isDone ? 0.4 : 0.9} />

                {/* Priority dot (top right) */}
                <circle cx={NODE_W - 12} cy={14} r={4}
                  fill={priorityColor} opacity={0.85} />

                {/* Title */}
                <text x={14} y={24} fill={isDone ? '#64748b' : '#e2e8f0'}
                  fontSize={11} fontWeight="600" fontFamily="Inter, sans-serif">
                  {task.title.length > 22 ? task.title.slice(0, 22) + '…' : task.title}
                </text>

                {/* Status pill */}
                <rect x={14} y={33} width={70} height={17} rx={8}
                  fill={status.color + '22'} />
                <text x={49} y={45} fill={status.color} fontSize={9}
                  textAnchor="middle" fontWeight="600" fontFamily="Inter, sans-serif">
                  {status.label}
                </text>

                {/* Assignee or effort */}
                {task.effort_estimate && (
                  <text x={14} y={62} fill="#64748b" fontSize={9} fontFamily="Inter, sans-serif">
                    ⏱ {task.effort_estimate}h
                  </text>
                )}
                {task.assignee?.name && (
                  <text x={NODE_W - 14} y={62} fill="#64748b" fontSize={9}
                    textAnchor="end" fontFamily="Inter, sans-serif">
                    {task.assignee.name.split(' ')[0]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-5 px-5 py-3 border-t border-surface-border flex-wrap bg-surface-elevated/30">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[11px] text-slate-500">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-6 h-px border-t border-dashed border-red-400" />
            <span className="text-[11px] text-slate-500">Blocked path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-px bg-brand-400 opacity-50" />
            <span className="text-[11px] text-slate-500">Dependency</span>
          </div>
        </div>
      </div>

      {/* Priority key */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-[11px] text-slate-600">Priority dots:</span>
        {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
            <span className="text-[11px] text-slate-500 capitalize">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DependencyGraph;
