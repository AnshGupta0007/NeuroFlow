import React from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  Tooltip
} from 'recharts';
import Avatar from '../ui/Avatar';
import { clsx } from 'clsx';

const ARCHETYPE_CONFIG = {
  'Fast Worker': { color: '#10b981', icon: '⚡' },
  'Consistent Worker': { color: '#6366f1', icon: '🎯' },
  'Last-Minute Worker': { color: '#f59e0b', icon: '🔥' },
  'Risk Creator': { color: '#ef4444', icon: '⚠️' },
  'Balanced Worker': { color: '#8b5cf6', icon: '⚖️' },
  'Struggling Worker': { color: '#64748b', icon: '📉' }
};

function TeamDNA({ teamDna = [] }) {
  if (teamDna.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          No team data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-200 mb-6">Team DNA Fingerprint</h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {teamDna.map(member => (
          <MemberDNACard key={member.userId} member={member} />
        ))}
      </div>
    </div>
  );
}

function MemberDNACard({ member }) {
  const radarData = [
    { trait: 'Speed', value: member.dnaProfile?.speed || 0 },
    { trait: 'Consistency', value: member.dnaProfile?.consistency || 0 },
    { trait: 'Punctuality', value: member.dnaProfile?.punctuality || 0 },
    { trait: 'Reliability', value: member.dnaProfile?.reliability || 0 },
    { trait: 'Throughput', value: member.dnaProfile?.throughput || 0 },
    { trait: 'Focus', value: member.dnaProfile?.focus || 0 }
  ];

  const archetypeConfig = ARCHETYPE_CONFIG[member.archetype] || ARCHETYPE_CONFIG['Balanced Worker'];

  return (
    <div className="bg-surface-elevated border border-surface-border rounded-2xl p-4">
      {/* Member header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar user={{ name: member.name, avatar_url: member.avatarUrl }} size="md" />
          <div>
            <p className="text-sm font-semibold text-slate-200">{member.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span>{archetypeConfig.icon}</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  color: archetypeConfig.color,
                  background: archetypeConfig.color + '20'
                }}
              >
                {member.archetype}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-brand-400">{member.productivityScore}</div>
          <div className="text-xs text-slate-500">productivity</div>
        </div>
      </div>

      {/* Radar chart */}
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#2a2a3d" />
          <PolarAngleAxis
            dataKey="trait"
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <Radar
            name={member.name}
            dataKey="value"
            stroke={archetypeConfig.color}
            fill={archetypeConfig.color}
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: '#1e1e2e',
              border: '1px solid #2a2a3d',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '12px'
            }}
            formatter={(v) => [`${v}%`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Key traits */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {radarData.map(d => (
          <div key={d.trait} className="text-center">
            <div
              className="text-sm font-bold"
              style={{ color: archetypeConfig.color }}
            >
              {d.value}%
            </div>
            <div className="text-[10px] text-slate-600">{d.trait}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamDNA;
