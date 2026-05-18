import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Trash2, Crown, User, Eye, Shield, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { adminAPI } from '../services/api';
import Avatar from '../components/ui/Avatar';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    icon: Crown, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25' },
  member:   { label: 'Member',   icon: User,  color: 'text-brand-400 bg-brand-500/10 border-brand-500/25' },
  observer: { label: 'Observer', icon: Eye,   color: 'text-slate-400 bg-slate-500/10 border-slate-500/25' },
};

function AdminUsers() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);

  const load = async (q = '') => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers(q);
      setUsers(res.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search), 300);
  }, [search]);

  const handleRoleChange = async (userId, role) => {
    try {
      await adminAPI.updateUserRole(userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDelete = async (userId, name) => {
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(`${name} deleted`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete user');
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    members: users.filter(u => u.role === 'member').length,
    observers: users.filter(u => u.role === 'observer').length,
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield size={22} className="text-brand-400" />
          <h1 className="text-2xl font-bold text-slate-100">User Management</h1>
        </div>
        <p className="text-slate-500 text-sm">Manage all users, roles, and access across NeuroFlow</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-slate-300' },
          { label: 'Admins', value: stats.admins, icon: Crown, color: 'text-yellow-400' },
          { label: 'Members', value: stats.members, icon: User, color: 'text-brand-400' },
          { label: 'Observers', value: stats.observers, icon: Eye, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0">
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <Loader2 size={22} className="animate-spin text-brand-400 mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500 text-sm">No users found</td>
              </tr>
            ) : users.map(u => {
              const isSelf = u.id === currentUser?.id;
              const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.member;
              const RoleIcon = cfg.icon;
              return (
                <tr key={u.id} className="border-b border-surface-border last:border-0 hover:bg-surface-elevated/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200">{u.name}</p>
                          {isSelf && <span className="text-[10px] text-slate-600">(you)</span>}
                        </div>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {isSelf ? (
                      <span className={clsx('badge border text-xs flex items-center gap-1 w-fit', cfg.color)}>
                        <RoleIcon size={10} />
                        {cfg.label}
                      </span>
                    ) : (
                      <select
                        className={clsx('text-xs border rounded-lg px-2 py-1 bg-transparent cursor-pointer focus:outline-none', cfg.color)}
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="observer">Observer</option>
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-400">{u.projectCount}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-slate-500">
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!isSelf && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/15 text-slate-600 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminUsers;
