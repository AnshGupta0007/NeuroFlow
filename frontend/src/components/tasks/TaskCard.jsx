import React, { useState } from 'react';
import { Clock, AlertCircle, MoreVertical, Trash2, Edit2, Timer, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../ui/Avatar';

const PRIORITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400' },
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-400' }
};

function TaskCard({ task, onUpdate, onDelete, onClick, isDragging, lockedBy = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const config = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const dueText = task.due_date
    ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true })
    : null;

  return (
    <div
      className={clsx(
        'bg-surface-elevated border rounded-xl p-4 cursor-pointer group relative',
        'hover:border-brand-500/30 hover:bg-surface-elevated/80 transition-all duration-150',
        isDragging ? 'opacity-50 rotate-2 shadow-2xl' : '',
        isOverdue ? 'border-red-500/30' : 'border-surface-border'
      )}
      onClick={() => onClick?.(task)}
    >
      {/* Priority indicator */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('badge border text-xs', config.bg, config.color)}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
            {task.priority}
          </span>
          {task.energy_type && (
            <span className="badge bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs">
              {task.energy_type === 'deep_work' ? '🧠' : '⚡'} {task.energy_type.replace('_', ' ')}
            </span>
          )}
          {lockedBy > 0 && (
            <span className="badge bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs" title="Has unfinished dependencies">
              🔒 {lockedBy} dep{lockedBy > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded-lg hover:bg-surface-border text-slate-500 hover:text-slate-300"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 bg-surface-card border border-surface-border rounded-xl shadow-xl z-10 py-1 min-w-[130px]">
              <button
                onClick={e => { e.stopPropagation(); onClick?.(task); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-surface-elevated w-full"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete?.(task.id); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <p className={clsx(
        'text-sm font-medium text-slate-200 leading-snug mb-3',
        task.status === 'done' && 'line-through text-slate-500'
      )}>
        {task.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.assignee && <Avatar user={task.assignee} size="xs" />}
          {task.effort_estimate && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Timer size={11} />
              {task.effort_estimate}h
            </span>
          )}
          {task.time_spent > 0 && (
            <span className="flex items-center gap-1 text-xs text-brand-400">
              <Zap size={11} />
              {Math.round(task.time_spent / 60)}h logged
            </span>
          )}
        </div>
        {dueText && (
          <span className={clsx(
            'flex items-center gap-1 text-xs',
            isOverdue ? 'text-red-400' : 'text-slate-500'
          )}>
            {isOverdue && <AlertCircle size={11} />}
            <Clock size={11} />
            {dueText}
          </span>
        )}
      </div>

      {/* Overdue indicator */}
      {isOverdue && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl" />
      )}
    </div>
  );
}

export default TaskCard;
