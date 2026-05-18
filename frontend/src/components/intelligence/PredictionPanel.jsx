import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Users, GitBranch, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import RiskMeter from '../ui/RiskMeter';
import useProjectStore from '../../store/projectStore';

function PredictionPanel({ intelligence }) {
  const { tasks } = useProjectStore();
  if (!intelligence) return null;
  const { prediction, blockedTasks, timeDrift, criticalPath } = intelligence;

  const taskById = Object.fromEntries(tasks.map(t => [t.id, t]));

  return (
    <div className="space-y-4">
      {/* Main prediction card */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <TrendingUp size={17} className="text-brand-400" />
            Deadline Prediction
          </h3>
          <span className="text-xs text-slate-500">
            {format(new Date(), 'MMM d, yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-8">
          <RiskMeter value={prediction.delayRisk} size="lg" />

          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Predicted Completion"
                value={format(new Date(prediction.predictedEndDate), 'MMM d, yyyy')}
                icon={<Clock size={14} className="text-brand-400" />}
              />
              {prediction.daysUntilDeadline !== null && (
                <Stat
                  label="Days Until Deadline"
                  value={`${prediction.daysUntilDeadline}d`}
                  icon={<AlertTriangle size={14} className={prediction.daysUntilDeadline < 7 ? 'text-red-400' : 'text-yellow-400'} />}
                  highlight={prediction.daysUntilDeadline < 7}
                />
              )}
              <Stat
                label="Progress"
                value={`${prediction.completionPercentage}%`}
                icon={<TrendingUp size={14} className="text-emerald-400" />}
              />
              <Stat
                label="Tasks Remaining"
                value={prediction.pendingTasks}
                icon={<GitBranch size={14} className="text-violet-400" />}
              />
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{prediction.completedTasks} completed</span>
                <span>{prediction.totalTasks} total</span>
              </div>
              <div className="h-2 bg-surface-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-violet-500 rounded-full transition-all duration-1000"
                  style={{ width: `${prediction.completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk factors */}
      {prediction.riskFactors?.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-orange-400" />
            Risk Factors
          </h4>
          <div className="space-y-2">
            {prediction.riskFactors.map((rf, i) => (
              <div key={i} className={clsx(
                'flex items-start gap-3 p-3 rounded-xl border',
                rf.severity === 'high'
                  ? 'bg-red-500/8 border-red-500/20'
                  : 'bg-yellow-500/8 border-yellow-500/20'
              )}>
                <div className={clsx(
                  'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                  rf.severity === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                )} />
                <p className={clsx(
                  'text-sm',
                  rf.severity === 'high' ? 'text-red-300' : 'text-yellow-300'
                )}>
                  {rf.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {prediction.bottlenecks?.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Users size={15} className="text-orange-400" />
            Bottlenecks Detected
          </h4>
          <div className="space-y-2">
            {prediction.bottlenecks.map((b, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-orange-500/8 border border-orange-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 text-sm font-bold">
                    {b.userName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{b.userName}</p>
                    <p className="text-xs text-slate-500">Blocking {b.blockingTaskCount} tasks</p>
                  </div>
                </div>
                <span className="badge bg-orange-500/20 text-orange-400 border-orange-500/30">
                  ⚠️ Bottleneck
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time drift */}
      {timeDrift?.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Clock size={15} className="text-yellow-400" />
            Time Drift Detected
          </h4>
          <div className="space-y-2">
            {timeDrift.slice(0, 3).map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{d.task.title}</p>
                  <p className="text-xs text-yellow-400 mt-0.5">{d.message}</p>
                </div>
                <span className="badge bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-3 flex-shrink-0">
                  +{d.driftDays}d drift
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical path */}
      {criticalPath?.taskIds?.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <GitBranch size={15} className="text-brand-400" />
            Critical Path
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            {criticalPath.taskIds.length} tasks on critical path — {criticalPath.duration}h total duration
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {criticalPath.taskIds.slice(0, 6).map((id, i) => {
              const task = taskById[id];
              const label = task?.title
                ? (task.title.length > 20 ? task.title.slice(0, 20) + '…' : task.title)
                : `#${i + 1}`;
              return (
                <React.Fragment key={id}>
                  <span className="text-xs bg-brand-500/15 text-brand-400 border border-brand-500/25 px-2.5 py-1 rounded-full">
                    {label}
                  </span>
                  {i < criticalPath.taskIds.length - 1 && i < 5 && (
                    <span className="text-slate-600 text-xs">→</span>
                  )}
                </React.Fragment>
              );
            })}
            {criticalPath.taskIds.length > 6 && (
              <span className="text-xs text-slate-500">+{criticalPath.taskIds.length - 6} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, highlight }) {
  return (
    <div className={clsx(
      'p-3 rounded-xl border',
      highlight ? 'bg-red-500/8 border-red-500/20' : 'bg-surface-elevated border-surface-border'
    )}>
      <div className="flex items-center gap-1.5 mb-1">{icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className={clsx(
        'font-semibold text-lg',
        highlight ? 'text-red-400' : 'text-slate-200'
      )}>
        {value}
      </p>
    </div>
  );
}

export default PredictionPanel;
