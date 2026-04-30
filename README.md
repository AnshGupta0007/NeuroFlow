# NeuroFlow — Autonomous Team Intelligence System

> If Jira + Notion + an AI strategist had a child — that's NeuroFlow.

A full-stack team management platform that doesn't just track tasks — it **predicts**, **analyzes**, and **guides** teams in real time using behavioral AI and graph-based algorithms.

---

## What It Does

- **Manage projects & tasks** with a drag-and-drop Kanban board
- **Predict deadlines** using per-user velocity models
- **Detect bottlenecks** before they cause delays
- **Profile team behavior** with a 6-dimension Productivity DNA radar chart
- **Auto-balance workloads** with AI-powered rebalancing suggestions
- **Answer questions** in natural language ("Why is this delayed?", "Who's the bottleneck?")
- **Generate PDF reports** for admins — project-wide or per-project breakdowns
- **Enforce task dependencies** with automatic locking (can't start a task until its blockers are done)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Zustand, React Router v6, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js, Zod validation, Helmet |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (JWT tokens) |
| AI | Groq API (Llama 3.3 70B) + Rule-based engine |
| Deployment | Railway (separate backend + frontend services) |

---

## Project Structure

```
neuroflow/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── config/           # Supabase client, permission matrix
│   │   ├── middleware/        # JWT auth, RBAC, error handling
│   │   ├── modules/           # auth, projects, tasks, intelligence, analytics, admin
│   │   └── services/          # prediction, behavior, workload, graph algorithms
│   ├── database/schema.sql   # Full PostgreSQL schema
│   ├── .env.example
│   └── railway.json
└── frontend/                 # React + Vite SPA
    ├── src/
    │   ├── components/        # UI components (Kanban, AI, Charts, Modals)
    │   ├── pages/             # Dashboard, Projects, Intelligence, Analytics, Admin
    │   ├── store/             # Zustand global state
    │   └── services/          # Axios API client
    ├── .env.example
    └── railway.json
```

---

## Local Development

### Prerequisites
- Node.js >= 18
- A [Supabase](https://supabase.com) project (free tier works)
- A [Groq](https://console.groq.com) API key (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/your-username/neuroflow.git
cd neuroflow

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your values

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your values
```

**Backend `.env` variables:**

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `5000`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (admin operations) |
| `GROQ_API_KEY` | Groq API key for Llama 3.3 AI responses |
| `FRONTEND_URL` | Comma-separated allowed origins for CORS |

**Frontend `.env` variables:**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g., `http://localhost:5000`) |

### 3. Set up the database

1. Go to your Supabase project → **SQL Editor**
2. Paste and run the contents of `backend/database/schema.sql`

### 4. Run locally

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## Deploy to Railway

Railway hosts backend and frontend as **two separate services** in one project.

### Step-by-step

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repository

#### Backend service
- Click **Add Service** → select the repo
- In service settings → **Root Directory**: `backend`
- Add environment variables (all from `.env.example`)
- Railway will auto-detect Node.js and run `node src/app.js`

#### Frontend service
- Click **Add Service** → select the same repo
- In service settings → **Root Directory**: `frontend`
- Add environment variable: `VITE_API_URL=https://your-backend-service.railway.app`
- Railway will run `npm run build` then `npm run start` (serves via `vite preview`)

#### CORS setup
In the **backend** service environment variables, set:
```
FRONTEND_URL=https://your-frontend-service.railway.app
```

Both services have `railway.json` files in their directories with the correct build/start commands pre-configured.

---

## API Reference

### Auth
```
POST  /api/auth/signup          Register new user
POST  /api/auth/signin          Login
GET   /api/auth/profile         Get current user profile
```

### Projects
```
GET   /api/projects             List user's projects
POST  /api/projects             Create project
GET   /api/projects/:id         Get project details
PATCH /api/projects/:id         Update project
DELETE /api/projects/:id        Delete project
```

### Tasks
```
GET   /api/projects/:id/tasks                          List tasks
POST  /api/projects/:id/tasks                          Create task
PATCH /api/projects/:id/tasks/:taskId                  Update task
DELETE /api/projects/:id/tasks/:taskId                 Delete task
GET   /api/projects/:id/tasks/dependencies             Get dependency graph
POST  /api/projects/:id/tasks/:taskId/dependencies     Add dependency
DELETE /api/projects/:id/tasks/:taskId/dependencies/:depId  Remove dependency
POST  /api/projects/:id/tasks/:taskId/time             Log time
```

### Intelligence
```
GET  /api/projects/:id/intelligence        Full intelligence report
POST /api/projects/:id/intelligence/ask    Ask AI a question
GET  /api/projects/:id/intelligence/focus  Focus mode recommendations
```

### Analytics
```
GET  /api/analytics/dashboard        Personal / admin dashboard data
GET  /api/analytics/projects/:id     Per-project analytics
GET  /api/analytics/productivity     Productivity DNA + behavior data
```

### Admin
```
GET  /api/admin/users                    List all users
PATCH /api/admin/users/:id/role          Change user role
GET  /api/admin/reports/overview         Download data for overview PDF
GET  /api/admin/reports/project/:id      Download data for project PDF
```

---

## Role-Based Access Control

| Action | Admin | Member | Observer |
|---|---|---|---|
| View projects | ✅ | ✅ (member of) | ✅ (member of) |
| Create project | ✅ | ✅ | ❌ |
| Delete project | ✅ | ❌ | ❌ |
| Create / update task | ✅ | ✅ | ❌ |
| Delete task | ✅ | ✅ (own) | ❌ |
| Manage members | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ |
| View intelligence | ✅ | ✅ | ✅ |
| Admin dashboard (all teams) | ✅ | ❌ | ❌ |
| Download reports | ✅ | ❌ | ❌ |
| Change user roles | ✅ | ❌ | ❌ |

Project-level roles (set per project) override global roles.

---

## Intelligence Modules

### Predictive Deadline Engine
Calculates per-user task velocity over 30 days, then projects the team completion date based on remaining workload. Outputs a delay risk percentage and identifies which users are bottlenecks.

### Behavior-Based Productivity Engine
Tracks hour-of-day task completion patterns to find peak productivity windows. Measures speed ratio, delay rate, punctuality, and focus score. Classifies users into archetypes: Fast Worker, Consistent Worker, Last-Minute Worker, Risk Creator, Balanced Worker.

### Dynamic Workload Balancer
Scores each team member's load using `priority_weight × effort_estimate`. Classifies as overloaded / heavy / balanced / light. Generates specific rebalancing suggestions.

### Task Dependency Graph
Directed acyclic graph stored in `task_dependencies`. Cycle detection prevents invalid graphs. Critical path computed via topological sort + longest-path algorithm. Tasks are automatically locked until their blockers are complete.

### AI Decision Assistant
Combines a rule-based engine (fast, always available) with Groq's Llama 3.3 70B model. Answers questions like: "Why is the project delayed?", "Who should I reassign tasks to?", "What should I work on next?", "How can I fix the bottleneck?"

---

## Database Schema

8 tables with foreign keys, indexes, and Row Level Security policies:

| Table | Purpose |
|---|---|
| `users` | Global profiles with role (admin/member/observer) |
| `projects` | Projects with auto-updated risk_score and complexity_score |
| `project_members` | Per-project role overrides |
| `tasks` | Tasks with priority, energy_type, effort estimates, time tracking |
| `task_dependencies` | Directed dependency graph edges |
| `activity_logs` | Immutable project history |
| `productivity_metrics` | Cached per-user behavioral metrics |
| `predictions_cache` | Cached deadline prediction results |

---

## License

MIT
