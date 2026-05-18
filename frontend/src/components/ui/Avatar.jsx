import React from 'react';
import { clsx } from 'clsx';

const COLORS = [
  'bg-violet-500', 'bg-brand-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500'
];

function Avatar({ user, size = 'md', className }) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const colorIdx = user?.name ? user.name.charCodeAt(0) % COLORS.length : 0;
  const color = COLORS[colorIdx];
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        className={clsx('rounded-full object-cover ring-2 ring-surface-border', sizes[size], className)}
      />
    );
  }

  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-surface-border',
      sizes[size], color, className
    )}>
      {initials}
    </div>
  );
}

export function AvatarGroup({ users = [], max = 3, size = 'sm' }) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((user, i) => (
        <Avatar key={user?.id || i} user={user} size={size} />
      ))}
      {remaining > 0 && (
        <div className={clsx(
          'rounded-full bg-surface-elevated border-2 border-surface-border flex items-center justify-center text-xs text-slate-400 font-medium',
          size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
        )}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default Avatar;
