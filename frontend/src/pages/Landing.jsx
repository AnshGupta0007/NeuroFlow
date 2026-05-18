import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Zap, TrendingUp, Shield, GitBranch, BarChart3,
  ArrowRight, CheckCircle2, Activity, Users, Layers,
  Clock, Star, ChevronRight, Play, Sparkles
} from 'lucide-react';

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setVal(Math.floor(p * to));
        if (p < 1) requestAnimationFrame(step);
        else setVal(to);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Floating mock card ────────────────────────────────────────────────────────
function FloatCard({ className, children, delay = '0s' }) {
  return (
    <div
      className={`absolute bg-surface-card border border-surface-border rounded-2xl shadow-2xl backdrop-blur-sm ${className}`}
      style={{ animation: `float 6s ease-in-out infinite`, animationDelay: delay }}
    >
      {children}
    </div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, gradient, items }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-surface-border bg-surface-card p-8 hover:border-brand-500/40 transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient}`} />
      <div className="relative">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${gradient} border border-white/10`}>
          <Icon size={26} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-3">{title}</h3>
        <p className="text-slate-400 leading-relaxed mb-6">{description}</p>
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ number, title, description }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/30">
        {number}
      </div>
      <div className="pt-2">
        <h4 className="font-semibold text-slate-100 mb-1">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ── Mini feature pill ────────────────────────────────────────────────────────
function FeaturePill({ icon: Icon, label, color }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${color}`}>
      <Icon size={15} />
      {label}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function Landing() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-slate-100 overflow-x-hidden">

      {/* ── Cursor glow ── */}
      <div
        className="fixed pointer-events-none z-0 w-96 h-96 rounded-full opacity-[0.06] blur-3xl bg-brand-500 transition-all duration-300"
        style={{ left: mousePos.x - 192, top: mousePos.y - 192 }}
      />

      {/* ── Background grid ── */}
      <div className="fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(to right, #6366f1 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }}
      />

      {/* ── Background orbs ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-brand-500/8 blur-[100px]" />
      </div>

      <div className="relative z-10">

        {/* ══════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════ */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Brain size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-100">NeuroFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {['Features', 'How it works', 'Intelligence'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')}
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95">
              Get Started Free
            </button>
          </div>
        </nav>

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles size={14} className="animate-pulse" />
            AI-Powered Project Intelligence
            <ChevronRight size={14} />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 max-w-4xl animate-fade-in"
            style={{ animationDelay: '0.1s' }}>
            Your team's{' '}
            <span className="relative">
              <span className="text-gradient">smartest</span>
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 300 8">
                <path d="M0 6 Q75 0 150 6 Q225 12 300 6" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
              </svg>
            </span>
            {' '}co-pilot
          </h1>

          {/* Sub */}
          <p className="text-xl text-slate-400 max-w-2xl leading-relaxed mb-10 animate-fade-in"
            style={{ animationDelay: '0.2s' }}>
            NeuroFlow combines AI predictions, behavioral analytics, and dependency intelligence
            to keep your projects on track — before problems even happen.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <button onClick={() => navigate('/signup')}
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-semibold rounded-2xl transition-all shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 active:scale-95">
              Start for free
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-8 py-4 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-medium rounded-2xl transition-all hover:bg-white/5">
              <Play size={15} className="text-brand-400" />
              Sign in
            </button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-20 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <FeaturePill icon={Brain}      label="AI Decision Assistant"     color="bg-brand-500/10 border-brand-500/20 text-brand-400" />
            <FeaturePill icon={TrendingUp} label="Delay Prediction"          color="bg-violet-500/10 border-violet-500/20 text-violet-400" />
            <FeaturePill icon={GitBranch}  label="Dependency Graph"          color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" />
            <FeaturePill icon={Activity}   label="Behavioral Analytics"      color="bg-amber-500/10 border-amber-500/20 text-amber-400" />
            <FeaturePill icon={Shield}     label="RBAC Permissions"          color="bg-red-500/10 border-red-500/20 text-red-400" />
          </div>

          {/* Hero visual — floating cards */}
          <div className="relative w-full max-w-4xl mx-auto h-[420px] animate-fade-in" style={{ animationDelay: '0.5s' }}>

            {/* Central "dashboard" panel */}
            <div className="absolute inset-x-16 top-0 bottom-8 bg-surface-card border border-surface-border rounded-3xl overflow-hidden shadow-[0_40px_120px_rgba(99,102,241,0.15)]">
              {/* Mock header */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-border bg-[#0f0f1a]">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                <div className="ml-4 flex-1 h-5 bg-surface-elevated rounded-md max-w-xs" />
              </div>

              {/* Mock content */}
              <div className="p-5 grid grid-cols-3 gap-3">
                {/* Stat cards */}
                {[
                  { label: 'Projects', val: '12', color: 'from-brand-500/20 to-brand-500/5', text: 'text-brand-400' },
                  { label: 'Tasks Done', val: '94', color: 'from-emerald-500/20 to-emerald-500/5', text: 'text-emerald-400' },
                  { label: 'Delay Risk', val: '8%', color: 'from-violet-500/20 to-violet-500/5', text: 'text-violet-400' },
                ].map(s => (
                  <div key={s.label} className={`bg-gradient-to-br ${s.color} border border-white/5 rounded-xl p-3`}>
                    <p className={`text-2xl font-bold ${s.text}`}>{s.val}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}

                {/* Mock chart */}
                <div className="col-span-2 bg-surface-elevated border border-surface-border rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-2">Task Activity</p>
                  <div className="flex items-end gap-1 h-14">
                    {[3,5,4,7,6,8,5,9,7,10,8,11,9,12].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm"
                        style={{ height: `${h * 8}%`, background: `rgba(99,102,241,${0.3 + i * 0.04})` }} />
                    ))}
                  </div>
                </div>

                {/* Mock AI panel */}
                <div className="bg-surface-elevated border border-brand-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brain size={12} className="text-brand-400" />
                    <p className="text-[10px] text-brand-400 font-medium">AI Insight</p>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Sprint 4 is on track. 2 tasks approaching deadline — suggest reassigning to Sarah.
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= 4 ? 'bg-brand-400' : 'bg-surface-border'}`} />
                    ))}
                    <span className="text-[9px] text-slate-600 ml-1">92% confidence</span>
                  </div>
                </div>

                {/* Mock task list */}
                <div className="col-span-3 bg-surface-elevated border border-surface-border rounded-xl p-3">
                  <div className="space-y-1.5">
                    {[
                      { title: 'API rate limiting implementation', status: 'done', priority: 'high' },
                      { title: 'Design system token migration', status: 'in_progress', priority: 'critical' },
                      { title: 'Performance audit — dashboard', status: 'review', priority: 'medium' },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          t.status === 'done' ? 'bg-emerald-400' :
                          t.status === 'review' ? 'bg-violet-400' : 'bg-brand-400'
                        }`} />
                        <span className={`flex-1 text-xs ${t.status === 'done' ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                          {t.title}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          t.priority === 'critical' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                          t.priority === 'high' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                          'text-slate-400 border-slate-500/30 bg-slate-500/10'
                        }`}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card — risk */}
            <FloatCard className="left-0 top-12 w-44 p-4" delay="0s">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={13} className="text-emerald-400" />
                <span className="text-[11px] font-semibold text-slate-300">On Track</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">8%</p>
              <p className="text-[10px] text-slate-500">delay risk this sprint</p>
            </FloatCard>

            {/* Floating card — team */}
            <FloatCard className="right-0 top-8 w-44 p-4" delay="2s">
              <div className="flex items-center gap-2 mb-2">
                <Users size={13} className="text-violet-400" />
                <span className="text-[11px] font-semibold text-slate-300">Team DNA</span>
              </div>
              <div className="space-y-1.5">
                {[['Speed', 82], ['Focus', 91], ['Punctuality', 76]].map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                      <span>{k}</span><span>{v}%</span>
                    </div>
                    <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </FloatCard>

            {/* Floating card — AI */}
            <FloatCard className="right-4 bottom-0 w-52 p-4" delay="1s">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-gradient-to-br from-brand-500 to-violet-500 rounded-md flex items-center justify-center">
                  <Brain size={11} className="text-white" />
                </div>
                <span className="text-[11px] font-semibold text-slate-300">AI Assistant</span>
              </div>
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">Reassign "Auth module" to reduce bottleneck by 40%</p>
              </div>
            </FloatCard>
          </div>
        </section>

        {/* ══════════════════════════════════════
            STATS
        ══════════════════════════════════════ */}
        <section className="py-20 border-y border-white/5">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: 65, suffix: '%', label: 'faster project delivery', color: 'text-brand-400' },
                { value: 3,  suffix: 'x', label: 'better deadline accuracy', color: 'text-violet-400' },
                { value: 40, suffix: '%', label: 'less time in status meetings', color: 'text-emerald-400' },
                { value: 89, suffix: '%', label: 'teams hit their sprint goals', color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-5xl font-extrabold mb-2 ${s.color}`}>
                    <Counter to={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-slate-500 text-sm leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FEATURES
        ══════════════════════════════════════ */}
        <section id="features" className="py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-semibold uppercase tracking-widest mb-4">
                Features
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-100 mb-4">
                Intelligence built for<br />
                <span className="text-gradient">modern teams</span>
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Every feature is designed to surface insights before they become problems.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={Brain}
                title="AI Decision Assistant"
                description="Ask anything about your project in plain language. Get answers powered by real-time project data — not hallucinations."
                gradient="bg-gradient-to-br from-brand-600/80 to-brand-800/80"
                items={['Why is this delayed?', 'Who is the bottleneck?', 'What should I work on next?', 'Groq LLM + rule-based engine']}
              />
              <FeatureCard
                icon={TrendingUp}
                title="Predictive Analytics"
                description="Know if you'll miss your deadline before it's too late. Velocity-based forecasting adapts to your team's real pace."
                gradient="bg-gradient-to-br from-violet-600/80 to-violet-800/80"
                items={['Deadline risk scoring', 'Bottleneck detection', 'Time drift alerts', 'Team velocity tracking']}
              />
              <FeatureCard
                icon={GitBranch}
                title="Dependency Intelligence"
                description="Visualise task chains with topological layout. Locked tasks auto-unlock when dependencies are completed."
                gradient="bg-gradient-to-br from-emerald-600/80 to-emerald-800/80"
                items={['Topological graph layout', 'Cycle detection', 'Auto-lock / auto-unlock', 'Critical path analysis']}
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════ */}
        <section id="how-it-works" className="py-28 px-6 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-4">
                How it works
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-100">
                Up and running<br />
                <span className="text-gradient">in minutes</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-10">
                <StepCard number="1" title="Create your workspace"
                  description="Sign up, create a project, and invite your team. Roles are automatically scoped — admins, members, and observers each get exactly the right access." />
                <StepCard number="2" title="Add tasks and dependencies"
                  description="Create tasks with priorities, estimates, and assignees. Link them with dependencies and the graph builds itself — topologically ordered." />
                <StepCard number="3" title="Let the AI do the thinking"
                  description="NeuroFlow tracks velocity, flags drift, and predicts delays. Ask the AI assistant anything — it reads your actual project data to answer." />
              </div>

              {/* Visual side */}
              <div className="relative">
                <div className="bg-surface-card border border-surface-border rounded-3xl p-6 shadow-2xl shadow-brand-500/10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center">
                      <Brain size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">AI Assistant</p>
                      <p className="text-[10px] text-slate-500">Powered by Groq · LLaMA 3.3 70B</p>
                    </div>
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="bg-brand-600/20 border border-brand-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                        <p className="text-sm text-slate-200">Why is this project delayed?</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 bg-brand-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Brain size={13} className="text-brand-400" />
                      </div>
                      <div className="bg-surface-elevated border border-surface-border rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]">
                        <p className="text-sm text-slate-300 leading-relaxed">
                          Project has 67% risk of delay. Main factors: Sarah is blocking 3 tasks, and 2 critical path tasks are drifting +2.4 days past estimates.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-slate-600 bg-surface-border px-1.5 py-0.5 rounded">Rule-based</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className={`w-1 h-1 rounded-full ${i <= 4 ? 'bg-brand-400' : 'bg-surface-border'}`} />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-600">88% confidence</span>
                        </div>
                      </div>
                    </div>
                    {/* Typing indicator */}
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 bg-brand-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Brain size={13} className="text-brand-400" />
                      </div>
                      <div className="bg-surface-elevated border border-surface-border rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1 items-center">
                          {[0,1,2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400"
                              style={{ animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FEATURE GRID
        ══════════════════════════════════════ */}
        <section id="intelligence" className="py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-4">
                Everything included
              </span>
              <h2 className="text-4xl font-extrabold text-slate-100">
                The full stack of <span className="text-gradient">project intelligence</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: BarChart3,    title: 'Productivity DNA',        desc: 'Speed, consistency, punctuality, focus — a personal performance profile for every team member.',   color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/15' },
                { icon: Clock,        title: 'Peak Hour Tracking',      desc: 'Learns when each person is most productive and surfaces it as a scheduling recommendation.',         color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/15' },
                { icon: Layers,       title: 'Kanban + RBAC',           desc: 'Drag-and-drop board with role-aware columns. Only admins can approve done or block tasks.',           color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/15' },
                { icon: Activity,     title: 'Workload Balancing',      desc: 'Automatically detects who is overloaded and suggests task reassignments with one click.',              color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15' },
                { icon: Star,         title: 'Behavioral Insights',     desc: 'Pattern-matched insights like last-minute tendencies, speed ratios, and high-priority delay rates.', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/15' },
                { icon: Shield,       title: 'PDF Reports',             desc: 'Export professional dark-themed PDF reports for any project or the whole team in one click.',          color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/15' },
              ].map(f => (
                <div key={f.title} className={`rounded-2xl border p-6 hover:scale-[1.02] transition-transform duration-200 ${f.bg}`}>
                  <f.icon size={22} className={`${f.color} mb-3`} />
                  <h4 className="font-semibold text-slate-200 mb-2">{f.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA
        ══════════════════════════════════════ */}
        <section className="py-28 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-surface-card to-violet-500/10 p-14">
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-brand-500/20 via-violet-500/20 to-brand-500/20 blur-xl opacity-50" />
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-500/30">
                  <Brain size={28} className="text-white" />
                </div>
                <h2 className="text-4xl font-extrabold text-slate-100 mb-4">
                  Start shipping smarter
                </h2>
                <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                  Join teams using NeuroFlow to predict delays, balance workloads,
                  and make every sprint count.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => navigate('/signup')}
                    className="group flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-semibold rounded-2xl transition-all shadow-2xl shadow-brand-500/30 hover:-translate-y-0.5">
                    Get started free
                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button onClick={() => navigate('/login')}
                    className="px-8 py-4 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-medium rounded-2xl transition-all hover:bg-white/5">
                    Sign in
                  </button>
                </div>
                <p className="text-slate-600 text-sm mt-6">No credit card required · Free forever for small teams</p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <footer className="border-t border-white/5 py-10 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-500 rounded-lg flex items-center justify-center">
                <Brain size={16} className="text-white" />
              </div>
              <span className="font-bold text-slate-400">NeuroFlow</span>
              <span className="text-slate-700 text-sm">— Team Intelligence Platform</span>
            </div>
            <p className="text-sm text-slate-700">Built with React, Supabase & Groq AI</p>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default Landing;
