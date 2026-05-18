import React, { useEffect, useState } from 'react';
import {
  FileText, Download, FolderKanban, AlertTriangle, Loader2,
  BarChart3, CheckCircle2, Clock, Users, TrendingUp, ShieldAlert,
  Layers, Calendar, Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { adminAPI, projectsAPI } from '../services/api';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  brand:   [99,  102, 241],
  violet:  [139, 92,  246],
  emerald: [16,  185, 129],
  red:     [239, 68,  68],
  amber:   [245, 158, 11],
  slate900:[15,  23,  42],
  slate800:[30,  41,  59],
  slate700:[51,  65,  85],
  slate500:[100, 116, 135],
  slate300:[148, 163, 184],
  white:   [255, 255, 255],
  bg:      [17,  17,  34],
};

function newDoc() { return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); }

function drawHeader(doc, title, subtitle) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.slate900);
  doc.rect(0, 0, W, 42, 'F');
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, 4, 42, 'F');
  doc.setFillColor(...C.brand);
  doc.roundedRect(12, 8, 36, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text('NeuroFlow', 30, 14.5, { align: 'center' });
  doc.setFontSize(18);
  doc.setTextColor(...C.white);
  doc.text(title, 12, 28);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.slate300);
  doc.text(subtitle, 12, 35);
  doc.setTextColor(...C.slate500);
  doc.text(`Generated ${format(new Date(), 'PPp')}`, W - 12, 35, { align: 'right' });
}

function hr(doc, y, color = C.slate800) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(12, y, doc.internal.pageSize.getWidth() - 12, y);
}

function sectionTitle(doc, text, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.brand);
  doc.text(text.toUpperCase(), 12, y);
  hr(doc, y + 2, C.brand);
  return y + 8;
}

function statRow(doc, stats, y) {
  const W = doc.internal.pageSize.getWidth();
  const pad = 12, gap = 4, cols = stats.length;
  const boxW = (W - pad * 2 - gap * (cols - 1)) / cols;
  stats.forEach((s, i) => {
    const x = pad + i * (boxW + gap);
    doc.setFillColor(...C.slate800);
    doc.roundedRect(x, y, boxW, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...(s.color || C.white));
    doc.text(String(s.value), x + boxW / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.slate500);
    doc.text(s.label, x + boxW / 2, y + 14, { align: 'center' });
  });
  return y + 26;
}

function addTable(doc, { head, body, startY, columnStyles = {} }) {
  autoTable(doc, {
    startY, head, body, columnStyles,
    styles: { fontSize: 8, cellPadding: 3, textColor: C.slate300, lineColor: C.slate800, lineWidth: 0.2 },
    headStyles: { fillColor: C.slate800, textColor: C.brand, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [20, 20, 38] },
    bodyStyles: { fillColor: C.bg },
    theme: 'grid',
    margin: { left: 12, right: 12 },
  });
  return doc.lastAutoTable.finalY + 8;
}

function addPage(doc, title) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.slate900);
  doc.rect(0, 0, W, 14, 'F');
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, 4, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.slate300);
  doc.text(`NeuroFlow  ·  ${title}`, 12, 9);
  doc.setTextColor(...C.slate500);
  doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, W - 12, 9, { align: 'right' });
  return 22;
}

function addFooter(doc) {
  const W = doc.internal.pageSize.getWidth();
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...C.slate700);
    doc.text('NeuroFlow Team Intelligence  ·  Confidential', W / 2, 290, { align: 'center' });
  }
}

function generateOverviewPDF(data) {
  const doc = newDoc();
  const { summary: s, projectRows, memberRows } = data;
  drawHeader(doc, 'Team Overview Report', 'All projects · All team members');
  let y = 50;
  y = statRow(doc, [
    { label: 'Total Projects',  value: s.totalProjects,  color: C.brand },
    { label: 'Active',          value: s.activeProjects, color: C.emerald },
    { label: 'Total Tasks',     value: s.totalTasks,     color: C.white },
    { label: 'Completed',       value: s.completedTasks, color: C.emerald },
    { label: 'Overdue',         value: s.overdueTasks,   color: s.overdueTasks > 0 ? C.red : C.slate300 },
    { label: 'Team Members',    value: s.totalMembers,   color: C.violet },
  ], y);
  y = sectionTitle(doc, 'Projects', y);
  y = addTable(doc, {
    startY: y,
    head: [['Project', 'Status', 'Progress', 'Total', 'Done', 'Pending', 'Overdue', 'Risk', 'Deadline', 'Members']],
    body: projectRows.map(p => [p.name, p.status, p.progress, p.totalTasks, p.doneTasks, p.pendingTasks, p.overdueTasks, `${p.riskScore}%`, p.deadline, p.members]),
    columnStyles: { 0: { cellWidth: 42 }, 2: { textColor: C.brand }, 7: { textColor: C.amber } }
  });
  if (y > 220) y = addPage(doc, 'Team Members');
  else y = sectionTitle(doc, 'Team Members', y);
  addTable(doc, {
    startY: y,
    head: [['Name', 'Email', 'Role', 'Projects', 'Assigned', 'Completed', 'Overdue', 'Joined']],
    body: memberRows.map(m => [m.name, m.email, m.role, m.projects, m.tasksAssigned, m.tasksCompleted, m.overdueTasks, m.joinedAt]),
    columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 44 }, 5: { textColor: C.emerald }, 6: { textColor: C.red } }
  });
  addFooter(doc);
  doc.save(`neuroflow-overview-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

function generateProjectPDF(data, projectName) {
  const doc = newDoc();
  const { summary: s, taskRows, memberRows } = data;
  drawHeader(doc, projectName, 'Project Intelligence Report');
  let y = 50;
  y = statRow(doc, [
    { label: 'Progress',    value: s.progress,        color: C.brand },
    { label: 'Total Tasks', value: s.totalTasks,      color: C.white },
    { label: 'Done',        value: s.doneTasks,        color: C.emerald },
    { label: 'Pending',     value: s.pendingTasks,     color: C.amber },
    { label: 'Blocked',     value: s.blockedTasks,     color: s.blockedTasks > 0 ? C.red : C.slate300 },
    { label: 'Risk Score',  value: `${s.riskScore}%`,  color: s.riskScore > 60 ? C.red : s.riskScore > 30 ? C.amber : C.emerald },
  ], y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.slate500);
  doc.text(`Status: ${s.status}   ·   Deadline: ${s.deadline}   ·   Team: ${s.totalMembers} members   ·   Overdue: ${s.overdueTasks} tasks`, 12, y);
  y += 10;
  y = sectionTitle(doc, 'Task List', y);
  y = addTable(doc, {
    startY: y,
    head: [['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Estimate', 'Logged', 'Overdue']],
    body: taskRows.map(t => [t.title, t.status.replace('_', ' '), t.priority, t.assignee, t.dueDate || '—', t.effortEstimate || '—', t.timeSpent || '—', t.isOverdue]),
    columnStyles: { 0: { cellWidth: 52 }, 7: { textColor: C.red } }
  });
  if (y > 220) y = addPage(doc, projectName);
  else y = sectionTitle(doc, 'Team Contributions', y);
  addTable(doc, {
    startY: y,
    head: [['Member', 'Email', 'Role', 'Assigned', 'Completed', 'Pending', 'Overdue']],
    body: memberRows.map(m => [m.name, m.email, m.role, m.tasksAssigned, m.tasksCompleted, m.tasksPending, m.overdueTasks]),
    columnStyles: { 1: { cellWidth: 48 }, 4: { textColor: C.emerald }, 6: { textColor: C.red } }
  });
  addFooter(doc);
  const safe = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`neuroflow-${safe}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function BigStatCard({ icon: Icon, label, value, sub, accent }) {
  const accents = {
    brand:   'from-brand-500/20 to-brand-500/5 border-brand-500/25 text-brand-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/25 text-emerald-400',
    violet:  'from-violet-500/20 to-violet-500/5 border-violet-500/25 text-violet-400',
    red:     'from-red-500/20 to-red-500/5 border-red-500/25 text-red-400',
    amber:   'from-amber-500/20 to-amber-500/5 border-amber-500/25 text-amber-400',
    slate:   'from-slate-500/10 to-slate-500/5 border-slate-500/20 text-slate-400',
  };
  const cls = accents[accent] || accents.slate;
  return (
    <div className={clsx('relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5', cls.split(' ').slice(0, 3).join(' '), 'bg-surface-card')}>
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', cls.split(' ').slice(0, 2).join(' '))}>
        <Icon size={20} className={cls.split(' ')[3]} />
      </div>
      <p className="text-3xl font-bold text-slate-100 leading-none mb-1">{value}</p>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      {/* decorative circle */}
      <div className={clsx('absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br', cls.split(' ').slice(0, 2).join(' '))} />
    </div>
  );
}

function ProgressBar({ value, color = 'bg-brand-500' }) {
  return (
    <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function RiskBadge({ score }) {
  if (score > 60) return <span className="badge bg-red-500/15 text-red-400 border-red-500/25 text-xs">{score}% risk</span>;
  if (score > 30) return <span className="badge bg-amber-500/15 text-amber-400 border-amber-500/25 text-xs">{score}% risk</span>;
  return <span className="badge bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-xs">{score}% risk</span>;
}

function StatusPill({ status }) {
  const cfg = {
    active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    planning:  'bg-brand-500/15 text-brand-400 border-brand-500/25',
    on_hold:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
    completed: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  };
  return (
    <span className={clsx('badge border text-xs capitalize', cfg[status] || cfg.planning)}>
      {status?.replace('_', ' ')}
    </span>
  );
}

const INCLUDES_OVERVIEW = [
  'All projects summary',
  'Task counts per project',
  'Risk scores & deadlines',
  'Team member breakdown',
  'Completion rates',
  'Overdue task analysis',
];

const INCLUDES_PROJECT = [
  'Full task list with assignees',
  'Due dates & effort estimates',
  'Time logged per task',
  'Member contribution table',
  'Progress & risk summary',
  'Overdue task flags',
];

// ── Page ─────────────────────────────────────────────────────────────────────

function AdminReports() {
  const [projects, setProjects]                     = useState([]);
  const [overviewData, setOverviewData]             = useState(null);
  const [loadingOverview, setLoadingOverview]       = useState(true);
  const [downloadingProject, setDownloadingProject] = useState(null);
  const [generatingOverview, setGeneratingOverview] = useState(false);

  useEffect(() => {
    Promise.all([adminAPI.getOverviewReport(), projectsAPI.getAll()])
      .then(([r, p]) => { setOverviewData(r.data); setProjects(p.data || []); })
      .finally(() => setLoadingOverview(false));
  }, []);

  const handleDownloadOverview = () => {
    if (!overviewData) return;
    setGeneratingOverview(true);
    setTimeout(() => { generateOverviewPDF(overviewData); setGeneratingOverview(false); }, 50);
  };

  const handleDownloadProject = async (project) => {
    setDownloadingProject(project.id);
    try {
      const res = await adminAPI.getProjectReport(project.id);
      generateProjectPDF(res.data, project.name);
    } finally { setDownloadingProject(null); }
  };

  const s = overviewData?.summary;

  return (
    <div className="p-8 space-y-8 animate-fade-in">

      {/* ── Page header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-surface-card to-violet-500/10 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-brand-500/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                <FileText size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-100">Reports & Exports</h1>
            </div>
            <p className="text-slate-400 max-w-lg">
              Generate professional PDF reports for stakeholders, clients, or internal reviews. Includes task breakdowns, risk analysis, and team performance data.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-6 text-center">
            {loadingOverview ? (
              <Loader2 size={20} className="text-brand-400 animate-spin" />
            ) : s && (
              <>
                <div><p className="text-3xl font-bold text-brand-400">{s.totalProjects}</p><p className="text-xs text-slate-500 mt-0.5">Projects</p></div>
                <div className="w-px h-10 bg-surface-border" />
                <div><p className="text-3xl font-bold text-slate-200">{s.totalTasks}</p><p className="text-xs text-slate-500 mt-0.5">Tasks</p></div>
                <div className="w-px h-10 bg-surface-border" />
                <div><p className="text-3xl font-bold text-violet-400">{s.totalMembers}</p><p className="text-xs text-slate-500 mt-0.5">Members</p></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat grid ── */}
      {!loadingOverview && s && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <BigStatCard icon={Layers}      label="Total Projects"   value={s.totalProjects}   accent="brand"   sub="across all teams" />
          <BigStatCard icon={Zap}         label="Active Projects"  value={s.activeProjects}  accent="emerald" sub="currently running" />
          <BigStatCard icon={BarChart3}   label="Total Tasks"      value={s.totalTasks}      accent="violet"  sub="in all projects" />
          <BigStatCard icon={CheckCircle2} label="Completed"       value={s.completedTasks}  accent="emerald" sub="tasks done" />
          <BigStatCard icon={AlertTriangle} label="Overdue"        value={s.overdueTasks}    accent={s.overdueTasks > 0 ? 'red' : 'slate'} sub="need attention" />
          <BigStatCard icon={Users}       label="Team Members"     value={s.totalMembers}    accent="violet"  sub="total users" />
        </div>
      )}
      {loadingOverview && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-surface-elevated animate-pulse" />)}
        </div>
      )}

      {/* ── Overview report card ── */}
      <div className="card overflow-hidden">
        {/* card header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20">
              <BarChart3 size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Full Overview Report</h2>
              <p className="text-sm text-slate-500 mt-0.5">Complete snapshot of all projects and team members in one document</p>
            </div>
          </div>
          <button
            onClick={handleDownloadOverview}
            disabled={loadingOverview || generatingOverview}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            {generatingOverview ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export PDF
          </button>
        </div>

        {/* What's included */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-surface-elevated rounded-xl border border-surface-border mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">What's included</p>
            <ul className="space-y-1.5">
              {INCLUDES_OVERVIEW.map(item => (
                <li key={item} className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-l border-surface-border pl-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Format</p>
            <div className="space-y-2">
              {[
                { label: 'File type', value: 'PDF (A4)' },
                { label: 'Branding', value: 'NeuroFlow header' },
                { label: 'Tables', value: 'Styled dark theme' },
                { label: 'Pages', value: `~${Math.ceil((projects.length + 2) / 10) + 1} pages` },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{r.label}</span>
                  <span className="text-xs text-slate-300 font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Project reports ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FolderKanban size={20} className="text-violet-400" />
              Project Reports
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Individual deep-dive report for each project</p>
          </div>
          {!loadingOverview && (
            <span className="badge bg-violet-500/15 text-violet-400 border-violet-500/25">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* What's in each project report */}
        <div className="flex flex-wrap gap-2 mb-5">
          {INCLUDES_PROJECT.map(item => (
            <span key={item} className="flex items-center gap-1.5 text-xs bg-surface-elevated border border-surface-border text-slate-400 px-3 py-1 rounded-full">
              <CheckCircle2 size={10} className="text-emerald-400" />{item}
            </span>
          ))}
        </div>

        {loadingOverview ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-surface-elevated animate-pulse" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-16">
            <FolderKanban size={40} className="mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500">No projects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => {
              const pr = overviewData?.projectRows?.find(r => r.name === project.name);
              const progress = pr ? parseInt(pr.progress) : 0;
              const riskScore = pr?.riskScore ?? 0;

              return (
                <div
                  key={project.id}
                  className="card hover:border-brand-500/30 transition-all duration-200 group"
                >
                  {/* Project header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusPill status={project.status} />
                        <RiskBadge score={riskScore} />
                      </div>
                      <h3 className="font-semibold text-slate-200 text-base truncate">{project.name}</h3>
                      {project.deadline && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={10} />
                          Deadline: {format(new Date(project.deadline), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownloadProject(project)}
                      disabled={downloadingProject === project.id}
                      className="btn-primary text-xs flex items-center gap-1.5 ml-3 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      {downloadingProject === project.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Download size={13} />}
                      PDF
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Progress</span>
                      <span className="text-xs font-semibold text-brand-400">{pr?.progress || '0%'}</span>
                    </div>
                    <ProgressBar
                      value={progress}
                      color={progress >= 75 ? 'bg-emerald-500' : progress >= 40 ? 'bg-brand-500' : 'bg-amber-500'}
                    />
                  </div>

                  {/* Stats strip */}
                  {pr && (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { icon: Layers,       label: 'Total',    value: pr.totalTasks,   color: 'text-slate-300' },
                        { icon: CheckCircle2, label: 'Done',     value: pr.doneTasks,    color: 'text-emerald-400' },
                        { icon: Clock,        label: 'Pending',  value: pr.pendingTasks, color: 'text-amber-400' },
                        { icon: AlertTriangle, label: 'Overdue', value: pr.overdueTasks, color: pr.overdueTasks > 0 ? 'text-red-400' : 'text-slate-600' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-surface-elevated rounded-xl p-2 text-center">
                          <stat.icon size={12} className={clsx('mx-auto mb-1', stat.color)} />
                          <p className={clsx('text-base font-bold leading-none', stat.color)}>{stat.value}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Members */}
                  {pr && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface-border">
                      <Users size={11} className="text-slate-500" />
                      <span className="text-xs text-slate-500">{pr.members} member{pr.members !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default AdminReports;
