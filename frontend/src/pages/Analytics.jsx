import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Clock, Zap, TrendingUp, Activity, Star, Loader2,
  Users, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import useIntelligenceStore from '../store/intelligenceStore';
import useAuthStore from '../store/authStore';
import { adminAPI } from '../services/api';
import Avatar from '../components/ui/Avatar';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1e1e2e', border: '1px solid #2a2a3d',
    borderRadius: '10px', color: '#e2e8f0', fontSize: '12px',
  },
  cursor: { fill: 'rgba(99,102,241,0.08)' }
};

function Analytics() {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <AdminAnalytics /> : <MemberAnalytics />;
}

/* ─────────────────────────────────────────────────────────────
   ADMIN VIEW
───────────────────────────────────────────────────────────── */
function AdminAnalytics() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState('productivityScore');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    setLoading(true);
    adminAPI.getTeamStats(period)
      .then(res => setStats(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const sorted = [...stats].sort((a, b) => {
    const va = a[sortBy] ?? -1;
    const vb = b[sortBy] ?? -1;
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  const teamTotal   = stats.reduce((s, m) => s + m.completedTasks, 0);
  const avgScore    = stats.length ? Math.round(stats.reduce((s, m) => s + m.productivityScore, 0) / stats.length) : 0;
  const avgOnTime   = stats.length ? Math.round(stats.reduce((s, m) => s + (100 - m.delayRate), 0) / stats.length) : 0;
  const topPerformer = [...stats].sort((a, b) => b.productivityScore - a.productivityScore)[0];

  if (loading) return <CenteredSpinner />;

  return (
    <div className="p-8 space-y-7 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Team Analytics</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Productivity intelligence across {stats.length} members
          </p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Team Members"
          value={stats.length}
          icon={<Users size={18} className="text-brand-400" />}
          accent="brand"
        />
        <SummaryCard
          label="Avg Productivity"
          value={`${avgScore}/100`}
          icon={<Star size={18} className="text-yellow-400" />}
          accent="yellow"
          sub={avgScore >= 70 ? 'Healthy' : avgScore >= 40 ? 'Moderate' : 'Needs attention'}
          subColor={avgScore >= 70 ? 'text-emerald-400' : avgScore >= 40 ? 'text-yellow-400' : 'text-red-400'}
        />
        <SummaryCard
          label="Tasks Completed"
          value={teamTotal}
          icon={<Activity size={18} className="text-emerald-400" />}
          accent="emerald"
          sub={`last ${period} days`}
          subColor="text-slate-500"
        />
        <SummaryCard
          label="Avg On-Time Rate"
          value={`${avgOnTime}%`}
          icon={<Clock size={18} className="text-violet-400" />}
          accent="violet"
          sub={avgOnTime >= 80 ? 'Excellent' : avgOnTime >= 60 ? 'Good' : 'Needs improvement'}
          subColor={avgOnTime >= 80 ? 'text-emerald-400' : avgOnTime >= 60 ? 'text-yellow-400' : 'text-red-400'}
        />
      </div>

      {/* Leaderboard */}
      <div className="card p-0 overflow-hidden">
        {/* Table head */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_40px] gap-4 px-5 py-3 border-b border-surface-border bg-surface-elevated/40">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Member</span>
          {[
            { key: 'productivityScore', label: 'Score' },
            { key: 'completedTasks', label: 'Tasks' },
            { key: 'delayRate', label: 'On-Time' },
            { key: 'avgSpeedRatio', label: 'Speed' },
          ].map(col => (
            <button
              key={col.key}
              onClick={() => handleSort(col.key)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
            >
              {col.label}
              {sortBy === col.key
                ? sortDir === 'desc' ? <ArrowDown size={10} /> : <ArrowUp size={10} />
                : <Minus size={10} className="opacity-30" />}
            </button>
          ))}
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Trend</span>
          <span />
        </div>

        {sorted.map((s, idx) => {
          const rank = sorted.indexOf(s);
          const isOpen = expanded === s.user.id;
          const onTime = 100 - s.delayRate;

          return (
            <div key={s.user.id} className="border-b border-surface-border last:border-0">
              {/* Row */}
              <button
                className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_40px] gap-4 px-5 py-3.5 hover:bg-surface-elevated/50 transition-colors items-center text-left"
                onClick={() => setExpanded(isOpen ? null : s.user.id)}
              >
                {/* Member */}
                <div className="flex items-center gap-3 min-w-0">
                  <RankBadge rank={rank} />
                  <Avatar user={s.user} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{s.user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{s.user.email}</p>
                  </div>
                </div>

                {/* Score */}
                <div>
                  <span className={clsx('text-sm font-bold',
                    s.productivityScore >= 70 ? 'text-emerald-400' :
                    s.productivityScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {s.productivityScore}
                    <span className="text-xs font-normal text-slate-600">/100</span>
                  </span>
                </div>

                {/* Tasks */}
                <span className="text-sm font-semibold text-slate-300">{s.completedTasks}</span>

                {/* On-Time */}
                <span className={clsx('text-sm font-semibold',
                  onTime >= 80 ? 'text-emerald-400' : onTime >= 60 ? 'text-yellow-400' : 'text-red-400'
                )}>{onTime}%</span>

                {/* Speed */}
                <span className={clsx('text-sm font-semibold',
                  !s.avgSpeedRatio ? 'text-slate-600' :
                  s.avgSpeedRatio <= 1 ? 'text-emerald-400' :
                  s.avgSpeedRatio <= 1.5 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {!s.avgSpeedRatio ? '—' :
                   s.avgSpeedRatio <= 1 ? `${Math.round(s.avgSpeedRatio * 100)}%` :
                   `${s.avgSpeedRatio.toFixed(1)}x`}
                </span>

                {/* Sparkline */}
                <div className="h-8">
                  <Sparkline data={s.trend} />
                </div>

                {/* Chevron */}
                <div className="flex justify-end">
                  {isOpen
                    ? <ChevronUp size={14} className="text-slate-500" />
                    : <ChevronDown size={14} className="text-slate-500" />}
                </div>
              </button>

              {/* Expanded panel */}
              {isOpen && (
                <div className="border-t border-surface-border bg-surface-elevated/20 px-5 py-5 grid grid-cols-3 gap-6">
                  {/* Trend chart */}
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Completion Trend — last {period} days
                    </p>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={s.trend} margin={{ top: 4, right: 0, bottom: 0, left: -28 }}>
                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }}
                          tickFormatter={d => format(new Date(d), 'MMM d')}
                          interval={Math.floor(s.trend.length / 5)} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                          allowDecimals={false} domain={[0, dataMax => Math.max(dataMax, 3)]} />
                        <Tooltip {...TOOLTIP_STYLE}
                          formatter={v => [v, 'Tasks']}
                          labelFormatter={d => format(new Date(d), 'MMM d, yyyy')} />
                        <Bar dataKey="tasksCompleted" radius={[3, 3, 0, 0]} maxBarSize={18}>
                          {s.trend.map((d, i) => (
                            <Cell key={i}
                              fill={d.tasksCompleted > 0 ? '#6366f1' : '#2a2a3d'}
                              opacity={d.tasksCompleted > 0 ? 1 : 0.4} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* DNA + insights */}
                  <div className="space-y-4">
                    {s.dnaProfile && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                          Productivity DNA
                        </p>
                        <div className="space-y-2">
                          {Object.entries(s.dnaProfile).map(([key, val]) => (
                            <div key={key}>
                              <div className="flex justify-between text-[11px] mb-0.5">
                                <span className="text-slate-500 capitalize">{key}</span>
                                <span className={clsx('font-medium',
                                  val >= 70 ? 'text-emerald-400' :
                                  val >= 40 ? 'text-yellow-400' : 'text-red-400'
                                )}>{val}%</span>
                              </div>
                              <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                                <div
                                  className={clsx('h-full rounded-full transition-all duration-700',
                                    val >= 70 ? 'bg-gradient-to-r from-emerald-500 to-brand-500' :
                                    val >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                    'bg-red-500'
                                  )}
                                  style={{ width: `${val}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.peakHours?.length > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Peak hours: <span className="text-slate-300">{s.peakHours.join(', ')}</span>
                      </p>
                    )}
                    {s.insights?.length > 0 && (
                      <div className="space-y-2">
                        {s.insights.slice(0, 3).map((ins, i) => (
                          <div key={i} className={clsx('flex items-start gap-2 p-2 rounded-lg border text-[11px]',
                            ins.severity === 'success' ? 'bg-emerald-500/8 border-emerald-500/15 text-emerald-300' :
                            ins.severity === 'warning' ? 'bg-yellow-500/8 border-yellow-500/15 text-yellow-300' :
                            'bg-brand-500/8 border-brand-500/15 text-brand-300'
                          )}>
                            <span className="flex-shrink-0">
                              {ins.type === 'peak_hours' ? '🕐' : ins.type === 'speed' ? '⚡' :
                               ins.type === 'punctuality' ? '⭐' : ins.type === 'last_minute' ? '🔥' : '💡'}
                            </span>
                            {ins.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MEMBER VIEW
───────────────────────────────────────────────────────────── */
function MemberAnalytics() {
  const { productivity, fetchProductivity, isLoading } = useIntelligenceStore();
  const [period, setPeriod] = useState(30);

  useEffect(() => { fetchProductivity(period); }, [period]);

  if (isLoading && !productivity) return <CenteredSpinner />;

  const p = productivity;
  if (!p) return null;

  const onTime = p.completedTasks === 0 ? null : 100 - (p.delayRate || 0);
  const scoreColor = p.productivityScore >= 70 ? 'text-emerald-400' :
                     p.productivityScore >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="p-8 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Analytics</h1>
          <p className="text-slate-500 mt-1 text-sm">Your personal productivity intelligence</p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {/* Score strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-violet-600/5 pointer-events-none" />
          <p className="text-xs text-slate-500 mb-1">Productivity Score</p>
          <p className={clsx('text-4xl font-bold', scoreColor)}>
            {p.productivityScore}
            <span className="text-base font-normal text-slate-600">/100</span>
          </p>
          <ScoreBar value={p.productivityScore} />
        </div>

        <MetricCard
          label="Tasks Completed"
          value={p.completedTasks}
          sub={`last ${period} days`}
          color="text-emerald-400"
          icon={<Activity size={16} className="text-emerald-400" />}
        />
        <MetricCard
          label="On-Time Rate"
          value={onTime == null ? 'N/A' : `${onTime}%`}
          sub={onTime == null ? 'no tasks yet' : onTime >= 80 ? 'Excellent' : onTime >= 60 ? 'Good' : 'Needs work'}
          color={onTime == null ? 'text-slate-500' : onTime >= 80 ? 'text-emerald-400' : onTime >= 60 ? 'text-yellow-400' : 'text-red-400'}
          icon={<Clock size={16} className={onTime == null ? 'text-slate-600' : onTime >= 80 ? 'text-emerald-400' : 'text-yellow-400'} />}
        />
        <MetricCard
          label="Speed Ratio"
          value={!p.avgSpeedRatio ? 'N/A' : p.avgSpeedRatio <= 1 ? `${Math.round(p.avgSpeedRatio * 100)}%` : `${p.avgSpeedRatio.toFixed(1)}x`}
          sub={!p.avgSpeedRatio ? 'log time to track' : p.avgSpeedRatio <= 1 ? 'faster than estimate' : 'slower than estimate'}
          color={!p.avgSpeedRatio ? 'text-slate-500' : p.avgSpeedRatio <= 1 ? 'text-emerald-400' : p.avgSpeedRatio <= 1.5 ? 'text-yellow-400' : 'text-red-400'}
          icon={<Zap size={16} className="text-brand-400" />}
        />
      </div>

      {/* Trend + DNA */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 card">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400" />
            Completion Trend
            <span className="ml-auto text-xs text-slate-600 font-normal">{period}-day period</span>
          </h3>
          {p.completedTasks === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600">
              <Activity size={28} className="mb-2 opacity-30" />
              <p className="text-sm">No completed tasks in this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={p.trend} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={d => format(new Date(d), 'MMM d')}
                  interval={Math.floor(p.trend.length / 5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                  allowDecimals={false} domain={[0, dataMax => Math.max(dataMax, 3)]} />
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={v => [v, 'Tasks']}
                  labelFormatter={d => format(new Date(d), 'MMM d, yyyy')} />
                <Bar dataKey="tasksCompleted" radius={[4, 4, 0, 0]} maxBarSize={20}>
                  {p.trend.map((d, i) => (
                    <Cell key={i}
                      fill={d.tasksCompleted > 0 ? '#6366f1' : '#2a2a3d'}
                      opacity={d.tasksCompleted > 0 ? 1 : 0.5} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-4">
          {/* DNA */}
          <div className="card">
            <h3 className="font-semibold text-slate-200 mb-3 text-sm">Productivity DNA</h3>
            <div className="space-y-2.5">
              {p.dnaProfile && Object.entries(p.dnaProfile).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 capitalize">{key}</span>
                    <span className={clsx('font-semibold',
                      val >= 70 ? 'text-emerald-400' : val >= 40 ? 'text-yellow-400' : 'text-red-400'
                    )}>{val}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700',
                        val >= 70 ? 'bg-gradient-to-r from-emerald-500 to-brand-500' :
                        val >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-red-500'
                      )}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak hours */}
          {p.peakHours?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-slate-200 mb-3 text-sm flex items-center gap-2">
                <Star size={13} className="text-yellow-400" /> Peak Hours
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {p.peakHours.map((h, i) => (
                  <span key={i} className="badge bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[11px] py-1">
                    ⏰ {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      {p.insights?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Zap size={16} className="text-brand-400" />
            Behavioral Insights
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {p.insights.map((ins, i) => (
              <div key={i} className={clsx(
                'flex items-start gap-3 p-3.5 rounded-xl border',
                ins.severity === 'success' ? 'bg-emerald-500/8 border-emerald-500/15' :
                ins.severity === 'warning' ? 'bg-yellow-500/8 border-yellow-500/15' :
                'bg-brand-500/8 border-brand-500/15'
              )}>
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {ins.type === 'peak_hours' ? '🕐' : ins.type === 'speed' ? '⚡' :
                   ins.type === 'last_minute' ? '🔥' : ins.type === 'punctuality' ? '⭐' : '💡'}
                </span>
                <p className={clsx('text-sm leading-relaxed',
                  ins.severity === 'success' ? 'text-emerald-300' :
                  ins.severity === 'warning' ? 'text-yellow-300' : 'text-brand-300'
                )}>{ins.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────────────────────── */

function PeriodSelector({ period, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-surface-elevated border border-surface-border rounded-xl p-1">
      {[7, 14, 30, 90].map(d => (
        <button key={d} onClick={() => onChange(d)}
          className={clsx('px-3 py-1 rounded-lg text-xs font-medium transition-all',
            period === d ? 'bg-brand-600/30 text-brand-400' : 'text-slate-500 hover:text-slate-300'
          )}>{d}d</button>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, icon, accent, sub, subColor }) {
  const accents = {
    brand: 'from-brand-500/10 to-brand-500/5',
    yellow: 'from-yellow-500/10 to-yellow-500/5',
    emerald: 'from-emerald-500/10 to-emerald-500/5',
    violet: 'from-violet-500/10 to-violet-500/5',
  };
  return (
    <div className={clsx('card relative overflow-hidden')}>
      <div className={clsx('absolute inset-0 bg-gradient-to-br pointer-events-none', accents[accent])} />
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className={clsx('text-xs mt-1', subColor)}>{sub}</p>}
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-slate-500">{label}</span></div>
      <p className={clsx('text-3xl font-bold', color)}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

function ScoreBar({ value }) {
  const color = value >= 70 ? 'from-emerald-500 to-brand-500' :
                value >= 40 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-red-400';
  return (
    <div className="h-1 bg-surface-border rounded-full overflow-hidden mt-3">
      <div className={clsx('h-full bg-gradient-to-r rounded-full transition-all duration-1000', color)}
        style={{ width: `${value}%` }} />
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 0) return <span className="text-base w-6 text-center flex-shrink-0">🥇</span>;
  if (rank === 1) return <span className="text-base w-6 text-center flex-shrink-0">🥈</span>;
  if (rank === 2) return <span className="text-base w-6 text-center flex-shrink-0">🥉</span>;
  return <span className="text-xs text-slate-600 w-6 text-center flex-shrink-0 font-mono">#{rank + 1}</span>;
}

function Sparkline({ data }) {
  const max = Math.max(...data.map(d => d.tasksCompleted), 1);
  const recent = data.slice(-14);
  return (
    <div className="flex items-end gap-px h-full w-full">
      {recent.map((d, i) => (
        <div key={i}
          className={clsx('flex-1 rounded-sm transition-all', d.tasksCompleted > 0 ? 'bg-brand-500' : 'bg-surface-border')}
          style={{ height: `${d.tasksCompleted > 0 ? Math.max((d.tasksCompleted / max) * 100, 20) : 15}%` }}
        />
      ))}
    </div>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={28} className="text-brand-400 animate-spin" />
    </div>
  );
}

export default Analytics;
