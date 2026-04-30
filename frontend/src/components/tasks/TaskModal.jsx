import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Modal from '../ui/Modal';
import useProjectStore from '../../store/projectStore';
import useAuthStore from '../../store/authStore';

const ALL_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const ENERGY_TYPES = [{ value: '', label: 'Not specified' }, { value: 'deep_work', label: '🧠 Deep Work' }, { value: 'shallow_work', label: '⚡ Shallow Work' }];

function TaskModal({ task, projectId, onClose, onSave }) {
  const { members, tasks, dependencies, createTask, updateTask, addDependency, removeDependency } = useProjectStore();
  const { user: currentUser } = useAuthStore();

  const myMembership = members.find(m => m.users?.id === currentUser?.id);
  const isAdmin = currentUser?.role === 'admin' || myMembership?.role === 'admin';
  const taskInReview = task?.status === 'review';
  const isAssignee = task?.assignee_id === currentUser?.id;
  const canChangeStatus = isAdmin || isAssignee;
  const STATUSES = isAdmin
    ? ALL_STATUSES
    : ALL_STATUSES.filter(s => s !== 'blocked' && s !== 'done');
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    energy_type: '',
    effort_estimate: '',
    due_date: '',
    assignee_id: '',
    status: 'todo',
    project_id: projectId
  });
  const [saving, setSaving] = useState(false);
  const [depLoading, setDepLoading] = useState(false);

  // Dependencies for this task
  const myDeps = task ? dependencies.filter(d => d.task_id === task.id) : [];
  const myDepIds = new Set(myDeps.map(d => d.depends_on_task_id));
  const availableForDep = tasks.filter(t => t.id !== task?.id && !myDepIds.has(t.id));
  const allDepsDone = myDeps.every(d => d.depends_on?.status === 'done');

  const handleAddDep = async (dependsOnTaskId) => {
    if (!dependsOnTaskId || depLoading) return;
    setDepLoading(true);
    try { await addDependency(projectId, task.id, dependsOnTaskId); }
    finally { setDepLoading(false); }
  };

  const handleRemoveDep = async (dependsOnTaskId) => {
    setDepLoading(true);
    try { await removeDependency(projectId, task.id, dependsOnTaskId); }
    finally { setDepLoading(false); }
  };

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        energy_type: task.energy_type || '',
        effort_estimate: task.effort_estimate || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        assignee_id: task.assignee_id || '',
        status: task.status || 'todo',
        project_id: projectId
      });
    }
  }, [task, projectId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        effort_estimate: form.effort_estimate ? parseFloat(form.effort_estimate) : undefined,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        assignee_id: form.assignee_id || null,
        energy_type: form.energy_type || undefined
      };

      let result;
      if (task) {
        result = await updateTask(projectId, task.id, data);
      } else {
        result = await createTask(projectId, data);
      }
      onSave?.(result);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={task ? 'Edit Task' : 'Create Task'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Title *</label>
          <input
            className="input"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="What needs to be done?"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Add more context..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Priority</label>
            <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          {task && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Status
                {taskInReview && !isAdmin && <span className="ml-1 text-[10px] text-yellow-500">🔒 awaiting admin review</span>}
                {!canChangeStatus && !taskInReview && <span className="ml-1 text-[10px] text-slate-600">🔒 assignee only</span>}
              </label>
              <select
                className="input"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                disabled={!canChangeStatus || (taskInReview && !isAdmin)}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Energy Type</label>
            <select className="input" value={form.energy_type} onChange={e => set('energy_type', e.target.value)}>
              {ENERGY_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Effort Estimate (hours)</label>
            <input
              type="number"
              className="input"
              value={form.effort_estimate}
              onChange={e => set('effort_estimate', e.target.value)}
              placeholder="e.g. 8"
              min="0.5"
              step="0.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Assignee</label>
            <select className="input" value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)}>
              <option value="">Unassigned</option>
              {members.map(m => m.users && (
                <option key={m.users.id} value={m.users.id}>{m.users.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Due Date</label>
            <input
              type="date"
              className="input"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
            />
          </div>
        </div>

        {/* Dependency section — edit mode only */}
        {task && (
          <div className="border-t border-surface-border pt-4">
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Depends On
              {myDeps.length > 0 && !allDepsDone && (
                <span className="ml-2 text-[10px] text-red-400">🔒 blocked — finish dependencies first</span>
              )}
              {myDeps.length > 0 && allDepsDone && (
                <span className="ml-2 text-[10px] text-emerald-400">✓ all dependencies done</span>
              )}
            </label>

            {myDeps.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {myDeps.map(dep => {
                  const done = dep.depends_on?.status === 'done';
                  return (
                    <span
                      key={dep.depends_on_task_id}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${
                        done
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/20 text-red-300'
                      }`}
                    >
                      <span>{done ? '✓' : '⏳'}</span>
                      <span className="max-w-[140px] truncate">{dep.depends_on?.title || 'Unknown task'}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDep(dep.depends_on_task_id)}
                        disabled={depLoading}
                        className="opacity-50 hover:opacity-100 ml-0.5"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {availableForDep.length > 0 && (
              <select
                className="input text-sm"
                value=""
                onChange={e => handleAddDep(e.target.value)}
                disabled={depLoading}
              >
                <option value="">+ Add dependency…</option>
                {availableForDep.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} — {t.status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            )}

            {myDeps.length === 0 && availableForDep.length === 0 && (
              <p className="text-xs text-slate-600">No other tasks in this project</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default TaskModal;
