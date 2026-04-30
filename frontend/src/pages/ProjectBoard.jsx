import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import {
  ArrowLeft, Brain, BarChart3, GitBranch, Plus, Settings,
  Loader2, Users, Calendar, Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import useProjectStore from '../store/projectStore';
import KanbanBoard from '../components/projects/KanbanBoard';
import DependencyGraph from '../components/projects/DependencyGraph';
import TaskModal from '../components/tasks/TaskModal';
import MembersPanel from '../components/projects/MembersPanel';

const VIEWS = [
  { id: 'kanban', icon: BarChart3, label: 'Board' },
  { id: 'graph', icon: GitBranch, label: 'Dependency Graph' }
];

function ProjectBoard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject, tasks, members, isLoading, fetchProject } = useProjectStore();
  const [view, setView] = useState('kanban');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    fetchProject(projectId);
  }, [projectId]);

  if (isLoading && !currentProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={28} className="text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!currentProject) return null;

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const progressPercent = tasks.length > 0 ? Math.round(completedCount / tasks.length * 100) : 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden animate-fade-in">
      {/* Top bar */}
      <div className="bg-surface-card border-b border-surface-border px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="btn-ghost text-slate-500 hover:text-slate-300 -ml-2"
        >
          <ArrowLeft size={17} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-100 truncate">{currentProject.name}</h1>
            <span className="badge bg-brand-500/15 text-brand-400 border-brand-500/25 text-[11px]">
              {currentProject.userRole}
            </span>
          </div>
          {currentProject.deadline && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Calendar size={11} />
              Deadline: {format(new Date(currentProject.deadline), 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-32">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{progressPercent}% done</span>
              <span>{completedCount}/{tasks.length}</span>
            </div>
            <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembers(true)}
            className="btn-secondary text-sm"
          >
            <Users size={15} />
            Members
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/intelligence`)}
            className="btn-secondary text-sm"
          >
            <Brain size={15} className="text-brand-400" />
            Intelligence
          </button>
          <button onClick={() => setShowTaskModal(true)} className="btn-primary text-sm">
            <Plus size={15} />
            Add Task
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="bg-surface-card border-b border-surface-border px-8 py-2 flex items-center gap-1">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              view === v.id
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/25'
                : 'text-slate-500 hover:text-slate-300 hover:bg-surface-elevated'
            )}
          >
            <v.icon size={13} />
            {v.label}
          </button>
        ))}

        {/* Stats */}
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Users size={11} />
            {members.length} members
          </span>
          <span className="flex items-center gap-1">
            <Zap size={11} />
            {tasks.filter(t => t.status !== 'done').length} open
          </span>
          {tasks.filter(t => t.status === 'blocked').length > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              {tasks.filter(t => t.status === 'blocked').length} blocked
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'kanban' && <KanbanBoard projectId={projectId} />}
        {view === 'graph' && <DependencyGraph projectId={projectId} onBack={() => setView('kanban')} />}
      </div>

      {showTaskModal && (
        <TaskModal
          projectId={projectId}
          onClose={() => setShowTaskModal(false)}
          onSave={() => setShowTaskModal(false)}
        />
      )}

      <MembersPanel
        projectId={projectId}
        isOpen={showMembers}
        onClose={() => setShowMembers(false)}
      />
    </div>
  );
}

export default ProjectBoard;
