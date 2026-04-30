-- NeuroFlow Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'observer')),
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- ============================================================
-- PROJECTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              TEXT NOT NULL,
    description       TEXT,
    status            TEXT NOT NULL DEFAULT 'planning'
                        CHECK (status IN ('planning', 'active', 'on_hold', 'completed')),
    deadline          TIMESTAMPTZ,
    complexity_score  INTEGER DEFAULT 0 CHECK (complexity_score BETWEEN 0 AND 100),
    risk_score        INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    created_by        UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_deadline ON public.projects(deadline);

-- ============================================================
-- PROJECT_MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin', 'member', 'observer')),
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            TEXT NOT NULL,
    description      TEXT,
    project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assignee_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status           TEXT NOT NULL DEFAULT 'todo'
                       CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
    priority         TEXT NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    energy_type      TEXT CHECK (energy_type IN ('deep_work', 'shallow_work')),
    effort_estimate  NUMERIC(6,2),   -- hours
    time_spent       NUMERIC(8,2) DEFAULT 0,  -- minutes
    due_date         TIMESTAMPTZ,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_completed_at ON public.tasks(completed_at);

-- ============================================================
-- TASK_DEPENDENCIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id               UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

CREATE INDEX idx_task_deps_task ON public.task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX idx_task_deps_project ON public.task_dependencies(project_id);

-- ============================================================
-- ACTIVITY_LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_project ON public.activity_logs(project_id);
CREATE INDEX idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_action ON public.activity_logs(action);

-- ============================================================
-- PRODUCTIVITY_METRICS TABLE (for caching computed metrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.productivity_metrics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    metric_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    tasks_completed INTEGER DEFAULT 0,
    avg_speed_ratio NUMERIC(4,2) DEFAULT 1.0,
    delay_rate      NUMERIC(5,2) DEFAULT 0,
    focus_sessions  INTEGER DEFAULT 0,
    peak_hour_start INTEGER,
    peak_hour_end   INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id, metric_date)
);

CREATE INDEX idx_metrics_user ON public.productivity_metrics(user_id);
CREATE INDEX idx_metrics_date ON public.productivity_metrics(metric_date DESC);

-- ============================================================
-- PREDICTIONS_CACHE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.predictions_cache (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    delay_risk      INTEGER NOT NULL,
    predicted_end   TIMESTAMPTZ,
    complexity_score INTEGER,
    risk_factors    JSONB DEFAULT '[]',
    bottlenecks     JSONB DEFAULT '[]',
    computed_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id)
);

CREATE INDEX idx_predictions_project ON public.predictions_cache(project_id);
CREATE INDEX idx_predictions_computed_at ON public.predictions_cache(computed_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions_cache ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by backend)
-- Users can read their own profile
CREATE POLICY "users_own_profile" ON public.users
    FOR ALL USING (auth.uid() = id);

-- Project members can access their projects
CREATE POLICY "project_members_access" ON public.projects
    FOR ALL USING (
        id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
