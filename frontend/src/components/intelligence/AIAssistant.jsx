import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Zap, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import useIntelligenceStore from '../../store/intelligenceStore';

const SUGGESTIONS = [
  'Why is this project delayed?',
  'What should I work on today?',
  'Who is the bottleneck?',
  'When will this project finish?',
  'What are the main risks?',
  'How is the workload balanced?'
];

const MODELS = [
  {
    id: 'rule',
    label: 'Rule-based',
    badge: 'Built-in',
    description: 'Pattern-matched intelligence using real project data. No API key needed.',
    color: 'text-brand-400 bg-brand-500/10 border-brand-500/25',
  },
  {
    id: 'grok',
    label: 'Llama 3.3',
    badge: 'Groq',
    description: 'Llama-3.3-70B via Groq — requires GROQ_API_KEY in backend .env.',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/25',
  },
];

function AIAssistant({ projectId }) {
  const { chatHistory, askQuestion, clearChat } = useIntelligenceStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelId, setModelId] = useState('rule');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const bottomRef = useRef(null);
  const pickerRef = useRef(null);

  const activeModel = MODELS.find(m => m.id === modelId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSend = async (question = input) => {
    if (!question.trim() || loading) return;
    setInput('');
    setLoading(true);
    try {
      await askQuestion(projectId, question.trim(), modelId === 'grok');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="card flex flex-col h-[560px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">AI Decision Assistant</h3>
            <p className="text-xs text-slate-500">Project intelligence powered by {activeModel.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model picker */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowModelPicker(s => !s)}
              className={clsx('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all', activeModel.color)}
            >
              <span>{activeModel.badge}</span>
              <span className="opacity-50">▾</span>
            </button>
            {showModelPicker && (
              <div className="absolute right-0 top-9 w-72 bg-surface-card border border-surface-border rounded-xl shadow-xl z-20 p-2 space-y-1">
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setModelId(m.id); setShowModelPicker(false); clearChat(); }}
                    className={clsx(
                      'w-full text-left p-3 rounded-lg transition-all',
                      modelId === m.id ? 'bg-surface-elevated' : 'hover:bg-surface-elevated/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx('badge border text-[10px]', m.color)}>{m.badge}</span>
                      <span className="text-sm font-medium text-slate-200">{m.label}</span>
                      {modelId === m.id && <span className="ml-auto text-[10px] text-brand-400">active</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{m.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={clearChat} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-surface-elevated">
            Clear
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center">
              <Brain size={26} className="text-brand-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-medium mb-1">Ask me anything about this project</p>
              <p className="text-sm text-slate-500">
                Using <span className={clsx('font-medium', activeModel.color.split(' ')[0])}>{activeModel.label}</span> — {activeModel.badge} model
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs bg-surface-elevated border border-surface-border text-slate-400 hover:text-slate-200 hover:border-brand-500/40 px-3 py-1.5 rounded-full transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map(msg => (
              <div key={msg.id} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-brand-600/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain size={14} className="text-brand-400" />
                  </div>
                )}
                <div className={clsx(
                  'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-brand-600/20 text-slate-200 border border-brand-500/20 rounded-tr-sm'
                    : 'bg-surface-elevated text-slate-300 border border-surface-border rounded-tl-sm'
                )}>
                  {msg.content}
                  {/* Model + confidence footer */}
                  {msg.role === 'assistant' && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {msg.model && msg.model !== 'grok-unavailable' && msg.model !== 'grok-error' && (
                        <span className="text-[10px] text-slate-600 bg-surface-border px-1.5 py-0.5 rounded">
                          {msg.model === 'llama-3.3-70b' ? 'Llama 3.3 70B' : 'Rule-based'}
                        </span>
                      )}
                      {msg.confidence != null && (
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className={clsx('w-1 h-1 rounded-full',
                                i <= Math.round(msg.confidence * 5) ? 'bg-brand-400' : 'bg-surface-border'
                              )} />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-600">
                            {Math.round(msg.confidence * 100)}% confidence
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-brand-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Brain size={14} className="text-brand-400" />
                </div>
                <div className="bg-surface-elevated border border-surface-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                    <span className="text-xs text-slate-600 ml-1">
                      {modelId === 'grok' ? 'Asking Grok…' : 'Thinking…'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-surface-border mt-4">
        <div className="flex items-center gap-2 bg-surface-elevated border border-surface-border rounded-xl px-3 focus-within:border-brand-500/50 transition-colors">
          <Zap size={15} className="text-slate-500 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modelId === 'grok' ? 'Ask Grok anything about this project…' : 'Ask about delays, risks, priorities…'}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;
