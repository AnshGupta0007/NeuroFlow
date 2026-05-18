import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Folder, Calendar, AlertTriangle, Users, TrendingUp,
  MoreVertical, Loader2, Brain, CheckCircle2, PauseCircle, PlayCircle, ClipboardList
} from 'lucide-react';
import { clsx } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import useProjectStore from '../store/projectStore';
import useAuthStore from '../store/authStore';
import Modal from '../components/ui/Modal';
import RiskMeter from '../components/ui/RiskMeter';

const STATUS_CONFIG = {
  planning: { color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/25' },
  active: { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' },
  on_hold: { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25' },
  completed: { color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/25' }
};

function Projects() {
  const { projects, isLoading, fetchProjects, createProject, deleteProject } = useProjectStore();
  const { user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchProjects(); }, []);

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-slate-500 mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} · AI-powered insights for each
          </p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={17} />
            New Project
          </button>
        )}
      </div>

      {isLoading && projects.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="text-brand-400 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState onCreateClick={user?.role === 'admin' ? () => setShowCreateModal(true) : null} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={user?.role === 'admin'}
              onClick={() => navigate(`/projects/${project.id}`)}
              onIntelligence={() => navigate(`/projects/${project.id}/intelligence`)}
              onDelete={() => deleteProject(project.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (data) => {
            const project = await createProject(data);
            setShowCreateModal(false);
            navigate(`/projects/${project.id}`);
          }}
        />
      )}
    </div>
  );
}

const STATUS_ACTIONS = [
  { status: 'planning',  label: 'Planning',  icon: ClipboardList,  color: 'text-blue-400' },
  { status: 'active',    label: 'Active',    icon: PlayCircle,     color: 'text-emerald-400' },
  { status: 'on_hold',   label: 'On Hold',   icon: PauseCircle,    color: 'text-yellow-400' },
  { status: 'completed', label: 'Completed', icon: CheckCircle2,   color: 'text-slate-400' },
];

function ProjectCard({ project, isAdmin, onClick, onIntelligence, onDelete }) {
  const { updateProject } = useProjectStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const menuRef = useRef(null);
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;

  return (
    <div
      className="card hover:border-brand-500/30 cursor-pointer group transition-all duration-150"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-600/40 to-violet-600/40 border border-brand-500/20 rounded-xl flex items-center justify-center">
            <Folder size={18} className="text-brand-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-200 truncate">{project.name}</h3>
            <span className={clsx('badge border text-[10px]', statusConfig.bg, statusConfig.color)}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-surface-elevated opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <div ref={menuRef} className="absolute right-0 top-8 bg-surface-card border border-surface-border rounded-xl shadow-xl z-20 py-1 min-w-[170px]">
              <button
                onClick={e => { e.stopPropagation(); onIntelligence(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-brand-400 hover:bg-surface-elevated w-full"
              >
                <Brain size={13} /> Intelligence
              </button>

              {isAdmin && (
                <>
                  <div className="border-t border-surface-border my-1" />
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setShowStatusMenu(s => !s); }}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-surface-elevated w-full"
                    >
                      <span className="flex items-center gap-2">
                        <PlayCircle size={13} className="text-slate-400" /> Set Status
                      </span>
                      <span className="text-slate-600 text-xs">›</span>
                    </button>
                    {showStatusMenu && (
                      <div className="absolute left-full top-0 ml-1 bg-surface-card border border-surface-border rounded-xl shadow-xl py-1 min-w-[140px]">
                        {STATUS_ACTIONS.map(({ status, label, icon: Icon, color }) => (
                          <button
                            key={status}
                            onClick={e => {
                              e.stopPropagation();
                              updateProject(project.id, { status });
                              setMenuOpen(false);
                              setShowStatusMenu(false);
                            }}
                            className={clsx(
                              'flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-elevated w-full',
                              color,
                              project.status === status ? 'opacity-50 cursor-default' : ''
                            )}
                            disabled={project.status === status}
                          >
                            <Icon size={13} />
                            {label}
                            {project.status === status && <span className="ml-auto text-[10px]">current</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-surface-border my-1" />
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full"
                  >
                    <AlertTriangle size={13} /> Delete
                  </button>
                </>
              )}

              {!isAdmin && (
                <>
                  <div className="border-t border-surface-border my-1" />
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full"
                  >
                    <AlertTriangle size={13} /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Scores */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 p-2.5 bg-surface-elevated border border-surface-border rounded-xl text-center">
          <RiskMeter value={project.risk_score || 0} size="sm" showLabel={false} />
          <p className="text-[10px] text-slate-600 mt-1">risk</p>
        </div>
        <div className="flex-1 p-2.5 bg-surface-elevated border border-surface-border rounded-xl text-center">
          <div className="text-lg font-bold text-brand-400">{project.complexity_score || 0}</div>
          <p className="text-[10px] text-slate-600">complexity</p>
        </div>
        <div className="flex-1 p-2.5 bg-surface-elevated border border-surface-border rounded-xl text-center">
          <div className="text-lg font-bold text-violet-400">
            {project.project_members?.[0]?.count ?? '—'}
          </div>
          <p className="text-[10px] text-slate-600">members</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-border">
        {project.deadline ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar size={12} />
            <span>Due {format(new Date(project.deadline), 'MMM d, yyyy')}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-600">No deadline</span>
        )}
        <span className="text-xs text-slate-600">
          {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '', description: '', deadline: '', status: 'planning'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate({
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Project Name *</label>
          <input
            className="input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. NeuroFlow v2.0"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What is this project about?"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Deadline</label>
            <input
              type="date"
              className="input"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-20 h-20 bg-brand-500/10 rounded-3xl flex items-center justify-center mb-4">
        <Folder size={36} className="text-brand-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-300 mb-2">No projects yet</h3>
      <p className="text-slate-500 mb-6 max-w-sm">
        Create your first project and let NeuroFlow's intelligence engine predict outcomes and optimize your team's performance.
      </p>
      {onCreateClick && (
        <button onClick={onCreateClick} className="btn-primary">
          <Plus size={17} /> Create First Project
        </button>
      )}
    </div>
  );
}

export default Projects;
