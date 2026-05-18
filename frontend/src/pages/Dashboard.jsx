import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Folder, Zap, Activity, ArrowRight, Star
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import useIntelligenceStore from '../store/intelligenceStore';
import useAuthStore from '../store/authStore';
import RiskMeter from '../components/ui/RiskMeter';

function Dashboard() {
  const { user } = useAuthStore();
  const { dashboard, fetchDashboard, isLoading } = useIntelligenceStore();
  const navigate = useNavigate();

  useEffect(() => { fetchDashboard(); }, []);

  if (isLoading && !dashboard) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">Loading intelligence data...</p>
        </div>
      </div>
    );
  }

  const d = dashboard;

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            {format(new Date(), 'EEEE, MMMM d')} · Here's your intelligence briefing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="badge bg-emerald-500/20 text-emerald-400 border-emerald-500/30 py-1.5 px-3">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            System Active
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {d?.isAdmin ? (
          <>
            <StatCard icon={<Folder size={18} className="text-brand-400" />}    label="Total Projects"  value={d?.overview?.totalProjects || 0}      accent="brand" />
            <StatCard icon={<Clock size={18} className="text-violet-400" />}    label="Pending Tasks"   value={d?.overview?.totalPendingTasks || 0}  accent="violet" />
            <StatCard icon={<AlertTriangle size={18} className="text-red-400" />} label="Overdue (Team)" value={d?.overview?.overdueCount || 0}       accent="red" urgent={d?.overview?.overdueCount > 0} />
            <StatCard icon={<CheckCircle2 size={18} className="text-emerald-400" />} label="Team Members" value={d?.overview?.totalMembers || 0}     accent="emerald" />
          </>
        ) : (
          <>
            <StatCard icon={<Folder size={18} className="text-brand-400" />}    label="My Projects"    value={d?.overview?.totalProjects || 0}      accent="brand" />
            <StatCard icon={<Clock size={18} className="text-violet-400" />}    label="Pending Tasks"  value={d?.overview?.totalPendingTasks || 0}  accent="violet" />
            <StatCard icon={<AlertTriangle size={18} className="text-red-400" />} label="Overdue"      value={d?.overview?.overdueCount || 0}       accent="red" urgent={d?.overview?.overdueCount > 0} />
            <StatCard icon={<CheckCircle2 size={18} className="text-emerald-400" />} label="Due Today"  value={d?.overview?.todayCount || 0}        accent="emerald" />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Productivity score + activity */}
        <div className="col-span-2 space-y-6">
          {/* Activity chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Activity size={17} className="text-brand-400" />
                  {d?.isAdmin ? 'Team Completion Activity' : 'Task Completion Activity'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Last 30 days</p>
              </div>
              {!d?.isAdmin && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand-400">
                    {d?.productivityScore || 0}
                  </div>
                  <div className="text-xs text-slate-500">productivity score</div>
                </div>
              )}
              {d?.isAdmin && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand-400">
                    {d?.overview?.totalPendingTasks || 0}
                  </div>
                  <div className="text-xs text-slate-500">team tasks pending</div>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={d?.weeklyActivity || []}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={d => format(new Date(d), 'MMM d')}
                  interval={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#1e1e2e', border: '1px solid #2a2a3d',
                    borderRadius: '10px', color: '#e2e8f0', fontSize: '12px'
                  }}
                  formatter={v => [v, 'Tasks completed']}
                  labelFormatter={d => format(new Date(d), 'MMM d, yyyy')}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#activityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          {d?.insights?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Zap size={17} className="text-brand-400" />
                {d?.isAdmin ? 'Team Health Insights' : 'Behavioral Insights'}
              </h2>
              <div className="space-y-3">
                {d.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Project risks */}
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp size={17} className="text-orange-400" />
              Project Risks
            </h2>
            {(d?.projectRisks?.length || 0) === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">All projects on track!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {d.projectRisks.slice(0, 3).map(risk => (
                  <div
                    key={risk.projectId}
                    className="p-3 bg-surface-elevated border border-surface-border rounded-xl cursor-pointer hover:border-brand-500/30 transition-all"
                    onClick={() => navigate(`/projects/${risk.projectId}/intelligence`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-200 truncate flex-1">
                        {risk.projectName}
                      </p>
                      <ArrowRight size={13} className="text-slate-500 flex-shrink-0 ml-2" />
                    </div>
                    <div className="flex items-center gap-3">
                      <RiskMeter value={risk.delayRisk} size="sm" showLabel={false} />
                      <div>
                        <p className="text-xs text-slate-400">{risk.delayRisk}% delay risk</p>
                        <p className="text-xs text-slate-600">{risk.pendingTasks} tasks pending</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Peak hours */}
          {d?.peakHours?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Star size={17} className="text-yellow-400" />
                Peak Hours
              </h2>
              <div className="flex flex-wrap gap-2">
                {d.peakHours.map((h, i) => (
                  <span key={i} className="badge bg-yellow-500/15 text-yellow-400 border-yellow-500/25 text-xs py-1 px-2.5">
                    ⏰ {h}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-3">
                Schedule deep work tasks during these hours for maximum impact
              </p>
            </div>
          )}

          {/* Overdue tasks */}
          {d?.overdueTasks?.length > 0 && (
            <div className="card border-red-500/20 bg-red-500/5">
              <h2 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={17} />
                {d.overdueTasks.length} Overdue Tasks
              </h2>
              <div className="space-y-2">
                {d.overdueTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-2 p-2 bg-red-500/8 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                    <p className="text-xs text-red-300 truncate flex-1">{t.title || 'Untitled'}</p>
                    <span className="badge-critical text-[10px]">{t.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent, urgent }) {
  const colors = {
    brand: 'bg-brand-500/10 border-brand-500/20',
    violet: 'bg-violet-500/10 border-violet-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20'
  };
  return (
    <div className={clsx('card border', colors[accent], urgent && 'ring-1 ring-red-500/30')}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-surface-elevated rounded-xl">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-100">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }) {
  const severityConfig = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
    info: 'bg-brand-500/10 border-brand-500/20 text-brand-300'
  };
  return (
    <div className={clsx('flex items-start gap-3 p-3 rounded-xl border', severityConfig[insight.severity] || severityConfig.info)}>
      <span className="text-base flex-shrink-0">{
        insight.type === 'peak_hours' ? '🕐' :
        insight.type === 'speed' ? '⚡' :
        insight.type === 'last_minute' ? '🔥' :
        insight.type === 'punctuality' ? '⭐' :
        '💡'
      }</span>
      <p className="text-sm leading-relaxed">{insight.message}</p>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default Dashboard;
