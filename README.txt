====================================================================
  NEUROFLOW — AUTONOMOUS TEAM INTELLIGENCE SYSTEM
  Full-Stack Web Application | Computer Science Project
====================================================================

OVERVIEW
--------
NeuroFlow is a full-stack team management platform built from scratch.
It goes beyond basic task tracking by using AI and behavioral analytics
to predict project outcomes, detect bottlenecks, and guide teams.

Think of it as Jira + Notion + an AI strategist combined into one
application — built entirely by the developer from the ground up.


WHAT THE APPLICATION DOES
--------------------------
1. Project & Task Management
   - Create and manage multiple projects
   - Drag-and-drop Kanban board (Todo → In Progress → Done)
   - Task dependencies with automatic locking (a task cannot be started
     until all tasks it depends on are completed)
   - Time tracking per task

2. AI-Powered Deadline Prediction
   - Analyzes each team member's historical task velocity
   - Predicts whether the project will finish on time
   - Shows delay risk percentage (0–100%) with explanations

3. Behavioral Productivity Analysis (Productivity DNA)
   - Tracks 6 dimensions: Speed, Consistency, Punctuality,
     Reliability, Throughput, and Focus
   - Identifies each user's peak productivity hours
   - Classifies user archetypes (Fast Worker, Risk Creator, etc.)
   - Visualized as a radar/spider chart

4. Workload Balancer
   - Automatically detects overloaded vs. underloaded team members
   - Suggests specific task reassignments with estimated impact

5. Task Dependency Graph
   - Visual network diagram of task relationships
   - Critical path calculation (the sequence of tasks that determines
     the minimum project completion time)
   - Cycle detection to prevent invalid dependency chains

6. AI Decision Assistant
   - Natural language question answering about the project
   - Powered by Groq's Llama 3.3 70B large language model
   - Also has a rule-based fallback that always works offline
   - Example questions: "Why is the project delayed?",
     "Who should I reassign tasks to?", "What's blocking progress?"

7. Admin Panel
   - Platform-wide visibility across all teams and projects
   - Download professional PDF reports (overview or per-project)
   - Reports include completion statistics, risk analysis,
     member contribution breakdowns, and task status summaries

8. Landing Page
   - Professional marketing landing page with animated UI
   - Live statistics counters, feature cards, demo screenshots


TECHNICAL HIGHLIGHTS
--------------------
This project demonstrates competency across the full technology stack:

  Frontend:
  - React 18 (component-based UI library)
  - Zustand (global state management)
  - Tailwind CSS (utility-first styling)
  - Recharts (data visualization / charts)
  - jsPDF (programmatic PDF generation with dark branding)

  Backend:
  - Node.js with Express.js (REST API)
  - Zod (runtime input validation and type safety)
  - Helmet (HTTP security headers)
  - JWT-based authentication (via Supabase Auth)

  Database:
  - Supabase (hosted PostgreSQL)
  - Row Level Security (RLS) policies — users can only access
    data they are authorized to see, enforced at the database level
  - 8 relational tables with proper foreign keys and indexes

  AI / Algorithms:
  - Groq API integration (Llama 3.3 70B language model)
  - Graph algorithms: topological sort, longest path (critical path),
    cycle detection — implemented from scratch
  - Velocity-based deadline prediction model
  - Behavioral scoring across 6 productivity dimensions

  Deployment:
  - Hosted on Railway (cloud platform)
  - Backend and frontend deployed as separate services
  - Environment-based configuration (no secrets in source code)
  - Health check endpoint for zero-downtime deployments


ROLE-BASED ACCESS CONTROL
--------------------------
Three roles with different permissions:

  Admin   — Full access: all projects, all users, reports, role management
  Member  — Standard access: their projects, tasks, analytics
  Observer — Read-only access: can view but not modify anything


PROJECT SCALE
-------------
  - 40+ React components
  - 20+ backend API endpoints
  - 8 database tables
  - 6 intelligence/analytics modules
  - 3 deployment configuration files
  - 1 complete database schema with security policies


TECHNOLOGIES USED (FULL LIST)
------------------------------
React, Vite, Tailwind CSS, Zustand, React Router, Recharts,
Axios, jsPDF, date-fns, Node.js, Express.js, Zod, Morgan,
Helmet, CORS, Supabase (PostgreSQL + Auth), Groq AI API,
Railway (cloud deployment), Git, NPM


HOW TO RUN (FOR EVALUATORS)
----------------------------
A live deployment is available at:
  Frontend: [your Railway frontend URL]
  Backend:  [your Railway backend URL]

Demo credentials:
  Admin account:  admin@neuroflow.app / [password]
  Member account: member@neuroflow.app / [password]

To run locally, see README.md for full setup instructions.


====================================================================
  Built by: Ansh Gupta
  Contact:  anshguptasjs@gmail.com
  Year:     2025–2026
====================================================================
