import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Users, ArrowRight, Zap } from 'lucide-react';
import Avatar from '../ui/Avatar';

const STATUS_COLORS = {
  overloaded: '#ef4444',
  heavy: '#f59e0b',
  balanced: '#6366f1',
  light: '#10b981'
};

function WorkloadChart({ workload }) {
  if (!workload) return null;

  const chartData = workload.members.map(m => ({
    name: m.user?.name?.split(' ')[0] || 'Unknown',
    score: m.workloadScore,
    tasks: m.taskCount,
    status: m.status,
    user: m.user
  }));

  return (
    <div className="space-y-4">
      {/* Balance score */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Users size={17} className="text-brand-400" />
            Workload Distribution
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Balance Score</span>
            <span className={`font-bold text-lg ${workload.balanceScore > 70 ? 'text-emerald-400' : workload.balanceScore > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {workload.balanceScore}%
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: '#1e1e2e', border: '1px solid #2a2a3d',
                borderRadius: '10px', color: '#e2e8f0', fontSize: '12px'
              }}
              formatter={(v, n, p) => [`${v} (${p.payload.tasks} tasks)`, 'Workload Score']}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={STATUS_COLORS[d.status] || '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Member status list */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {workload.members.map(m => (
            <div key={m.user?.id} className="flex items-center justify-between p-2.5 bg-surface-elevated border border-surface-border rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar user={m.user} size="xs" />
                <span className="text-xs text-slate-300 truncate">{m.user?.name?.split(' ')[0]}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">{m.taskCount}t</span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize"
                  style={{ color: STATUS_COLORS[m.status], background: STATUS_COLORS[m.status] + '20' }}
                >
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rebalancing suggestions */}
      {workload.suggestions?.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Zap size={15} className="text-brand-400" />
            Rebalancing Suggestions
          </h4>
          <div className="space-y-2">
            {workload.suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-brand-500/8 border border-brand-500/20 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">
                    Move <span className="text-slate-200 font-medium">"{s.taskTitle}"</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                    <span className="text-slate-400">{s.fromUserName}</span>
                    <ArrowRight size={10} />
                    <span className="text-slate-400">{s.toUserName}</span>
                  </div>
                </div>
                <span className="badge bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex-shrink-0 text-[10px]">
                  -{s.estimatedDelayReduction}% delay
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkloadChart;
