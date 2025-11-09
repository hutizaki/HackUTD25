# AIO SaaS Management Platform — 24‑Hour Hackathon Product Spec

**Date:** Nov 8, 2025
**Event:** 24‑hour hackathon
**Team:** TBD (Recommended: 3-5 members)
**Version:** v1.0 (for review)

---

## 0) TL;DR

Build an **All‑in‑One SaaS Management Platform** with a **web app (primary)** and a **mobile‑friendly companion (PWA for Day‑1)** that orchestrates:

* **Project & Team setup**, **Integrations**, and an **Agent‑centric command chat**.
* **Automations** across **planning → tickets → code → review → test → deploy → marketing → analytics**.
* **GitHub Actions** + **Express** webhook “glue” to run jobs and stream status back to the UI.
* **Cloud (Headless) Cursor Agents** for AI roles (PM, FE, BE, QA, DevOps, etc.).

**Day‑1 MVP demo:** Create a project, connect to GitHub, ask the PM Agent to scaffold tasks, open tickets, spin a feature branch, propose a code change, run CI via GitHub Actions, merge to main (simulated), deploy to a demo container, and show live status/analytics. Generate marketing copy from the release notes.

---

## 1) Problem & Vision

**Problem:** Product teams juggle disparate tools (tickets, code, CI, docs, analytics). It’s tedious to coordinate, repetitive to create scaffolds, and brittle to keep status in sync.

**Vision:** A single surface where PMs/developers **chat with agents** to perform routine actions, visualize status, and orchestrate the full lifecycle. The platform ties together **integrations**, **AI agents**, and **automations** to deliver outcomes quickly.

---

## 2) Goals & Non‑Goals

**Goals (Day‑1 MVP):**

1. Simple onboarding: sign up → create project → connect GitHub → enable agents.
2. Dashboard with **overview widgets** + a **chat input** to trigger workflows.
3. Working **GitHub Actions** pipeline (triggered PR/test/build) with **Express** webhook callback.
4. **Ticketing** backed by GitHub Issues (or local Mongo fallback) with real‑time status updates.
5. **Code module** shows branches/PRs and lets an Agent propose a change via PR.
6. **Agents module** (Cloud Headless Cursor Agents) executes tasks with guardrails.
7. **Analytics panel** with 3–5 core metrics (seeded + live events capture).
8. **Marketing module** generates release notes → blog/social snippets.
9. Mobile: **responsive PWA** to view status and approve actions.
10. End‑to‑end **Autonomous Run** from a single user prompt to deployed code and a final response message — **zero manual intervention**, with full step‑by‑step visibility in the UI.

**Non‑Goals (Day‑1):**

* Deep third‑party breadth (Jira, Notion, etc.) beyond GitHub + basic Slack/Discord webhook.
* Full enterprise RBAC/SSO, SOC2, or granular policy engines.
* True multi‑region HA; production‑grade scaling.

---

## 3) User Personas

* **Product Manager (PM):** Creates projects, defines goals, wants quick insights and automation. Heavy user of the chat command surface.
* **Developer (FE/BE):** Works in Git. Wants auto‑scaffolded PRs, code review, and CI feedback inside the platform.
* **DevOps/QA:** Cares about pipelines, artifact promotion, test health, and one‑click deploy/rollback.

---

## 4) Core User Journeys

1. **Onboard & Connect**: Sign up → Create Project → Connect GitHub (OAuth) → Select repo → Install webhook → Enable default agents.
2. **Plan**: In chat, “Draft initial roadmap from README” → PM Agent creates 3–5 epics with child tickets.
3. **Implement**: “Start ‘User auth’ epic” → FE/BE Agents create a branch, scaffold code, open a PR, trigger CI.
4. **Review & Test**: QA Agent posts PR review checklist; CI runs tests; status streams to dashboard.
5. **Deploy**: DevOps Agent merges PR to main (guarded), builds Docker image, deploys container (local docker‑compose), posts URL.
6. **Market & Measure**: Marketing Agent produces release notes + social copy; Analytics updates dashboard KPIs.

---

## 5) Product Scope (MVP vs Stretch)

**MVP Modules:** Project/Team, Integrations, Agents, Ticketing (GitHub Issues), Code (branches/PRs), CI/CD bridge, Analytics (basic), Marketing (copy generator), Research & Insights (light, prompt‑based), Settings.

**Stretch (time‑permitting):** Mobile app (Expo) native shell, visual Kanban, in‑browser code diff, PostHog integration, multi‑env deployments, role‑based approvals.

---

## 6) Information Architecture & Navigation

* **Sidebar:** Dashboard, Projects, Tickets, Code, Agents, Analytics, Marketing, Insights, Settings.
* **Topbar:** Project switcher, environment (Dev/Prod), notifications, user menu.
* **Dashboard:** KPIs (tickets open/closed, CI status, deploy status), Activity stream, Agent chat.

---

## 7) UX Principles

* Instant comprehension, 2‑click access to critical actions.
* Chat‑first control with slash commands (e.g., `/plan`, `/ticket`, `/branch`, `/deploy`).
* Live status streaming (Server‑Sent Events or WebSocket) for runs.
* Clear **guardrails** and approval prompts for risky actions (merge/deploy).

---

## 8) Tech Stack

* **Frontend:** React + TypeScript + Vite + Tailwind + Framer Motion. State: TanStack Query; Router: react‑router.
* **Backend:** Express (Node), MongoDB (Mongoose). Optional Redis (BullMQ) if we add queues; for MVP we can use in‑process jobs.
* **CI/CD:** GitHub Actions.
* **Containers:** Docker; local `docker-compose` for demo (api, mongo, web, optional redis).
* **AI:** Cloud (Headless) Cursor Agents (external API; token via secrets).
* **Mobile:** PWA (responsive, installable). Stretch: Expo RN wrapper.

---

## 9) System Architecture

```
[Web (React)]  ←→  [Express API]  ←→  [MongoDB]
      ↑                 ↓  ↑              ↑
[Agent Chat UI]    [Webhook In]   [Analytics Events]
      ↑                 ↑  \\           ↓
[Cursor Cloud Agents]  [GitHub Actions]  [docker-compose Deployer]
```

**Data flow (key paths):**

1. User submits chat → API interprets → calls Cursor Agent → Agent uses tools (GitHub API, Tickets, etc.) → results streamed to UI.
2. Git push/PR triggers GitHub Actions → workflow notifies API via webhook → API updates run status → UI live updates.
3. Deploy job builds container and runs service (demo env) → healthcheck → URL shared.

## 9A) Autonomous Orchestration (Hands‑Off Mode)

**Intent:** From the user's **single prompt** (description + size), the system creates a hierarchical issue structure, executes development workflow, and deploys based on user settings — all actions are **automated** yet **visible** in the UI.

**Execution model**

* **Code Module** receives: description + size (Initiative/New Feature/Maintenance/Bug Fix)
* **Product Manager Agent** creates hierarchical issue structure:
  * Initiative → Roadmap → Epics → Stories → Tickets
  * New Feature → Epic → Stories → Tickets
  * Maintenance → Story → Tickets
  * Bug Fix → Ticket
* **Branch Strategy:**
  * Root issues branch from `integration` branch
  * Sub-issues branch from parent issue branch
  * Hierarchical branch structure mirrors issue hierarchy
* **Development Workflow:**
  * Dev Agents work on code for each issue
  * PRs created from issue branch to parent branch (or `integration` if root)
  * QA Agents review PRs
  * Critical issues become "Defect" issues (must be resolved before merge)
* **Completion:**
  * Root issue resolved → Final testing → Merge to `regression` branch → Deploy per user settings
* **Tool adapters**: GitHub (Issues/PR/Actions), Docker/deployer, Marketing generator, Analytics emitter.
* **Run visibility**: a **timeline** (SSE) shows each sub‑step (created issues, branch names, PR URLs, CI run IDs, deploy URL, generated assets).
* **Safety/limits**: sandbox repo/branch isolation, timeboxed runs, kill switch, retries with backoff; on hard failure, the run is marked **needs attention** with logs.
* **Configuration**: `autonomy = full | supervised`; demo uses **full**.

**Pseudocode (conceptual)**

```text
onCodeRequest(description, size):
  // Step 1: PM Agent creates hierarchical issues
  issueHierarchy = PM.createIssues(description, size)
  // size determines hierarchy:
  //   Initiative → Roadmap → Epics → Stories → Tickets
  //   New Feature → Epic → Stories → Tickets
  //   Maintenance → Story → Tickets
  //   Bug Fix → Ticket
  
  // Step 2: Create branches for root issues from integration
  for rootIssue in issueHierarchy.roots:
    branch = Git.createBranch(f"issue/{rootIssue.number}-{slug}", base="integration")
    rootIssue.branch = branch
  
  // Step 3: Process issues hierarchically
  processIssues(issueHierarchy.roots)
  
  // Step 4: When root issue completed, merge to regression
  if rootIssue.completed:
    finalTesting()
    Git.merge(rootIssue.branch, "regression")
    deploy(userSettings)
  
  return FinalMessage(url, notes, links={issues, prs, ci:url})

processIssues(issues):
  for issue in issues:
    // Create branch for sub-issues from parent branch
    if issue.parent:
      branch = Git.createBranch(f"issue/{issue.parent.number}/{issue.number}-{slug}", base=issue.parent.branch)
    else:
      branch = issue.branch
    
    // Dev Agent generates code
    changes = DevAgent.generateCode(issue, branch)
    Git.commit(branch, changes)
    
    // Create PR to parent branch (or integration if root)
    baseBranch = issue.parent?.branch || "integration"
    pr = Git.openPR(branch, base=baseBranch, body=changes.notes)
    
    // QA Agent reviews PR
    review = QAAgent.review(pr)
    if review.hasCriticalIssues:
      defects = createDefectIssues(review.criticalIssues, issue)
      // Must resolve defects before merge
      waitForDefectsResolved(defects)
    
    // CI runs
    CI.trigger(pr)
    CI.waitUntilGreen(pr)
    
    // Merge PR
    Git.merge(pr)
    
    // Process child issues
    if issue.children:
      processIssues(issue.children)
```

---

## 10) Modules & Requirements

### 10.1 Project & Team Management

* Create organization → project(s).
* Invite collaborators by email; roles: **Owner**, **Member** (simple ACL for MVP).
* Store: `organizations`, `projects`, `memberships`.

### 10.2 AI Agents Module

* **Agent Types:** Product Manager, Frontend Manager, Backend Manager, InfoSec Manager, Module Managers, QA, Deployment Engineer.
* **Agent Schema (conceptual):**

```json
{
  "name": "QA Agent",
  "role": "quality_assurance",
  "goals": ["increase test coverage", "prevent regressions"],
  "tools": ["github", "ticketing", "ci"],
  "constraints": ["read-only on production"],
  "guardrails": ["require human approval to merge or deploy"],
  "memories": {"project_context": "..."}
}
```

* **Execution:** API calls Cursor Headless Agents endpoint with a prompt + tool context. **Outputs** are structured as actionable steps and logs.
* **Guardrails:** Any destructive action requires explicit user confirmation in UI.

### 10.3 Ticketing Module

* MVP backed by **GitHub Issues**: list/create/update close; labels = status; milestone=epic.
* Offline fallback: local `tickets` collection if repo not connected.
* Views: **Table**, **simple Kanban (stretch)**.

### 10.4 Code Module

**Input:** Description of changes + size classification:
* **Initiative** (Big Project) → Creates Roadmap → Epics → Stories → Tickets
* **New Feature** (Medium Addition) → Creates Epic → Stories → Tickets
* **Maintenance** (Small Change) → Creates Story → Tickets
* **Bug Fix** (Tiny Fix) → Creates Ticket

**Workflow:**
1. **Product Manager Agent** receives input and creates hierarchical issue structure via GitHub Issues/Webhooks
2. **Branch Strategy:**
   * Root issues branch from `integration` branch
   * Sub-issues branch from their parent issue branch
   * Branch naming: `issue/{issue-number}-{slug}` or `issue/{parent-number}/{child-number}-{slug}`
3. **Development:**
   * Dev Agents work on code for each issue
   * When issue completed, create PR from issue branch to parent branch (or `integration` if root)
4. **QA Review:**
   * QA Agents review PRs
   * Critical bugs/defects become "Defect" issues
   * Defect issues must be resolved before merging
5. **Completion:**
   * When root issue resolved (user request completed):
     * Final testing
     * Merge to `regression` branch
     * Deploy based on user settings

**Features:**
* Show repos, branches, PRs, checks
* Hierarchical issue visualization
* Branch dependency tracking
* PR status and review tracking
* Defect issue management

### 10.5 CI/CD Bridge

* **GitHub Actions** workflow files in repo (see §16) run tests/build.
* **Express webhook** receives:

  * `pull_request`, `push`, `workflow_job`, `workflow_run` events.
* Status sync and activity feed in UI.

### 10.6 Marketing Module

* Generate **release notes**, **blog outline**, **tweet/LinkedIn** copy from tickets/PRs/commit messages.
* Stretch: short‑form video script + shot list (export as JSON).

### 10.7 Analytics Module

* Capture **events** from web (page views, action clicks) → API → Mongo `analytics_events`.
* Compute KPIs: DAU (simulated), avg load time (seeded), session length (mock), active users now (simulated).
* Stretch: integrate PostHog or Plausible.

### 10.8 Research & Insights Module

* Prompt templates for “industry trend summary” using Agents.
* Outputs: concise insight cards with action suggestions.

### 10.9 Frontend Module (UI)

* React component library: Tailwind UI pattern + Framer Motion micro‑interactions.
* Key components: Sidebar, Topbar, Dashboard Widgets, Chat Panel, Tickets Table, PR List, Run Timeline, Deploy Card.

### 10.10 Backend Module

* Express routes (REST) + SSE for live streams.
* Long‑running processes (LRPs) via async handlers; cancel tokens (stretch).

### 10.11 Mobile Module

* **MVP:** PWA, add to home screen; key views: Dashboard summary, Approvals, Notifications.
* **Stretch:** Expo RN app consuming same API.

### 10.12 Integrations Module

* **GitHub** (OAuth App or App installation): repos, issues, PRs, actions, webhooks.
* **Slack/Discord** (webhook) for notifications (stretch).
* **Cursor Cloud Agents** token management.

---

## 11) Data Model (Mongo Collections)

* `users` { _id, email, name, avatar, auth_provider, created_at }
* `organizations` { _id, name, owner_user_id }
* `memberships` { _id, org_id, user_id, role }
* `projects` { _id, org_id, name, description, repo_url, default_branch, created_at }
* `integrations` { _id, project_id, type: "github|slack|cursor", access_token_ref, metadata }
* `tickets` { _id, project_id, source: "github|local", external_id, title, status, labels[], assignee, created_at }
* `agents` { _id, project_id, type, config, enabled }
* `agent_runs` { _id, project_id, agent_id, input, steps[], status, output, created_at }
* `workflows` { _id, project_id, type, trigger, status, logs[] }
* `webhooks` { _id, project_id, provider, secret_hash, last_event_at }
* `deployments` { _id, project_id, env, version, status, url, logs[] }
* `analytics_events` { _id, project_id, user_id?, type, ts, payload }
* `secrets` { _id, project_id, key, value_enc, created_at }

---

## 12) API Surface (MVP)

**Auth**

* `POST /api/auth/login` (email magic link or GitHub OAuth callback).

**Projects**

* `POST /api/projects` create; `GET /api/projects/:id` read.

**Integrations**

* `POST /api/integrations/github/oauth/callback` saves token ref.
* `POST /api/integrations/github/webhook` (signature‑verified receiver).

**Agents**

* `POST /api/agents/:id/run` → starts a run, streams via SSE: `/api/agents/:id/stream/:runId`.

**Tickets**

* `GET /api/projects/:id/tickets` (proxy GitHub or local); `POST` create.

**Code/CI**

* `GET /api/projects/:id/prs`; `POST /api/projects/:id/branch`.
* `POST /api/ci/webhook` receive Actions status.

**Deploy**

* `POST /api/projects/:id/deploy` builds Docker image and runs `docker-compose up -d` (demo env).

**Analytics**

* `POST /api/analytics/events` ingest; `GET /api/analytics/summary` KPIs.

---

## 13) Chat Command Grammar

* Natural language is default; slash commands give determinism:

  * `/plan <goal>` generate epics/tasks.
  * `/ticket new <title> [labels]` create ticket.
  * `/branch <name>` create branch from default.
  * `/pr <branch> -> <base>` open PR.
  * `/deploy <env>` deploy current main.
  * `/notes` generate release notes from merged PRs.
* `/auto <objective>` **one‑shot autonomous run** from prompt → deploy → final message (hands‑off).

---

## 14) Security, Privacy, Guardrails

* **Auth**: JWT session; HTTPS only.
* **Secrets**: `.env` for dev; stored encrypted at rest (AES‑GCM) in `secrets` for demo.
* **Webhooks**: HMAC signature verification for GitHub; replay protection via `delivery_id` cache.
* **Scopes**: Request minimum GitHub scopes (repo, workflow).
* **Guardrails**: Two modes — **Autonomous Run (default for hackathon)** executes plan→tickets→branch→PR→CI→deploy **without user approvals** while streaming every step to the UI; **Supervised Mode (regulated environments)** requires human approval for merge/deploy and enforces read‑only policies on production.

---

## 15) Observability & Health

* Request logging (pino), error tracking basic.
* Run timeline stored to `agent_runs` and `workflows`.
* `/healthz` and `/readyz` endpoints; deploy card checks these and renders status.

---

## 16) GitHub Actions & Express “Glue”

**Workflows (committed to the demo repo):**

1. `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]
jobs:
  build_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test --if-present
      - run: npm run build --if-present
      - name: Notify Platform
        run: |
          curl -X POST "$PLATFORM_WEBHOOK_URL" \
            -H "Authorization: Bearer $PLATFORM_WEBHOOK_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"event":"ci_status","ref":"${{ github.ref }}","sha":"${{ github.sha }}","status":"success"}'
        env:
          PLATFORM_WEBHOOK_URL: ${{ secrets.PLATFORM_WEBHOOK_URL }}
          PLATFORM_WEBHOOK_TOKEN: ${{ secrets.PLATFORM_WEBHOOK_TOKEN }}
```

2. `.github/workflows/deploy.yml` (manual + on main)

```yaml
name: Deploy
on:
  workflow_dispatch:
  push:
    branches: [ main ]
jobs:
  docker_build_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t demoapp:${{ github.sha }} .
      - name: Notify Platform (ready to run compose)
        run: |
          curl -X POST "$PLATFORM_WEBHOOK_URL" \
            -H "Authorization: Bearer $PLATFORM_WEBHOOK_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"event":"deploy_ready","image":"demoapp:${{ github.sha }}"}'
        env:
          PLATFORM_WEBHOOK_URL: ${{ secrets.PLATFORM_WEBHOOK_URL }}
          PLATFORM_WEBHOOK_TOKEN: ${{ secrets.PLATFORM_WEBHOOK_TOKEN }}
```

**Express Webhook Endpoints:**

* `POST /api/ci/webhook` and `/api/integrations/github/webhook`:

  * Verify `X-Hub-Signature-256` or bearer token.
  * Persist event → broadcast via SSE to UI (dashboard + run timeline).

**Docs to include in repo README:**

* How to set **repository secrets**: `PLATFORM_WEBHOOK_URL`, `PLATFORM_WEBHOOK_TOKEN`.
* How to install GitHub webhook (if using event hooks instead of curl step).

---

## 17) Deployment (Demo)

* Local `docker-compose.yml` runs: `api`, `web`, `mongo` (and optional `redis`).
* `api` exposes `/healthz`; `web` serves Vite build.
* For demo, deploy to local or a single VM. URL surfaced to dashboard.

**docker-compose.yml (MVP):**

```yaml
version: '3.9'
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes:
      - mongo_data:/data/db
  api:
    build: ./api
    environment:
      - MONGO_URL=mongodb://mongo:27017/aiosaas
      - JWT_SECRET=${JWT_SECRET}
      - CURSOR_API_KEY=${CURSOR_API_KEY}
    ports: ["8080:8080"]
    depends_on: [ mongo ]
  web:
    build: ./web
    ports: ["5173:5173"]
    environment:
      - VITE_API_BASE=http://localhost:8080
    depends_on: [ api ]
volumes:
  mongo_data:
```

---

## 18) Frontend Notes

* **State:** TanStack Query fetch/cache; optimistic updates for tickets.
* **SSE Hook:** `useEventSource(url)` to stream run status.
* **UI polish:** Framer Motion for page transitions and toasts.
* **Accessibility:** focus rings, keyboard shortcuts (`/` to focus chat).

---

## 19) Agent Prompts (Starters)

* **PM Agent:** “Given repo README and open issues, propose 3 epics with child tasks; label by area (FE/BE/QA).”
* **FE Agent:** “Create `feature/<slug>` branch; scaffold component; open PR with checklist.”
* **BE Agent:** “Add Express route for /healthz with tests; update OpenAPI excerpt.”
* **QA Agent:** “Generate PR review checklist + minimal Jest test skeleton.”
* **DevOps Agent:** “Trigger Deploy workflow; monitor status; request approval before promote.”
* **Marketing Agent:** “Draft release notes + 3 social snippets and a changelog entry.”

---

## 20) Research & Insights (MVP)

* Prompt templates using Cursor Agents to summarize **industry trend** based on a user‑provided query; render cards with: **Insight**, **Evidence (links)**, **Suggested Action**. (For hackathon, we can stub evidence links.)

---

## 21) Testing Strategy

* **Backend:** Unit tests for helpers (signature verify, mapping), integration smoke for key routes.
* **Frontend:** Render tests for critical components (Dashboard, Chat, Tickets).
* **E2E (manual):** Use the demo script (see §26) to validate.
* **CI gates:** `npm test` must pass; typecheck for web/api.

---

## 22) Risks & Mitigations

* **OAuth/Webhooks brittle:** Start with PAT + repo webhook if OAuth setup stalls.
* **Cursor API unknowns:** Keep a local “Mock Agent” fallback to simulate outputs.
* **Time constraints:** Strict MVP cutlines; defer Kanban, deep analytics, native mobile.
* **Docker on demo machine:** Pre‑pull images; have local fallback `npm start` path.

---

## 23) Success Metrics (Hackathon)

* End‑to‑end demo succeeds live (green checks in UI).
* < 5 min from project creation to first automated PR.
* One‑click deploy produces a reachable URL.
* Judges understand value within 60 seconds (storyboard flows cleanly).

---

## 24) Project Structure

```
repo/
  api/
    src/
      routes/
      services/
      integrations/
      models/
      lib/
    test/
    Dockerfile
  web/
    src/
      components/
      pages/
      hooks/
      lib/
    Dockerfile
  .github/workflows/
  docker-compose.yml
  README.md
```

---

## 25) .env Template (Dev)

```
# API
PORT=8080
MONGO_URL=mongodb://localhost:27017/aiosaas
JWT_SECRET=change_me
CURSOR_API_KEY=sk_cursor_...
PLATFORM_WEBHOOK_TOKEN=change_me

# Web
VITE_API_BASE=http://localhost:8080

# GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET=...
```

---

## 26) Demo Script (5–7 minutes)

1. **Pitch (15s):** “Hands‑off agents that ship code end‑to‑end.”
2. **Single‑Prompt Run (90–120s):** In chat: `/auto Build a login + dashboard starter using Express API + React web; set up CI, deploy, and give me the URL and release notes.`

   * Watch the **timeline**: plan → tickets → branch → PR → CI → deploy.
   * Links appear live (issue IDs, PR, CI run, deployed URL).
3. **Show the App (45s):** Open deployed URL; hit `/healthz`.
4. **Artifacts (45s):** View generated release notes + social snippets.
5. **Analytics (30s):** Show new release event and basic KPIs.
6. **Wrap (15s):** Reiterate **autonomous** + **visible** value prop.

## 27) Timeline (24‑Hour Execution)

* **H0–H1.5**: Finalize scope, create repos, boilerplates, envs.
* **H1.5–H4**: Backend scaffolding (auth, projects, integrations, webhooks).
* **H2–H6**: Frontend scaffold (layout, dashboard, chat, tickets list).
* **H4–H8**: GitHub Actions & webhook glue; run timeline UI.
* **H6–H10**: Agents integration (Cursor + mock fallback); PM/FE/QA flows.
* **H10–H14**: Deploy module + docker‑compose; healthchecks.
* **H14–H18**: Analytics events + widgets; marketing text generator.
* **H18–H22**: Polish UX, seed data, demo hardening.
* **H22–H24**: Dry runs, bug fixes, final cutlines.

**Roles:**

* FE lead, BE lead, Integrations/DevOps, Agent prompts/flows, Demo owner.

---

## 28) Acceptance Criteria (MVP)

* [ ] Create project and connect GitHub without manual DB edits.
* [ ] Receive at least one webhook or curl status update and render it live.
* [ ] Create ticket from chat and see it in Tickets list.
* [ ] Open PR from platform (or simulate) and visualize CI status.
* [ ] Trigger deploy endpoint and get green health check + visible URL.
* [ ] Generate marketing text from current release context.

---

## 29) Stretch Goals (if time remains)

* Visual Kanban with drag‑drop.
* Native mobile wrapper (Expo) with push notifications.
* PostHog analytics integration.
* Role‑based approvals & audit log.
* In‑browser diff viewer with inline agent suggestions.

---

## 30) Appendix: Example Express Snippets

**Webhook verify (GitHub HMAC):**

```ts
import crypto from 'crypto';
export function verifySignature(rawBody: string, signature: string, secret: string) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

**SSE endpoint:**

```ts
app.get('/api/agents/:id/stream/:runId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();
  // write events: res.write(`data: ${JSON.stringify(payload)}\n\n`)
});
```

---

## 31) Notes & Terminology

* “Frontend Module” (typo previously “Frondend”).
* **LRPs** = Long‑Running Processes handled by async handlers.
* **Cursor Headless Agents** = external agent execution service (token required).

---

## 33) Hackathon Track Fit

### 33.1 NVIDIA Challenge Fit

* **Reasoning beyond single‑prompt chat:** The **Orchestrator Agent** converts a free‑form prompt into a **multi‑step plan (DAG)** with dependencies, state, and retries.
* **Workflow orchestration:** Executes across services (GitHub Issues/PR/Actions, Docker/deploy, Analytics, Marketing), coordinating success criteria before proceeding.
* **Tool & API integration:** First‑class adapters for GitHub, webhooks, Docker/deployer, and analytics ingestion; easy to extend with more tools.
* **Clear practical value:** One prompt delivers a working feature, CI checks, a live deployment, and GTM content — accelerating teams from idea to impact.
* **NVIDIA alignment:** Architecture is compatible with **agentic planning models** (e.g., integrating **NVIDIA Nemotron** for planning/tool selection or synthetic data for tests). We can showcase Nemotron‑powered planning as an alternative to the default agent backend.

### 33.2 PNC Challenge Fit (AI for Product Managers)

* **Lifecycle embedding:** Agents assist **strategy → requirements → development → testing → GTM** directly inside one surface and can run **autonomously**.
* **PM decision support:** Epics and stories include **impact/effort** tags; backlog grooming with **priority scoring**; auto‑generated **acceptance criteria**.
* **Research synthesis:** Insights module condenses customer feedback + competitor notes into **actionable cards** with suggested next steps.
* **Prototyping & testing:** Agents scaffold UI/API, generate **test cases**, and run CI to validate.
* **GTM execution:** Automatic **release notes**, personas prompts, and snackable social copy.
* **Regulatory readiness:** **Supervised Mode** provides approvals, immutable **audit logs**, PII minimization (redaction in logs), and configurable policy checks — demonstrable even while the hackathon demo uses **Autonomous Run**.

---

## 32) Architecture Decisions (Resolved)

1. **OAuth approach**: GitHub OAuth App (simpler for Day‑1). Repository secrets configured per-project during creation.
2. **Workflow execution**: In‑process for Day‑1. Code structured for parallel execution but sequential for MVP.
3. **Deploy target**: Local docker-compose only. Hosting deferred post-hackathon.
4. **Analytics**: In‑house minimal counters for Day‑1. PostHog integration deferred.
5. **Agent communication**: Through Express webhooks. Workflow manager orchestrates sequential execution.
6. **Failure handling**: Partial completion → workflow manager rewrites task and reassigns. Rate limits → buffer and resume.
7. **Authentication**: GitHub OAuth only. No organizations (users only). Limited InfoSec features for hackathon.
8. **Real-time updates**: Server-Sent Events (SSE) for streaming workflow status.
9. **Data models**: Descriptive and well-structured Mongoose schemas.
10. **Demo data**: Seeded initially for demonstration purposes.

### 32.1 Detailed Architecture Decisions

**AI Agents:**
- **Real API Only**: Use Cursor Cloud Agents API directly (no mock fallbacks)
- **Prompt Structure**: Flexible, structured approach (to be determined during implementation)
- **Tool Context**: Passed appropriately based on agent role and task

**Agent Communication & Workflow:**
- **Communication**: Agents communicate through Express server webhooks
- **Workflow Manager**: Central orchestrator that receives agent responses and determines next steps
- **Execution Model**: 
  - **Day-1**: Sequential execution (one agent at a time)
  - **Code Structure**: Prepare for parallel execution but don't implement yet
- **Failure Handling**:
  - Partial completion → Workflow manager rewrites task and reassigns to agent
  - Timeouts → Handle appropriately with retry logic
  - Rate limits → Buffer workflow and resume after delay

**GitHub Integration:**
- **Authentication**: OAuth App (simpler than GitHub App for Day-1)
- **Webhooks**: GitHub webhooks (primary), GitHub Actions curl as alternative
- **Repository Secrets**: Configured per-project during project creation
  - `PLATFORM_WEBHOOK_URL`
  - `PLATFORM_WEBHOOK_TOKEN`

**Real-Time Updates:**
- **SSE (Server-Sent Events)**: For streaming agent run status and workflow updates
- **Event Structure**: Structured JSON payloads with event types
- **Event Types**:
  - `workflow.started`
  - `workflow.step.started`
  - `workflow.step.completed`
  - `workflow.step.failed`
  - `workflow.completed`
  - `workflow.failed`

**Deployment:**
- **Target**: Local only (docker-compose)
- **Services**: api, web, mongo (optional redis for future)
- **Hosting**: Defer to post-hackathon

**Data Models:**
- **Approach**: Descriptive and well-structured schemas
- **Validation**: Mongoose schemas with clear field definitions
- **Relationships**: Explicit references between collections

**Authentication & User Management:**
- **Method**: OAuth only (GitHub OAuth)
- **Organizations**: Skip for MVP (users only)
- **InfoSec**: Limited features for hackathon (basic security practices)

**Error Handling:**
- **Rate Limits**: Buffer workflow, wait, then resume
- **API Failures**: Retry with exponential backoff
- **Partial Failures**: Workflow manager handles reassignment

**MVP Priority:**
- **Critical Path**: Code module must work end-to-end
  - User prompt → Feature/Roadmap/Maintenance/Bug request
  - Agent planning → Ticket creation → Code generation → PR → CI → Deploy
  - Full visibility in UI

**Demo Data:**
- **Seeding**: Initial seed data for demo
- **Projects**: Pre-configured demo project
- **Tickets**: Sample tickets in various states
- **Runs**: Example agent runs for demonstration

---

## 34) Implementation Roadmap

### Phase 1: Foundation Setup (H0-H4)

**Project Structure:**
```
repo/
  api/
    src/
      routes/
      services/
      integrations/
      models/
      lib/
      middleware/
    test/
    Dockerfile
    package.json
  web/
    src/
      components/
      pages/
      hooks/
      lib/
      types/
    Dockerfile
    package.json
    vite.config.ts
  template/
    backend/
    frontend/
  .github/workflows/
    ci.yml
    deploy.yml
  docker-compose.yml
  .env.example
  README.md
```

**Tasks:**
1. Project structure setup
2. Docker-compose configuration (MongoDB, Express API, React web)
3. Express API skeleton (basic server, MongoDB connection, error handling, logging)
4. Web foundation (React setup, routing, Tailwind CSS)
5. GitHub Actions setup (CI and deploy workflows)
6. Basic project structure ready for template integration

### Phase 2: Integrate Template (H4-H8)

**Goal:** Integrate the template codebase (backend, frontend, and deployment configuration) into our project structure.

**Tasks:**
1. **Backend Integration:**
   - Copy template backend (`template/backend/`) to `api/` directory
   - Merge dependencies and configuration files
   - Update environment variables and port configuration
   - Test backend server and MongoDB connection

2. **Frontend Integration:**
   - Copy template frontend (`template/frontend/`) to `web/` directory
   - Merge dependencies and configuration files
   - Update API base URL and routing
   - Test frontend dev server and routing

3. **Deployment Configuration:**
   - Merge template `docker-compose.yml` with existing
   - Update Dockerfiles if needed
   - Create/update `.env.example` with all required variables
   - Test Docker setup (build, run, verify services)

4. **Template Features Verification:**
   - Verify authentication works (register, login, JWT)
   - Verify database models and connection
   - Verify frontend features (routing, auth flow, styling)
   - Document integration status and what needs customization

### Phase 3: Update Navbar, Landing, and Dashboard (H8-H12) ✅ COMPLETE

**Goal:** Update the Navbar, Landing page, and Dashboard to match the AIO SaaS App branding and functionality. Implement project management features including project creation, listing, and project detail view with tabs.

**Status:** ✅ Complete - All steps implemented and tested

**Tasks Completed:**
1. **Navbar Updates:** ✅
   - Changed "Hackathon Template" to "AIO SaaS App" in the Navbar component

2. **Landing Page Updates:** ✅
   - Updated landing page content to describe the AIO SaaS App
   - When user is logged in, replaced "Dashboard" and "Account" buttons with a single "Get Started" button

3. **Project Model and API:** ✅
   - Created Project model (`_id`, `user_id`, `name`, `description`, `tags`, `created_at`, `updated_at`)
   - Created project API routes (POST, GET, PATCH, DELETE /api/projects)
   - Created project service with CRUD operations and ownership checks

4. **Dashboard Updates:** ✅
   - Displays list of user's projects
   - Shows "Start First Project" message if no projects exist
   - Created project creation modal with name, description, and tags
   - Added grey plus button to the right of "My Projects" title
   - Implemented disabled chatbot interface at top of Dashboard asking "What project would you like to make?"
   - Syncs project creation to database

5. **Project Detail View:** ✅
   - Created project detail page route (`/projects/:id`)
   - Implemented left sidebar with tabs:
     - Home (enabled)
     - Tasks (disabled)
     - [gap]
     - Development (disabled) with subtabs: Code, Deployment, Access Tokens (all disabled)
     - Marketing and Sales (disabled)
     - Analytics and Insights (disabled)
     - [gap]
     - Project Settings (enabled)
     - Collaborators (disabled)
   - Home tab: Project details at top of page (name, description, tags, last updated), disabled ChatGPT-style chatbot interface
   - Project Settings tab: Edit Name/Description/Tags, Delete with confirmation

6. **Frontend API Client:** ✅
   - Added project API functions (create, get, update, delete) in `web/src/lib/projects.ts`

7. **Testing and Verification:** ✅
   - Tested all project CRUD operations
   - Tested navigation and routing
   - Tested theme support on all new pages
   - Tested responsive design

**Workflow Execution Flow:**
```
User Input (description + size) → Code Module
  ↓
PM Agent: Analyze input, determine hierarchy
  ↓
PM Agent: Create hierarchical issues via GitHub Issues/Webhooks
  - Initiative → Roadmap → Epics → Stories → Tickets
  - New Feature → Epic → Stories → Tickets
  - Maintenance → Story → Tickets
  - Bug Fix → Ticket
  ↓
Workflow Manager: Create branches for root issues from integration
  ↓
For each issue (hierarchically):
  ↓
  Create branch (from parent branch or integration if root)
  ↓
  Dev Agent: Generate code for issue
  ↓
  Commit code to issue branch
  ↓
  Create PR from issue branch to parent branch (or integration if root)
  ↓
  QA Agent: Review PR
  ↓
  If critical issues found:
    Create Defect issues
    Wait for defects resolved
  ↓
  GitHub Actions: CI runs
  ↓
  Webhook: CI status updates
  ↓
  Wait for CI success
  ↓
  Merge PR to parent branch
  ↓
  Process child issues (if any)
  ↓
When root issue completed:
  ↓
  Final testing
  ↓
  Merge to regression branch
  ↓
  Deploy based on user settings
  ↓
  Marketing Agent: Generate release notes
  ↓
Final Response: Links + summary
```

### Phase 4: Workflow & Agent System (Backend Only) (H12-H14)

**Goal:** Build backend workflow orchestrator, GitHub Actions integration, agent system, and real-time update infrastructure. **NO FRONTEND UPDATES** in this phase.

**Status:** TODO

**Tasks:**
1. **GitHub App Integration:**
   - Research GitHub App setup (vs OAuth App)
   - Create GitHub App integration service
   - Implement GitHub App authentication (JWT generation)
   - Implement installation token retrieval
   - Implement `repository_dispatch` wrapper with idempotency
   - Create GitHub App routes (installation flow, repo listing)

2. **Run and Issue Models:**
   - Create Run model (runId, ideaId, projectId, rootIssueId, state, timeline, currentIssueId, interrupt, correlationId)
   - Create Ticket/Issue model (id, repo, type, title, body, parentId, children, orderIndex, status, branch, prNumber, labels, acceptanceCriteria, dependencies)
   - Create Agent model (type, name, role, goals, tools, constraints, guardrails, enabled, onboardingDocRef, contextPacks)
   - Create AgentRun model (runId, agentId, projectId, input, output, steps, status, artifactsIn, artifactsOut)

3. **Cursor AI Integration & Adapter:**
   - Research Cursor Cloud Agents API
   - Create Cursor adapter interface
   - Create Cursor API client service
   - Implement agent run creation, status checking, and result retrieval
   - Create Cursor adapter routes (for headless runner pattern)

4. **Prompt Templates & Onboarding Docs:**
   - Create prompt template service (PM, FE, BE, QA, DevOps, Marketing, Nemotron prompts)
   - Create onboarding docs service
   - Create default onboarding doc templates (spec-writer, roadmap, dev, tests, reviewer, qa, release, infra)
   - Implement context pack retrieval (prior PRs, logs, ADRs)

5. **Run Service & State Machine:**
   - Create run service for state management
   - Implement run CRUD operations
   - Implement run state machine (IDEA_SUBMITTED → SPEC_WRITING → ISSUE_TREE → EXECUTION_LOOP → QA → MERGE → RELEASE → DONE)
   - Implement interrupt handling (pause/resume/cancel)

6. **GitHub Webhook Receiver:**
   - Create webhook verification utility (HMAC signature verification, replay protection)
   - Create GitHub webhook receiver
   - Implement event router for all webhook types (issues, PRs, CI, deployments, etc.)
   - Implement `repository_dispatch` handler for status callbacks from GitHub Actions

7. **Ideas & Runs API Routes:**
   - Create ideas/runs routes
   - Implement `POST /api/ideas` (create idea and start run)
   - Implement `GET /api/runs/:runId` (get run state and timeline)
   - Implement `POST /api/runs/:runId/interrupt` (pause/resume/cancel run)
   - Implement `GET /api/runs/:runId/issues` (get hierarchical issue tree)
   - Implement `GET /api/issues/:id` (get full issue with children)
   - Implement `POST /api/issues/:id/reorder` (set child order)
   - Implement `POST /api/runs/:runId/retry/:nodeId` (retry failed node)
   - Implement `POST /api/runs/:runId/advance` (force next step when allowed)

8. **Agents API Routes:**
   - Create agents routes
   - Implement `GET /api/agents` (get agent catalog)
   - Implement `GET /api/agents/:id` (get agent details)
   - Implement `GET /api/agents/:id/onboarding` (get agent onboarding doc)
   - Implement `PUT /api/agents/:id/onboarding` (update agent onboarding doc refs)

9. **SSE Service (Backend Only):**
   - Create SSE service for real-time updates
   - Create SSE middleware
   - Create SSE route (`GET /api/runs/:runId/stream`)
   - Integrate SSE in run service
   - **Note:** Frontend SSE hook will be created in Phase 5

**Prerequisites:**
- Phase 1: API server setup, Express app with middleware
- Phase 2: Template integrated, authentication working
- Phase 3: Project model and service created

**Note:** This phase is backend-only. Frontend updates for viewing and interacting with workflows will be implemented in Phase 5.

### Phase 5: Code Module & Frontend Integration (Critical Path) (H14-H18)

**Goal:** Build the core code module that enables autonomous hierarchical issue-based workflow execution via GitHub Actions, and create frontend UI to view and interact with GitHub Actions workflows.

**Status:** TODO

**Tasks:**
1. **Agent Service & Orchestration:**
   - Create agent service to execute agents
   - Implement agent response parsing
   - Implement tool context preparation
   - Implement context pack preparation
   - Create workflow orchestrator service
   - Implement `startCodeWorkflow` (emit repository_dispatch to GitHub Actions)
   - Implement workflow state transitions
   - Implement interrupt handling

2. **Hierarchical Issue Service:**
   - Create issue hierarchy service
   - Implement hierarchical issue creation (via PM Agent and GitHub Issues API)
   - Implement issue hierarchy retrieval
   - Implement defect issue creation
   - Implement issue completion checking
   - Implement branch name generation (epic/feature/task naming)
   - Implement status propagation

3. **Code Service (GitHub Operations):**
   - Create code service for GitHub operations
   - Implement branch listing and creation
   - Implement hierarchical branch creation
   - Implement PR creation and listing
   - Implement PR merging
   - Implement file operations
   - Implement integration/regression branch creation

4. **GitHub Actions Workflow Files:**
   - Create orchestrator workflow (entrypoint via repository_dispatch)
   - Create reusable workflows (ai.spec, ai.plan, issues.sync, branch.manage, agent.cursor.execute, agent.cursor.review, qa.run, sec.scan, qa.defect.file, merge.gate, release.notes, deploy.env, audit.emit, artifacts.retention)
   - Each workflow should emit status via repository_dispatch back to backend
   - Each workflow should check cancellationToken for pause/cancel

5. **QA Review & Defect Management:**
   - Create QA review service
   - Implement PR review via QA Agent
   - Implement defect issue creation from critical issues
   - Implement defect resolution checking
   - Block PR merge until defects resolved

6. **CI/CD Status Service:**
   - Create CI status service
   - Integrate with webhook receiver
   - Handle CI status updates from webhooks
   - Broadcast SSE events for CI updates

7. **Code Routes:**
   - Create code routes
   - Implement all code-related endpoints (branches, PRs, issues, defects)

8. **Deployment Module:**
   - Create deployment service
   - Create Docker utility
   - Create deployment routes
   - Implement Docker operations (build, run, health check)

9. **Frontend SSE Hook:**
   - Create frontend SSE hook (`useSSE.ts`)
   - Implement EventSource connection
   - Handle reconnection and event parsing

10. **Frontend - Run Timeline UI:**
    - Create timeline component
    - Create timeline step component
    - Integrate timeline in project detail view
    - Connect to SSE for live updates

11. **Frontend - Issue Hierarchy Tree View:**
    - Create issue hierarchy tree component
    - Create issue node component
    - Integrate issue tree in project detail view
    - Connect to SSE for live updates

12. **Frontend - Chat Interface:**
    - Create chat service (frontend API client)
    - Create chat component
    - Create chat message component
    - Integrate chat in dashboard (replace disabled chatbot)
    - Connect to SSE for live updates

13. **Frontend - Code Module UI:**
    - Create code module API client
    - Create code page/components
    - Create branch list component
    - Create PR list component
    - Create PR detail component
    - Enable "Code and Deployment" tab in Project Detail
    - Connect to SSE for CI status updates

14. **User Settings & Deployment Configuration:**
    - Create user settings model
    - Create deployment configuration service
    - Integrate deployment settings in workflow

15. **End-to-End Testing:**
    - Test full autonomous workflow
    - Test error scenarios
    - Test webhook delivery
    - Test frontend interactions

**Prerequisites:**
- Phase 4: GitHub App integration, Run/Ticket/Agent models, Cursor adapter, prompt templates, run service, webhook receiver, ideas/runs API routes, SSE service (backend)

### Phase 6: Supporting Modules (H18-H20)

**Tasks:**
1. Ticketing module (list/create/update tickets, GitHub Issues sync)
2. Code module viewing (branches, PRs, CI status)
3. Analytics module (minimal: event ingestion, basic KPIs)
4. Marketing module (release notes generation, social copy)

### Phase 5: Polish & Demo Prep (H20-H24)

**Tasks:**
1. UI polish (Framer Motion animations, loading/error states, responsive design)
2. Demo data seeding (sample projects, tickets, runs, deployments)
3. End-to-end testing (full autonomous run, error scenarios, webhook delivery)
4. Documentation (README, API docs, demo script, env guide)

---

## 35) Critical Success Criteria

**The Code Module is the highest priority.** Everything else can be deferred if time is tight, but the following must work:

1. ✅ User can create project and connect GitHub
2. ✅ User can send prompt: "Build a login + dashboard starter"
3. ✅ System creates tickets automatically
4. ✅ System generates code and opens PR
5. ✅ CI runs and status updates in real-time
6. ✅ System deploys and provides URL
7. ✅ User sees full timeline of actions
8. ✅ System generates release notes

---

## 36) Risk Mitigation

- **Cursor API unavailable**: Implement retry logic, graceful degradation
- **GitHub rate limits**: Buffer workflow, exponential backoff
- **CI failures**: Workflow manager handles, allows manual intervention
- **Deployment failures**: Health check monitoring, rollback capability
- **Time constraints**: Focus on Code module, defer non-critical features

---

## 37) Team Composition & Roles

**Recommended Team Size:** 3-5 members

**Suggested Roles:**

1. **Backend Lead** (1 person)
   - API development (Express, MongoDB)
   - GitHub integration & webhooks
   - Workflow orchestrator
   - Agent system integration
   - **Key Deliverables:** API routes, webhook handlers, workflow manager

2. **Frontend Lead** (1 person)
   - React UI development
   - Dashboard & components
   - Chat interface
   - Run timeline UI
   - **Key Deliverables:** Dashboard, chat, timeline, responsive design

3. **Full-Stack Developer** (1 person)
   - SSE streaming
   - CI/CD integration
   - Deployment module
   - Frontend-backend integration
   - **Key Deliverables:** SSE, deployment, integration testing

4. **DevOps/Integration Specialist** (1 person, optional)
   - Docker setup
   - GitHub Actions workflows
   - Environment configuration
   - Demo environment setup
   - **Key Deliverables:** Docker compose, CI workflows, demo setup

5. **Product/Design Lead** (1 person, optional)
   - UI/UX design
   - Demo script & presentation
   - Documentation
   - User testing
   - **Key Deliverables:** Demo script, presentation, documentation

**Division of Work (Parallel Development):**
- **H0-H4:** Backend lead sets up API foundation; Frontend lead sets up React; DevOps sets up Docker
- **H4-H8:** Backend lead builds GitHub integration; Frontend lead builds dashboard; Full-stack builds SSE
- **H8-H12:** Backend lead builds workflow manager; Frontend lead builds chat; Full-stack builds deployment
- **H12-H16:** All focus on Code Module (critical path)
- **H16-H20:** Supporting modules (ticketing, analytics, marketing)
- **H20-H24:** Polish, testing, demo prep, presentation

---

## 38) API Setup & Credentials

### 38.1 Cursor API Setup

**Steps to Obtain Cursor API Key:**

1. Visit [Cursor AI](https://cursor.sh) and sign up/login
2. Navigate to Settings → API Keys (or Developer Settings)
3. Generate a new API key
4. Copy the key (format: `sk_cursor_...`)
5. Add to `.env` as `CURSOR_API_KEY`

**Fallback Strategy:**
- If Cursor API is unavailable, implement a mock agent service that simulates agent responses
- Create `api/src/integrations/mock-agent.service.ts` with predefined responses
- Use environment variable `USE_MOCK_AGENTS=true` to switch

### 38.2 GitHub OAuth App Setup

**Steps:**

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** AIO SaaS Platform (Hackathon)
   - **Homepage URL:** `http://localhost:5173` (or your demo URL)
   - **Authorization callback URL:** `http://localhost:8080/api/auth/github/callback`
4. Save and note the **Client ID** and **Client Secret**
5. Add to `.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_WEBHOOK_SECRET=generate_random_string
   ```

### 38.3 GitHub Repository Secrets

**For GitHub Actions webhooks:**

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `PLATFORM_WEBHOOK_URL`: `http://your-demo-url:8080/api/ci/webhook` (or use ngrok for local)
   - `PLATFORM_WEBHOOK_TOKEN`: Generate a secure random token

**Using ngrok for Local Development:**
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8080
# Use the ngrok URL as PLATFORM_WEBHOOK_URL
```

---

## 39) Demo Environment Setup

### 39.1 Pre-Hackathon Preparation

**Before the hackathon starts:**

1. **Set up development environment:**
   - Install Node.js 20+, Docker, Docker Compose
   - Install Git, VS Code (or preferred IDE)
   - Install MongoDB (or use Docker)

2. **Create GitHub repository:**
   - Initialize repo with basic structure
   - Set up `.github/workflows/` directory
   - Create initial README

3. **Prepare credentials:**
   - Obtain Cursor API key
   - Create GitHub OAuth App
   - Generate webhook secrets

4. **Set up demo repository:**
   - Create a test repository for the demo
   - Add sample code/structure
   - Configure GitHub Actions workflows

### 39.2 Demo Environment Configuration

**Local Development:**
```bash
# Clone repo
git clone <repo-url>
cd HackUTD25

# Copy .env.example to .env
cp .env.example .env

# Edit .env with your credentials
# Start services
docker-compose up -d

# Or run locally
cd api && npm install && npm run dev
cd web && npm install && npm run dev
```

**Demo Deployment Options:**

1. **Local Machine (Recommended for Hackathon):**
   - Run `docker-compose up` on presentation laptop
   - Use `localhost` URLs
   - Ensure stable internet for GitHub API calls

2. **Cloud Deployment (Stretch):**
   - Deploy to Railway, Render, or Fly.io
   - Use MongoDB Atlas for database
   - Configure environment variables

3. **Hybrid:**
   - API on cloud, frontend on local
   - Or vice versa

### 39.3 Demo Data Seeding

**Create seed script:**
```bash
# Run seed script
npm run seed

# This creates:
# - Demo user
# - Demo project
# - Sample tickets
# - Sample workflows
# - Sample deployments
```

---

## 40) Presentation & Demo Guide

### 40.1 Demo Script (5-7 minutes)

**Opening (30 seconds):**
- "We built an AI-powered SaaS management platform that automates the entire development lifecycle"
- "One prompt can take you from idea to deployed code with full visibility"

**Live Demo (4-5 minutes):**

1. **Show Dashboard (30s):**
   - "Here's our unified dashboard"
   - Show KPIs, activity stream, chat interface

2. **Create Project (30s):**
   - "Let's create a new project and connect GitHub"
   - Show OAuth flow, repo selection

3. **Autonomous Run (2-3 minutes):**
   - "Now watch this: I'll type one command"
   - Type: `/auto Build a login + dashboard starter using Express API + React web; set up CI, deploy, and give me the URL and release notes.`
   - Show timeline updating in real-time:
     - "PM Agent is planning..."
     - "Creating tickets..."
     - "FE Agent is generating code..."
     - "Opening PR..."
     - "CI is running..."
     - "Deploying..."
     - "Here's the deployed URL and release notes!"

4. **Show Results (1 minute):**
   - Open deployed URL
   - Show generated release notes
   - Show social media copy
   - Show analytics dashboard

**Closing (30 seconds):**
- "This demonstrates how AI agents can orchestrate the entire development lifecycle"
- "From planning to deployment to marketing, all automated with full visibility"
- "Built in 24 hours using React, Express, MongoDB, GitHub Actions, and Cursor AI"

### 40.2 Pitch Deck Outline

**Slide 1: Title**
- Project name, team members, hackathon name

**Slide 2: Problem**
- Teams juggle multiple tools
- Manual coordination is slow
- Status sync is brittle

**Slide 3: Solution**
- Single unified platform
- AI agents orchestrate workflows
- Full visibility and automation

**Slide 4: Key Features**
- Autonomous workflow execution
- Real-time status updates
- End-to-end automation
- Marketing content generation

**Slide 5: Tech Stack**
- Frontend: React, TypeScript, Tailwind
- Backend: Express, MongoDB
- Integrations: GitHub, Cursor AI
- Infrastructure: Docker, GitHub Actions

**Slide 6: Demo**
- Live demo (or video if live demo fails)

**Slide 7: Impact**
- Accelerates development lifecycle
- Reduces manual coordination
- Enables rapid iteration

**Slide 8: Future Vision**
- Multi-tool integrations
- Advanced AI capabilities
- Enterprise features

**Slide 9: Q&A**

### 40.3 Presentation Tips

1. **Have a backup video:** Record the demo beforehand in case of technical issues
2. **Practice timing:** Rehearse the demo multiple times
3. **Prepare for questions:** Anticipate common questions about:
   - How agents work
   - Security considerations
   - Scalability
   - Real-world applicability
4. **Show enthusiasm:** Demonstrate passion for the project
5. **Highlight innovation:** Emphasize the autonomous orchestration aspect

---

## 41) Time Management & Checkpoints

### 41.1 Critical Checkpoints

**H4 Checkpoint (4 hours in):**
- ✅ Project structure created
- ✅ Docker compose running
- ✅ Basic API server responding
- ✅ Basic React app rendering
- ✅ MongoDB connected
- **If behind:** Cut non-essential features, focus on core

**H8 Checkpoint (8 hours in):**
- ✅ Authentication working
- ✅ Project creation working
- ✅ GitHub OAuth connected
- ✅ Basic dashboard rendering
- ✅ API routes functional
- **If behind:** Simplify UI, use mock data

**H12 Checkpoint (12 hours in):**
- ✅ Workflow manager skeleton
- ✅ Agent integration started
- ✅ Chat interface functional
- ✅ SSE streaming working
- **If behind:** Use mock agents, simplify workflow

**H16 Checkpoint (16 hours in):**
- ✅ Code module core working
- ✅ GitHub operations functional
- ✅ CI webhook receiving updates
- ✅ Deployment module working
- **If behind:** Focus ONLY on Code Module, cut everything else

**H20 Checkpoint (20 hours in):**
- ✅ End-to-end autonomous run working
- ✅ Timeline UI showing updates
- ✅ Demo data seeded
- ✅ Basic testing done
- **If behind:** Stop new features, only fix critical bugs

**H22 Checkpoint (22 hours in):**
- ✅ Demo script practiced
- ✅ Presentation prepared
- ✅ Backup video recorded
- ✅ Documentation updated
- **Final polish only, no new features**

### 41.2 Time Allocation Guidelines

- **H0-H4 (25%):** Foundation setup
- **H4-H8 (17%):** Core infrastructure
- **H8-H12 (17%):** Workflow & agents
- **H12-H16 (17%):** Code module (CRITICAL)
- **H16-H20 (17%):** Supporting modules
- **H20-H24 (7%):** Polish & demo prep

**Rule of Thumb:** If you're more than 2 hours behind at any checkpoint, cut features aggressively.

---

## 42) Troubleshooting Guide

### 42.1 Common Issues

**Issue: MongoDB connection fails**
- **Solution:** Check `MONGO_URL` in `.env`, ensure MongoDB is running
- **Quick fix:** Use MongoDB Atlas (cloud) instead of local

**Issue: GitHub OAuth callback fails**
- **Solution:** Verify callback URL matches OAuth app settings
- **Quick fix:** Check CORS settings, ensure HTTPS for production

**Issue: Cursor API returns errors**
- **Solution:** Verify API key, check rate limits
- **Quick fix:** Enable `USE_MOCK_AGENTS=true` fallback

**Issue: Webhooks not received**
- **Solution:** Check webhook URL, verify signature verification
- **Quick fix:** Use ngrok for local development, check firewall

**Issue: Docker build fails**
- **Solution:** Check Dockerfile syntax, ensure dependencies installed
- **Quick fix:** Build locally without Docker, use `npm start`

**Issue: SSE connection drops**
- **Solution:** Check server timeout settings, implement reconnection
- **Quick fix:** Poll API instead of SSE for demo

**Issue: GitHub Actions not triggering**
- **Solution:** Verify workflow files, check repository secrets
- **Quick fix:** Manually trigger workflow, use curl to simulate

### 42.2 Emergency Fallbacks

**If Cursor API is down:**
- Use mock agent service
- Pre-generate agent responses
- Use hardcoded workflows

**If GitHub API is rate-limited:**
- Implement request queuing
- Use GitHub Personal Access Token as backup
- Cache responses aggressively

**If deployment fails:**
- Use static demo site
- Show screenshots/video
- Deploy to simpler platform (Vercel, Netlify)

**If database is slow:**
- Use in-memory storage for demo
- Pre-seed all data
- Use JSON files as backup

---

## 43) Common Pitfalls & How to Avoid Them

1. **Over-engineering:**
   - **Pitfall:** Building too many features, not finishing core
   - **Avoid:** Stick to MVP, cut features aggressively

2. **Perfectionism:**
   - **Pitfall:** Spending too much time on polish, not functionality
   - **Avoid:** "Good enough" is better than perfect but incomplete

3. **Not testing end-to-end:**
   - **Pitfall:** Features work in isolation but not together
   - **Avoid:** Test full workflow every 4 hours

4. **Poor time management:**
   - **Pitfall:** Spending too long on one feature
   - **Avoid:** Set strict time limits, move on if stuck

5. **No backup plan:**
   - **Pitfall:** Demo fails, no alternative
   - **Avoid:** Record video, have screenshots, prepare static demo

6. **Not practicing demo:**
   - **Pitfall:** Demo is slow, confusing, or fails
   - **Avoid:** Practice 3+ times, time each run

7. **Ignoring dependencies:**
   - **Pitfall:** Blocked waiting for another team member
   - **Avoid:** Clear dependency communication, work in parallel

8. **Not sleeping:**
   - **Pitfall:** Team is exhausted, makes mistakes
   - **Avoid:** Take breaks, sleep if needed (better to be rested)

9. **Not committing frequently:**
   - **Pitfall:** Lost work, merge conflicts
   - **Avoid:** Commit every hour, push regularly

10. **Not documenting:**
    - **Pitfall:** Can't remember how things work
    - **Avoid:** Write quick notes, update README

---

## 44) Quick Start Guide

### 44.1 First 30 Minutes

1. **Clone and setup (10 min):**
   ```bash
   git clone <repo>
   cd HackUTD25
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Start services (5 min):**
   ```bash
   docker-compose up -d
   # Or: npm install in api/ and web/
   ```

3. **Verify setup (5 min):**
   - Check API: `curl http://localhost:8080/healthz`
   - Check Web: Open `http://localhost:5173`
   - Check MongoDB: `docker ps` or `mongosh`

4. **Create GitHub OAuth App (10 min):**
   - Follow section 38.2
   - Add credentials to `.env`

### 44.2 Development Workflow

1. **Backend development:**
   ```bash
   cd api
   npm run dev  # Auto-reload on changes
   ```

2. **Frontend development:**
   ```bash
   cd web
   npm run dev  # Vite dev server
   ```

3. **Testing:**
   ```bash
   # Backend tests
   cd api && npm test
   
   # Frontend tests
   cd web && npm test
   ```

4. **Database operations:**
   ```bash
   # Seed data
   npm run seed
   
   # Reset database
   npm run reset-db
   ```

---

## 45) Judging Criteria Alignment

**Typical Hackathon Judging Criteria:**

1. **Innovation (25%):**
   - ✅ Autonomous AI agent orchestration is innovative
   - ✅ End-to-end automation from prompt to deployment
   - ✅ Unique combination of tools and technologies

2. **Technical Complexity (25%):**
   - ✅ Multi-service architecture (API, frontend, database)
   - ✅ Real-time streaming (SSE)
   - ✅ External API integrations (GitHub, Cursor AI)
   - ✅ Workflow orchestration with state management

3. **Completeness (25%):**
   - ✅ Working end-to-end demo
   - ✅ Core features functional
   - ✅ UI is polished and usable
   - ✅ Documentation present

4. **Impact/Practicality (25%):**
   - ✅ Solves real problem (tool fragmentation)
   - ✅ Demonstrates clear value
   - ✅ Could be used in real-world scenarios
   - ✅ Shows potential for scaling

**How to Highlight in Presentation:**
- Emphasize the autonomous orchestration innovation
- Show the technical complexity (workflow manager, SSE, integrations)
- Demonstrate completeness with live end-to-end demo
- Explain real-world impact and use cases

---

## 46) Suggestions & Recommendations

### 46.1 Hierarchical Issue Management

**Recommendations:**
1. **Issue Type Mapping:**
   - Use GitHub Issue labels to distinguish types: `roadmap`, `epic`, `story`, `ticket`, `defect`
   - Use GitHub Milestones for Roadmaps
   - Use GitHub Projects for Epics organization
   - Consider using GitHub Issue templates for each type

2. **Branch Naming Convention:**
   - Root issues: `issue/{issue-number}-{slug}` (e.g., `issue/123-user-authentication`)
   - Sub-issues: `issue/{parent-number}/{child-number}-{slug}` (e.g., `issue/123/124-login-form`)
   - Keep branch names short and descriptive (max 50 characters)

3. **Hierarchy Validation:**
   - Validate that parent issues are completed before processing children
   - Prevent circular dependencies in issue hierarchy
   - Ensure all defects are resolved before merging parent issue

### 46.2 Branch Strategy

**Recommendations:**
1. **Integration Branch:**
   - Create `integration` branch from `main` at project setup
   - Use `integration` as the base for all root issues
   - Keep `integration` branch stable and tested

2. **Regression Branch:**
   - Create `regression` branch from `main` at project setup
   - Use `regression` for final testing before deployment
   - Only merge completed root issues to `regression`
   - Consider using `regression` as staging environment

3. **Branch Protection:**
   - Protect `integration` and `regression` branches (require PR, require CI)
   - Allow auto-merge only after all checks pass
   - Require code review for critical branches

### 46.3 QA Review & Defect Management

**Recommendations:**
1. **Defect Classification:**
   - Critical: Blocks merge, must be fixed immediately
   - High: Should be fixed before merge
   - Medium: Can be fixed in follow-up PR
   - Low: Nice to have, can be deferred

2. **Defect Resolution:**
   - Create defect issues with type `defect` and parent set to reviewed issue
   - Block PR merge until all critical/high defects resolved
   - Allow merge with medium/low defects (track in follow-up)

3. **QA Review Automation:**
   - Use QA Agent to review PRs automatically
   - Generate review checklist based on issue type
   - Flag potential security issues, performance problems, code smells

### 46.4 Deployment Configuration

**Recommendations:**
1. **Deployment Strategies:**
   - Auto: Deploy immediately after regression merge
   - Manual: Require user approval before deployment
   - Scheduled: Deploy at specific times (e.g., off-peak hours)

2. **Environment Management:**
   - Dev: For testing and development
   - Staging: For pre-production testing
   - Production: For live deployment

3. **Deployment Safety:**
   - Run smoke tests before deployment
   - Implement rollback mechanism
   - Monitor deployment health after deployment
   - Send notifications on deployment status

### 46.5 Workflow Optimization

**Recommendations:**
1. **Parallel Processing:**
   - Process sibling issues in parallel when possible
   - Use queue system for issue processing
   - Limit concurrent agent executions to avoid rate limits

2. **Error Handling:**
   - Retry failed operations with exponential backoff
   - Log all errors with context
   - Notify user on critical failures
   - Provide manual intervention options

3. **Performance:**
   - Cache issue hierarchy to avoid repeated queries
   - Batch GitHub API calls when possible
   - Use webhooks instead of polling when available
   - Optimize database queries with proper indexes

### 46.6 User Experience

**Recommendations:**
1. **Size Selection:**
   - Provide clear descriptions for each size type
   - Show examples of each size type
   - Allow users to override size if needed
   - Support natural language size detection

2. **Progress Visibility:**
   - Show hierarchical issue tree in UI
   - Display branch structure and PR status
   - Show defect count and resolution status
   - Provide estimated completion time

3. **Notifications:**
   - Notify on issue completion
   - Alert on defects found
   - Update on deployment status
   - Send summary on workflow completion

### 46.7 Implementation Considerations

**Recommendations:**
1. **GitHub API Limits:**
   - Implement rate limit handling
   - Use GitHub App instead of OAuth for higher limits
   - Cache API responses when appropriate
   - Batch operations when possible

2. **Database Design:**
   - Index `parent_id` and `children_ids` for fast hierarchy queries
   - Use recursive queries for hierarchy traversal
   - Consider denormalization for frequently accessed data
   - Implement soft deletes for issue history

3. **Testing:**
   - Test hierarchical issue creation
   - Test branch creation and PR flow
   - Test defect creation and resolution
   - Test deployment with different settings
   - Test error scenarios and edge cases

4. **Security:**
   - Validate user permissions for each operation
   - Sanitize user inputs
   - Protect sensitive data (API keys, tokens)
   - Implement audit logging for critical operations