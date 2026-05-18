import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { clsx } from 'clsx';
import TaskCard from '../tasks/TaskCard';
import TaskModal from '../tasks/TaskModal';
import useProjectStore from '../../store/projectStore';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'text-slate-400', accent: '#64748b' },
  { id: 'in_progress', label: 'In Progress', color: 'text-brand-400', accent: '#6366f1' },
  { id: 'review', label: 'Review', color: 'text-violet-400', accent: '#8b5cf6' },
  { id: 'blocked', label: 'Blocked', color: 'text-red-400', accent: '#ef4444' },
  { id: 'done', label: 'Done', color: 'text-emerald-400', accent: '#10b981' }
];

function KanbanBoard({ projectId }) {
  const { tasks, members, dependencies, deleteTask, moveTask } = useProjectStore();
  const { user: currentUser } = useAuthStore();
  const [taskModal, setTaskModal] = useState(null);
  const [dragTask, setDragTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const myMembership = members.find(m => m.users?.id === currentUser?.id);
  const isAdmin = currentUser?.role === 'admin' || myMembership?.role === 'admin';

  // Count unfinished deps per task
  const pendingDepsMap = {};
  for (const dep of dependencies) {
    if (dep.depends_on?.status !== 'done') {
      pendingDepsMap[dep.task_id] = (pendingDepsMap[dep.task_id] || 0) + 1;
    }
  }

  const handleDragStart = (task) => setDragTask(task);
  const memberRestrictedDest = new Set(['blocked', 'done']);

  const handleDragOver = (e, colId) => {
    if (!isAdmin && memberRestrictedDest.has(colId)) return;
    if (!isAdmin && dragTask?.status === 'blocked') return;
    if (!isAdmin && dragTask?.status === 'review') return;
    if (!isAdmin && dragTask?.assignee_id !== currentUser?.id) return;
    e.preventDefault();
    setDragOver(colId);
  };
  const handleDrop = async (colId) => {
    if (!isAdmin && dragTask?.assignee_id !== currentUser?.id) {
      toast.error('Only the assignee can move this task');
      setDragTask(null); setDragOver(null);
      return;
    }
    if (!isAdmin && colId === 'blocked') {
      toast.error('Only admins can mark a task as blocked');
      setDragTask(null); setDragOver(null);
      return;
    }
    if (!isAdmin && colId === 'done') {
      toast.error('Only admins can mark a task as done');
      setDragTask(null); setDragOver(null);
      return;
    }
    if (!isAdmin && dragTask?.status === 'blocked') {
      toast.error('Only admins can unblock a task');
      setDragTask(null); setDragOver(null);
      return;
    }
    if (!isAdmin && dragTask?.status === 'review') {
      toast.error('Only admins can approve or reject a task in review');
      setDragTask(null); setDragOver(null);
      return;
    }
    if (colId === 'in_progress' && dragTask?.status === 'todo' && (pendingDepsMap[dragTask.id] || 0) > 0) {
      const count = pendingDepsMap[dragTask.id];
      toast.error(`Complete ${count} dependenc${count > 1 ? 'ies' : 'y'} before starting this task`);
      setDragTask(null); setDragOver(null);
      return;
    }
    if (dragTask && dragTask.status !== colId) {
      await moveTask(projectId, dragTask.id, colId);
    }
    setDragTask(null);
    setDragOver(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return (
          <div
            key={col.id}
            className={clsx(
              'flex-shrink-0 w-72 flex flex-col rounded-2xl transition-all duration-150',
              dragOver === col.id ? 'bg-surface-elevated ring-1' : 'bg-surface-card'
            )}
            style={dragOver === col.id ? { '--tw-ring-color': col.accent + '40' } : {}}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.accent }} />
                <span className={clsx('text-sm font-semibold', col.color)}>{col.label}</span>
                <span className="text-xs bg-surface-elevated text-slate-500 px-2 py-0.5 rounded-full font-medium">
                  {colTasks.length}
                </span>
                {(col.id === 'blocked' || col.id === 'done') && !isAdmin && (
                  <span className="text-[10px] text-slate-600" title="Admin only">🔒</span>
                )}
              </div>
              {col.id !== 'done' && col.id !== 'blocked' && (
                <button
                  onClick={() => setTaskModal({ mode: 'create', defaultStatus: col.id })}
                  className="p-1.5 rounded-lg hover:bg-surface-elevated text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Plus size={15} />
                </button>
              )}
            </div>

            {/* Tasks */}
            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onDragEnd={() => setDragTask(null)}
                >
                  <TaskCard
                    task={task}
                    isDragging={dragTask?.id === task.id}
                    lockedBy={pendingDepsMap[task.id] || 0}
                    onDelete={id => deleteTask(projectId, id)}
                    onClick={t => setTaskModal({ mode: 'edit', task: t })}
                  />
                </div>
              ))}
              {colTasks.length === 0 && (
                <div
                  className={clsx(
                    'flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed text-sm text-slate-600 transition-colors',
                    dragOver === col.id ? 'border-brand-500/50 text-brand-400/60' : 'border-surface-border'
                  )}
                >
                  {dragOver === col.id ? 'Drop here' : 'No tasks'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {taskModal && (
        <TaskModal
          task={taskModal.mode === 'edit' ? taskModal.task : null}
          projectId={projectId}
          onClose={() => setTaskModal(null)}
          onSave={() => setTaskModal(null)}
        />
      )}
    </div>
  );
}

export default KanbanBoard;
