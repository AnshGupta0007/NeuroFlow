import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Brain, LayoutDashboard, FolderKanban, BarChart3,
  LogOut, Shield, Users, FileText
} from 'lucide-react';
import { clsx } from 'clsx';
import useAuthStore from '../../store/authStore';
import Avatar from '../ui/Avatar';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

function Sidebar() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  return (
    <aside className="w-64 h-screen bg-surface-card border-r border-surface-border flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base leading-tight">NeuroFlow</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Team Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
            )}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <div className="pt-4">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-3 mb-3">
              Admin
            </p>
            <NavLink
              to="/admin/users"
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
              )}
            >
              <Users size={17} />
              Manage Users
            </NavLink>
            <NavLink
              to="/admin/reports"
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
              )}
            >
              <FileText size={17} />
              Reports
            </NavLink>
          </div>
        )}

      </nav>

      {/* User section */}
      <div className="p-4 border-t border-surface-border">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-elevated transition-all group cursor-pointer">
          <Avatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
          </div>
          <button
            onClick={signOut}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-slate-500"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
