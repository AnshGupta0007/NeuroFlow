import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Trash2, ChevronDown, Search, Loader2, Crown, Eye, User } from 'lucide-react';
import { clsx } from 'clsx';
import { membersAPI } from '../../services/api';
import useProjectStore from '../../store/projectStore';
import useAuthStore from '../../store/authStore';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    icon: Crown, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25' },
  member:   { label: 'Member',   icon: User,  color: 'text-brand-400 bg-brand-500/10 border-brand-500/25' },
  observer: { label: 'Observer', icon: Eye,   color: 'text-slate-400 bg-slate-500/10 border-slate-500/25' },
};

function MembersPanel({ projectId, isOpen, onClose }) {
  const { members, addMember, removeMember } = useProjectStore();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState('member');
  const [adding, setAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Find current user's project role
  const myMembership = members.find(m => m.users?.id === currentUser?.id);
  const isAdmin = myMembership?.role === 'admin' || currentUser?.role === 'admin';

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await membersAPI.search(projectId, search);
        // Filter out already-added members
        const existingIds = new Set(members.map(m => m.users?.id));
        setSearchResults((res.data || []).filter(u => !existingIds.has(u.id)));
      } catch {}
      setSearching(false);
    }, 300);
  }, [search, members, projectId]);

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    try {
      await addMember(projectId, { user_id: selectedUser.id, role: selectedRole });
      setSelectedUser(null);
      setSearch('');
      setSearchResults([]);
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await membersAPI.update(projectId, memberId, { role: newRole });
      toast.success('Role updated');
      // Refresh members in store
      const res = await membersAPI.getAll(projectId);
      useProjectStore.setState({ members: res.data || [] });
    } catch {}
  };

  const handleRemove = async (memberId, userName) => {
    if (!confirm(`Remove ${userName} from this project?`)) return;
    await removeMember(projectId, memberId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Members" size="md">
      <div className="space-y-5">

        {/* Add member — admin only */}
        {isAdmin && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Member</p>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchRef}
                className="input pl-9"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedUser(null); }}
              />
              {searching && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />
              )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && !selectedUser && (
              <div className="border border-surface-border rounded-xl overflow-hidden bg-surface-elevated">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setSearch(user.name); setSearchResults([]); }}
                    className="flex items-center gap-3 px-4 py-3 w-full hover:bg-surface-border transition-colors text-left"
                  >
                    <Avatar user={user} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Role + Add button */}
            {selectedUser && (
              <div className="flex items-center gap-2 p-3 bg-brand-500/8 border border-brand-500/20 rounded-xl">
                <Avatar user={selectedUser} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{selectedUser.name}</p>
                  <p className="text-xs text-slate-500 truncate">{selectedUser.email}</p>
                </div>
                <select
                  className="input py-1.5 text-xs w-28 flex-shrink-0"
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="observer">Observer</option>
                </select>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="btn-primary text-sm py-1.5 flex-shrink-0"
                >
                  {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Add
                </button>
              </div>
            )}

            {search.length >= 2 && !searching && searchResults.length === 0 && !selectedUser && (
              <p className="text-xs text-slate-600 text-center py-2">No users found</p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-surface-border" />

        {/* Current members */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Current Members ({members.length})
          </p>
          <div className="space-y-2">
            {members.map(m => {
              const u = m.users;
              if (!u) return null;
              const roleConfig = ROLE_CONFIG[m.role] || ROLE_CONFIG.member;
              const RoleIcon = roleConfig.icon;
              const isSelf = u.id === currentUser?.id;

              return (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-surface-elevated border border-surface-border rounded-xl group">
                  <Avatar user={u} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200 truncate">{u.name}</p>
                      {isSelf && <span className="text-[10px] text-slate-600">(you)</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>

                  {/* Role badge / selector */}
                  {isAdmin && !isSelf ? (
                    <select
                      className={clsx(
                        'text-xs border rounded-lg px-2 py-1 bg-transparent cursor-pointer focus:outline-none',
                        roleConfig.color
                      )}
                      value={m.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="observer">Observer</option>
                    </select>
                  ) : (
                    <span className={clsx('badge border text-xs flex items-center gap-1', roleConfig.color)}>
                      <RoleIcon size={10} />
                      {roleConfig.label}
                    </span>
                  )}

                  {/* Remove button */}
                  {isAdmin && !isSelf && (
                    <button
                      onClick={() => handleRemove(u.id, u.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/15 text-slate-600 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Role legend */}
        <div className="border-t border-surface-border pt-4 grid grid-cols-3 gap-2">
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
            <div key={role} className={clsx('rounded-xl border p-2.5 text-center', cfg.color)}>
              <p className="text-xs font-semibold">{cfg.label}</p>
              <p className="text-[10px] opacity-70 mt-0.5">
                {role === 'admin' ? 'Full control' : role === 'member' ? 'Create & edit' : 'View only'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default MembersPanel;
