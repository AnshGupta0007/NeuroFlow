import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Brain, Zap, Users, Loader2, RefreshCw, Shield
} from 'lucide-react';
import { clsx } from 'clsx';
import useIntelligenceStore from '../store/intelligenceStore';
import useProjectStore from '../store/projectStore';
import PredictionPanel from '../components/intelligence/PredictionPanel';
import AIAssistant from '../components/intelligence/AIAssistant';
import WorkloadChart from '../components/analytics/WorkloadChart';
import TeamDNA from '../components/analytics/TeamDNA';

const TABS = [
  { id: 'prediction', icon: Shield, label: 'Predictions' },
  { id: 'workload', icon: Users, label: 'Workload' },
  { id: 'assistant', icon: Brain, label: 'AI Assistant' },
  { id: 'dna', icon: Zap, label: 'Team DNA' },
];

function IntelligencePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { intelligence, fetchIntelligence, isLoading } = useIntelligenceStore();
  const { currentProject, fetchProject } = useProjectStore();
  const [tab, setTab] = useState('prediction');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProject(projectId);
    fetchIntelligence(projectId);
  }, [projectId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIntelligence(projectId);
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border px-8 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/projects/${projectId}`)} className="btn-ghost -ml-2 text-slate-500">
            <ArrowLeft size={17} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center">
                <Brain size={16} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-100">Intelligence Panel</h1>
                <p className="text-xs text-slate-500">{currentProject?.name}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary text-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/25'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-surface-elevated'
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {isLoading && !intelligence ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500">Analyzing project data...</p>
          </div>
        ) : !intelligence ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Brain size={40} className="mb-4 opacity-30" />
            <p>No intelligence data available</p>
          </div>
        ) : (
          <>
            {tab === 'prediction' && (
              <PredictionPanel intelligence={intelligence} />
            )}
            {tab === 'workload' && (
              <WorkloadChart workload={intelligence.workload} />
            )}
            {tab === 'assistant' && (
              <AIAssistant projectId={projectId} />
            )}
            {tab === 'dna' && (
              <TeamDNA teamDna={intelligence.teamDna} />
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      {intelligence && (
        <div className="bg-surface-card border-t border-surface-border px-8 py-2 flex items-center gap-4 text-xs text-slate-600">
          <span>Last analyzed: {new Date(intelligence.generatedAt).toLocaleTimeString()}</span>
          <span>·</span>
          <span className={clsx(
            intelligence.prediction?.delayRisk > 60 ? 'text-red-400' :
            intelligence.prediction?.delayRisk > 30 ? 'text-yellow-400' : 'text-emerald-400'
          )}>
            {intelligence.prediction?.delayRisk}% delay risk
          </span>
          <span>·</span>
          <span>{intelligence.prediction?.pendingTasks} tasks pending</span>
          <span>·</span>
          <span>{intelligence.blockedTasks?.length || 0} blocked</span>
        </div>
      )}
    </div>
  );
}

export default IntelligencePage;
