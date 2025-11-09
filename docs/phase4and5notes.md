# Phase 4 and 5 Notes

## 1) Complete System Architecture

### 1.1 High-level flow

```
[Frontend (React/TS/Tailwind/Framer)]
          │  (Idea, controls, live status)
          ▼
[Backend (Node/Express/Nest)] ── uses ──► [GitHub App] ❶
   │   ▲          │  repository_dispatch      ▲ webhooks
   │   │          ▼                           │
   │   └── websockets/SSE to UI        [GitHub: Issues/PRs/Actions]
   │                                        │
   │                                        ▼
   │                                [Reusable GH Workflows]
   │                                 ├─ Spec/PM (Nemotron)
   │                                 ├─ Planning & Issue Tree
   │                                 ├─ Branching & PRs
   │                                 ├─ Agent Executors (Cursor)
   │                                 ├─ QA/Test/Sec
   │                                 ├─ Review & Approvals
   │                                 ├─ Build/Deploy
   │                                 └─ Audit/Telemetry
   │
   │  status callbacks via repository_dispatch + artifacts
   ▼
[MongoDB (Docker)] ❷
  ├─ ideas, runs, DAGs, status, logs
  ├─ agent profiles & onboarding docs
  └─ audit trail (idempotency keys, corr. IDs)

[Added] ❶ GitHub App (not PAT) for fine-grained perms and Actions dispatch.  
[Added] ❷ Mongo as the source-of-truth run ledger and issue DAG store.
```

### 1.2 Orchestration pattern

* **Triggering:** Frontend posts `POST /ideas` → Backend persists a **Run** with a **Correlation-ID** and emits a `repository_dispatch` to the target repo with `{runId, ideaId, planOptions}`.
* **Workflow Network:** Entry workflow (`orchestrator.yml`) fans out to **reusable workflows** via `workflow_call`. Each workflow publishes progress via:

  * `repository_dispatch` (back to Backend) with `{runId, nodeId, state, payload}`, **or**
  * artifacts (JSON) that the Backend fetches using the GitHub API (fallback).
* **State Machine in Backend:** Run state = `IDEA_SUBMITTED → SPEC_WRITING → ISSUE_TREE → EXECUTION_LOOP → QA → MERGE → RELEASE → DONE` with branches for defect loops.
* **Interruptibility:** Backend exposes `POST /api/runs/:runId/interrupt` which triggers `repository_dispatch` type `orchestrator.pause` or `orchestrator.cancel`. Workflows honor a `cancellationToken` flag (checked every major step).
* **Observability:** All workflow steps log JSON lines (`runId`, `nodeId`, `phase`, `ts`, `level`, `msg`). Backend streams via **SSE (Server-Sent Events)** to the UI timeline. **[Added]** Use `actions/upload-artifact` for structured logs too.
* **Security:**

  * GitHub App with `issues, pull_requests, actions:write, contents:write, metadata` (minimum).
  * OIDC from Actions → Cloud (if deployments). **[Added]** Enforce `permissions:` blocks in YAML.
  * Secrets in repo environments; short-lived tokens only.

---

## 2) Agent Model (Cursor & Nemotron)

### 2.1 Agent taxonomy

* **Nemotron Agents (PM/Analysis/Content)**
  Tasks: Product specs, roadmap decomposition, acceptance criteria, release notes, risk registers, test plan drafts.
  Invocation: Reusable workflow `ai.nemotron.run` with prompts + context packs.

* **Cursor Agents (Code/DevOps)**
  Tasks: implement issues, refactors, write tests, code review, fix defects, infra changes, deployment scripts.
  Invocation: Reusable workflow `agent.cursor.execute` that:

  1. checks out the branch,
  2. prepares workspace context (issue text, onboarding docs, prior logs),
  3. calls Cursor agent **via configured adapter** (**[Added]** see below),
  4. commits changes, pushes, updates PR, posts comments.

**[Added] Cursor Adapter Options:**

* **Headless runner pattern:** run Cursor in an ephemeral self-hosted runner/VM with a **project rules file** and scripted prompts.
* **Alt fallback:** If Cursor CLI/SDK isn’t available, use a “Tool-proxy” (e.g., server that brokers to Cursor) or standards-based code-mod tools (AST codemods) while isolating the adapter behind a stable interface:
  `POST /adapters/cursor/execute { repo, branch, task, context }`.

### 2.2 Agent contract (common)

```json
{
  "agentId": "cursor.dev.impl",
  "input": {
    "repo": "org/repo",
    "branch": "feature/123-summary",
    "issueId": 123,
    "objective": "Implement endpoint X with tests",
    "contextPacks": ["onboarding.dev", "service-X.md", "recentLogs:5"],
    "constraints": ["coverage>=80%", "lint=pass", "no secrets"],
    "artifactsIn": ["spec.v1.json"]
  },
  "output": {
    "changesetSummary": "Edited 7 files, added tests",
    "commitIds": ["abc...", "def..."],
    "notes": "Edge case Y handled",
    "artifactsOut": ["test.report.json"]
  }
}
```

---

## 3) Issue Model (Types & Behavior)

### 3.1 Types

* **Epic (root):** maps to a **root branch** off `integration`.
* **Feature/Story (internal nodes):** may have ordered sub-issues.
* **Task (leaf):** single unit, should map to an **individual commit** or tight PR updates.
* **Defect:** created by QA under any issue; turns a leaf into a non-leaf until resolved (same gating).

### 3.2 Hierarchy & gating rules

* Ordered children must complete **sequentially** (`orderIndex`).
* A parent cannot close/merge until **all descendants** are `DONE`.
* **Branching:**

  * Epic → `epic/<id>-<slug>` from `integration`
  * Child → `feature/<id>-<slug>` branched from its **nearest open ancestor** branch
  * Leaf → `task/<id>-<slug>` branched from its parent feature.
* **Pull Requests:** each non-root branch targets its parent branch; root targets `integration`.
* **Status propagation:** leaf completion → parent advances; any open **Defect** reopens parent and blocks merge.

### 3.3 Minimal schemas

```ts
// Mongo
type Issue = {
  id: number; repo: string; type: 'epic'|'feature'|'task'|'defect';
  title: string; body: string; parentId?: number;
  children: number[]; orderIndex?: number;
  status: 'NEW'|'IN_PROGRESS'|'BLOCKED'|'REVIEW'|'QA'|'DONE';
  branch?: string; prNumber?: number; labels: string[];
  acceptanceCriteria?: string[]; dependencies?: number[];
  projectId: ObjectId; runId?: string;
  created_at: Date; updated_at: Date;
};
type Run = {
  runId: string; ideaId: string; projectId: ObjectId; rootIssueId?: number;
  state: 'IDEA_SUBMITTED'|'SPEC_WRITING'|'ISSUE_TREE'|'EXECUTION_LOOP'|'QA'|'MERGE'|'RELEASE'|'DONE';
  timeline: Array<{phase: string; ts: Date; level: string; msg: string; data?: any}>;
  currentIssueId?: number;
  interrupt?: { paused: boolean; reason?: string };
  correlationId: string;
  created_at: Date; updated_at: Date;
};
type Agent = {
  _id: ObjectId; projectId?: ObjectId;
  type: 'spec-writer'|'roadmap-decomposer'|'acceptance-criteria-author'|'issue-planner'|'developer-implementer'|'refactorer'|'test-author'|'code-reviewer'|'qa-tester'|'security-auditor'|'release-manager'|'infra-deploy-engineer';
  name: string; role: string; goals: string[]; tools: string[];
  constraints: string[]; guardrails: string[]; enabled: boolean;
  onboardingDocRef?: string; contextPacks?: string[];
  created_at: Date; updated_at: Date;
};
type AgentRun = {
  _id: ObjectId; runId: string; agentId: ObjectId; projectId: ObjectId;
  input: object; output?: object; steps: Array<object>;
  status: 'pending'|'running'|'completed'|'failed';
  artifactsIn?: string[]; artifactsOut?: string[];
  created_at: Date; updated_at: Date;
};
```

---

## 4) List of Agents & Onboarding Docs

### 4.1 Agents

* **Spec Writer (Nemotron)**
* **Roadmap Decomposer (Nemotron)**
* **Acceptance Criteria Author (Nemotron)**
* **Issue Planner (Nemotron)**
* **Developer Implementer (Cursor)**
* **Refactorer (Cursor)**
* **Test Author (Cursor)**
* **Code Reviewer (Cursor)**
* **QA Tester (Nemotron+Cursor hybrid)**
* **Security/Lint/License Auditor (Nemotron)**
* **Release Manager (Nemotron)**
* **Infra/Deploy Engineer (Cursor)**

### 4.2 Onboarding doc templates (stored in DB / repo)

* `onboarding/spec-writer.md` (product voice, templates, non-functional reqs)
* `onboarding/roadmap.md` (tree rules, ordering, DoR/DoD)
* `onboarding/dev.md` (coding standards, arch overview, service boundaries)
* `onboarding/tests.md` (test pyramid, coverage thresholds, fixtures)
* `onboarding/reviewer.md` (PR rubric, style guide, security checks)
* `onboarding/qa.md` (test plans, exploratory checklist, defect taxonomy)
* `onboarding/release.md` (semver, changelog, rollback)
* `onboarding/infra.md` (deploy targets, IaC, secrets policy)

**[Added]** Keep per-agent **context packs**: prior PRs, logs, architectural decision records (ADRs), recent incidents.

---

## 5) List of Workflows (Categorized)

> All reusable workflows live under `.github/workflows/_reusable/*.yml`

### 5.1 Orchestration

* `orchestrator.yml` (entrypoint via `repository_dispatch`)
  Calls: `ai.spec`, `plan.issues`, then loops `exec.issue → qa.pipeline → merge.gate → next`.

### 5.2 PM/Spec (Nemotron)

* `ai.spec.yml` — Drafts product spec from Idea.
* `ai.plan.yml` — Decomposes spec → ordered issue DAG with acceptance criteria.

### 5.3 Issue & Branch Management

* `issues.sync.yml` — Creates/updates GitHub issues from DAG (labels, order).
* `branch.manage.yml` — Creates branches per node, sets PR targets/auto-draft.

### 5.4 Agent Execution (Cursor)

* `agent.cursor.execute.yml` — Implement task; push commits; update PR.
* `agent.cursor.review.yml` — Code review; inline comments.

### 5.5 QA & Quality

* `qa.run.yml` — Unit/integration/e2e matrix; coverage gates.
* `sec.scan.yml` — SAST/Secrets/License scans. **[Added]**
* `qa.defect.file.yml` — Files defects from failing checks or QA prompts.

### 5.6 Merge & Release

* `merge.gate.yml` — Ensures all children resolved; required checks pass; merges.
* `release.notes.yml` — Generates release notes (Nemotron).
* `deploy.env.yml` — Deploy via environment protection rules & OIDC.

### 5.7 Telemetry & Audit

* `audit.emit.yml` — Posts structured events to Backend.
* `artifacts.retention.yml` — Packages logs/reports.

---

## 6) List of Webhooks (Categorized)

### 6.1 Inbound from GitHub → Backend

* `issues`, `issue_comment`, `pull_request`, `pull_request_review`, `check_run`, `check_suite`, `workflow_job`, `workflow_run`, `push`, `status`, `deployment`, `deployment_status`.

### 6.2 Outbound Backend → GitHub

* `repository_dispatch` types (examples):

  * `orchestrator.start|pause|cancel`
  * `ai.spec.request`, `ai.plan.request`
  * `issues.sync.request`
  * `agent.cursor.execute.request`, `agent.cursor.review.request`
  * `qa.run.request`, `qa.defect.file.request`
  * `merge.gate.request`, `deploy.request`
  * `audit.emit`

### 6.3 Backend → Frontend

* **SSE channels:** `GET /api/runs/:runId/stream` (Server-Sent Events)
  * Event types: `workflow.started`, `workflow.step.started`, `workflow.step.completed`, `workflow.step.failed`, `workflow.completed`, `workflow.failed`, `ci.status`, `issue.updated`.
  * Heartbeat mechanism (ping every 30 seconds).
  * Client reconnection handling with resume from last event.

---

## 7) List of Endpoints (Categorized)

### 7.1 Frontend → Backend (REST)

* **Ideas & Runs**

  * `POST /api/ideas` → `{ideaText, repo, options}` → `{runId}`
  * `GET /api/runs/:runId` → run state + timeline
  * `POST /api/runs/:runId/interrupt` → `{action:'pause'|'resume'|'cancel', reason?}`

* **Issues & DAG**

  * `GET /api/runs/:runId/issues` → hierarchical tree
  * `GET /api/issues/:id` → full issue + children
  * `POST /api/issues/:id/reorder` → set child order

* **Agents**

  * `GET /api/agents` → catalog
  * `GET /api/agents/:id` → agent details
  * `GET /api/agents/:id/onboarding` → onboarding doc content
  * `PUT /api/agents/:id/onboarding` → update onboarding doc refs `{onboardingDocRef, contextPacks}`

* **Code Module**

  * `POST /api/projects/:id/code` → start code workflow `{description, size}` → `{runId}`
  * `GET /api/projects/:id/branches` → list branches
  * `POST /api/projects/:id/branches` → create branch `{branchName, baseBranch}`
  * `GET /api/projects/:id/prs` → list PRs
  * `POST /api/projects/:id/prs` → create PR `{branch, base, title, body}`
  * `GET /api/projects/:id/prs/:prNumber` → get PR details
  * `POST /api/projects/:id/prs/:prNumber/merge` → merge PR
  * `POST /api/projects/:id/issues/:issueId/defects` → create defect issue
  * `GET /api/projects/:id/issues/:issueId/hierarchy` → get issue hierarchy

* **Deployment**

  * `POST /api/projects/:id/deploy` → trigger deployment `{version, env}`
  * `GET /api/projects/:id/deployments` → list deployments
  * `GET /api/projects/:id/deployments/:id` → get deployment details
  * `POST /api/projects/:id/deployments/:id/rollback` → rollback deployment

* **Admin/Replay**

  * `POST /api/runs/:runId/retry/:nodeId` → retry failed node
  * `POST /api/runs/:runId/advance` → force next step when allowed

### 7.2 Backend → GitHub (Server-side)

* `POST /github/dispatch` (internal) → wraps repository_dispatch with signing, retries, idempotency.

### 7.3 GitHub → Backend (Webhook receiver)

* `POST /webhooks/github` (HMAC verified) → event router → state updates.
  * Handles webhook types: `issues`, `issue_comment`, `pull_request`, `pull_request_review`, `check_run`, `check_suite`, `workflow_job`, `workflow_run`, `push`, `status`, `deployment`, `deployment_status`.
  * Handles `repository_dispatch` events for status callbacks from GitHub Actions (orchestrator.status).

### 7.4 Auth & Security

* **[Added]** `POST /auth/github-app/callback` (App installation flow)
* **[Added]** `GET /repos` (list installable repos)

---

## 8) Development Roadmap (small, testable chunks)

### Phase 4: Workflow & Agent System (Backend Only)

**Note:** Phase 4 is backend-only. Frontend updates for viewing and interacting with workflows will be implemented in Phase 5.

1. **Milestone 0 — GitHub App & Models**

   * Research GitHub App setup (vs OAuth App), required permissions.
   * Create GitHub App integration service (JWT generation, installation tokens, repository_dispatch wrapper).
   * Create Run model (runId, ideaId, projectId, rootIssueId, state, timeline, currentIssueId, interrupt, correlationId).
   * Create Ticket/Issue model (id, repo, type, title, body, parentId, children, orderIndex, status, branch, prNumber, labels, acceptanceCriteria, dependencies).
   * Create Agent model (type, name, role, goals, tools, constraints, guardrails, enabled, onboardingDocRef, contextPacks).
   * Create AgentRun model (runId, agentId, projectId, input, output, steps, status, artifactsIn, artifactsOut).
   * *Tests:* GitHub App installation flow, repository_dispatch with idempotency, model CRUD operations, model relationships.

2. **Milestone 1 — Cursor Integration & Prompts**

   * Research Cursor Cloud Agents API, create adapter interface.
   * Create Cursor API client service (createAgentRun, getAgentRunStatus, getAgentRunResult).
   * Create Cursor adapter routes (POST /adapters/cursor/execute for headless runner pattern).
   * Create prompt template service (PM, FE, BE, QA, DevOps, Marketing, Nemotron prompts).
   * Create onboarding docs service (retrieve/update onboarding docs, context packs).
   * Create default onboarding doc templates (spec-writer, roadmap, dev, tests, reviewer, qa, release, infra).
   * *Tests:* Cursor API client initialization, agent run creation/status checking, prompt building, onboarding doc retrieval.

3. **Milestone 2 — Run Service & State Machine**

   * Create run service (createRun, getRun, updateRunState, addRunLog, setCurrentIssue, interruptRun).
   * Implement run state machine (IDEA_SUBMITTED → SPEC_WRITING → ISSUE_TREE → EXECUTION_LOOP → QA → MERGE → RELEASE → DONE).
   * Implement interrupt handling (pause/resume/cancel).
   * *Tests:* run creation/retrieval, state machine transitions, interrupt functionality, timeline logging.

4. **Milestone 3 — Webhook Receiver & API Routes**

   * Create webhook verification utility (HMAC signature verification, replay protection).
   * Create GitHub webhook receiver (POST /webhooks/github with event router for all webhook types).
   * Implement repository_dispatch handler for status callbacks from GitHub Actions.
   * Create ideas/runs routes (POST /api/ideas, GET /api/runs/:runId, POST /api/runs/:runId/interrupt, GET /api/runs/:runId/issues, GET /api/issues/:id, POST /api/issues/:id/reorder, POST /api/runs/:runId/retry/:nodeId, POST /api/runs/:runId/advance).
   * Create agents routes (GET /api/agents, GET /api/agents/:id, GET /api/agents/:id/onboarding, PUT /api/agents/:id/onboarding).
   * *Tests:* webhook signature verification, replay protection, each webhook event type, repository_dispatch status callbacks, all API routes.

5. **Milestone 4 — SSE Service (Backend)**

   * Create SSE service (client connection management, sendEvent, broadcastEvent, reconnection handling).
   * Create SSE middleware (SSE headers, connection lifecycle, heartbeat mechanism).
   * Create SSE route (GET /api/runs/:runId/stream).
   * Integrate SSE in run service (emit events at state changes).
   * *Tests:* SSE connection establishment, event broadcasting, client reconnection, connection cleanup, heartbeat mechanism.

### Phase 5: Code Module & Frontend Integration

6. **Milestone 5 — Agent Service & Orchestration**

   * Create agent service (executeAgent, agent response parsing, tool context preparation, context pack preparation).
   * Create workflow orchestrator service (startCodeWorkflow, workflow state transitions, interrupt handling).
   * Implement repository_dispatch emission to GitHub Actions (orchestrator.start with runId, ideaId, planOptions).
   * *Tests:* agent execution for each agent type, agent response parsing, context preparation, workflow orchestrator start, state transitions, interrupt functionality.

7. **Milestone 6 — Issue Hierarchy & Code Service**

   * Create issue hierarchy service (createIssueHierarchy via PM Agent and GitHub Issues API, getRootIssues, getIssueChildren, getIssueHierarchy, createDefectIssue, isIssueComplete, getIssueBranchName, getParentBranch, status propagation).
   * Create code service (getBranches, createBranch, createHierarchicalBranch, getPullRequests, createPullRequest, createIssuePR, getPullRequest, mergePullRequest, mergeToRegression, getFileContent, createOrUpdateFile, ensureIntegrationBranch, ensureRegressionBranch).
   * *Tests:* hierarchical issue creation for each size type, issue hierarchy retrieval, defect issue creation, branch listing/creation, PR creation/listing/merging, file operations.

8. **Milestone 7 — GitHub Actions Workflows**

   * Create orchestrator workflow (orchestrator.yml entrypoint via repository_dispatch).
   * Create reusable workflows (ai.spec.yml, ai.plan.yml, issues.sync.yml, branch.manage.yml, agent.cursor.execute.yml, agent.cursor.review.yml, qa.run.yml, sec.scan.yml, qa.defect.file.yml, merge.gate.yml, release.notes.yml, deploy.env.yml, audit.emit.yml, artifacts.retention.yml).
   * Each workflow should emit status via repository_dispatch back to backend, upload artifacts, check cancellationToken.
   * *Tests:* orchestrator workflow trigger via repository_dispatch, each reusable workflow independently, status callbacks to backend, pause/cancel functionality, artifact upload/retrieval.

9. **Milestone 8 — QA Review & CI/CD**

   * Create QA review service (reviewPR via QA Agent, identifyCriticalIssues, createDefectIssues, checkDefectsResolved, waitForDefectsResolved).
   * Integrate QA review in workflow (after PR creation, block merge until defects resolved).
   * Create CI status service (updateCIStatus from webhook, getCIStatus, waitForCI, broadcast SSE events).
   * Integrate with webhook receiver (handle check_run, check_suite, workflow_job, workflow_run events).
   * *Tests:* QA review for PRs, defect issue creation, defect resolution checking, merge blocking with unresolved defects, CI status updates from webhooks, SSE events for CI updates.

10. **Milestone 9 — Code Routes & Deployment**

    * Create code routes (POST /api/projects/:id/code, GET /api/projects/:id/branches, POST /api/projects/:id/branches, GET /api/projects/:id/prs, POST /api/projects/:id/prs, GET /api/projects/:id/prs/:prNumber, POST /api/projects/:id/prs/:prNumber/merge, POST /api/projects/:id/issues/:issueId/defects, GET /api/projects/:id/issues/:issueId/hierarchy).
    * Create deployment service (deploy, getDeployment, getDeployments, rollbackDeployment, Docker operations).
    * Create Docker utility (buildImage, runContainer, healthCheck, stopContainer).
    * Create deployment routes (POST /api/projects/:id/deploy, GET /api/projects/:id/deployments, GET /api/projects/:id/deployments/:id, POST /api/projects/:id/deployments/:id/rollback).
    * *Tests:* all code routes with authentication, deployment service operations, Docker utility functions, deployment routes.

11. **Milestone 10 — Frontend SSE & Timeline**

    * Create frontend SSE hook (useSSE.ts with EventSource connection, reconnection handling, event parsing).
    * Create timeline component (RunTimeline.tsx with vertical timeline, step status icons, expandable details, GitHub resource links).
    * Create timeline step component (TimelineStep.tsx with step info, status icon, duration, logs, artifacts).
    * Integrate timeline in project detail view (connect to SSE for live updates).
    * *Tests:* SSE connection establishment, event parsing, timeline rendering with different step states, SSE updates on timeline, step expansion, GitHub resource links.

12. **Milestone 11 — Frontend Issue Tree & Chat**

    * Create issue hierarchy tree component (IssueHierarchyTree.tsx with hierarchical tree, badges, clickable nodes, CI status badges).
    * Create issue node component (IssueNode.tsx with issue info, expand/collapse, links to GitHub issue/PR).
    * Integrate issue tree in project detail view (connect to SSE for live updates).
    * Create chat service (frontend API client for sendMessage, getChatHistory, interruptRun).
    * Create chat component (Chat.tsx with input, size selector, message history, slash command parsing).
    * Create chat message component (ChatMessage.tsx with user/system/agent message styling, workflow status chips).
    * Integrate chat in dashboard (replace disabled chatbot, connect to SSE).
    * *Tests:* tree rendering with different hierarchy structures, node expansion/collapse, issue/PR links, SSE updates on tree, chat message sending, slash command parsing, SSE updates in chat.

13. **Milestone 12 — Frontend Code Module UI**

    * Create code module API client (getBranches, getPullRequests, getPullRequest, getIssueHierarchy).
    * Create code page/components (Code.tsx, BranchList.tsx, PRList.tsx, PRDetail.tsx).
    * Enable "Code and Deployment" tab in Project Detail.
    * Connect to SSE for CI status updates.
    * *Tests:* branch list display, PR list display, PR detail view, CI status updates via SSE, merge functionality, navigation/routing.

14. **Milestone 13 — User Settings & End-to-End Testing**

    * Create user settings model (UserSettings.ts with deployment_strategy, deployment_env, auto_merge_regression, require_approval).
    * Create deployment configuration service (getDeploymentSettings, updateDeploymentSettings, shouldAutoDeploy, getDeploymentEnvironment).
    * Integrate deployment settings in workflow.
    * Test full autonomous workflow (create project, connect GitHub, send idea/command, verify all steps execute, verify timeline updates, verify issue hierarchy, verify branches/PRs, verify CI status, verify deployment, verify release notes).
    * Test error scenarios (invalid GitHub token, Cursor API failure, CI failure, deployment failure).
    * Test webhook delivery (trigger GitHub Actions workflow, verify webhook received, verify CI status updates in UI, verify SSE events).
    * Test frontend interactions (chat interface, timeline UI, issue hierarchy tree, code module UI, SSE reconnection, theme support, responsive design).
    * *Tests:* user settings model CRUD operations, deployment configuration service, full end-to-end workflow, error scenarios, webhook delivery, frontend interactions.

---

## 9) Product Spec — Backend ↔ GitHub Actions

### 9.1 Dispatch protocol

* **Endpoint:** Backend calls GitHub API `repository_dispatch` with:

```json
{
  "event_type": "agent.cursor.execute.request",
  "client_payload": {
    "runId": "r-2025-11-08-001",
    "nodeId": "issue-145",
    "repo": "org/repo",
    "branch": "task/145-login-submit",
    "params": { "coverageTarget": 0.8 }
  }
}
```

* **Idempotency:** Backend stores a `dispatchId` (UUID v7). Replays ignored.

### 9.2 Status callback

* **From Actions → Backend** using `repository_dispatch` back or webhook note/PR comment:

```json
{
  "event_type": "orchestrator.status",
  "client_payload": {
    "runId": "r-2025-11-08-001",
    "nodeId": "issue-145",
    "phase": "EXECUTING",
    "state": "IN_PROGRESS",
    "progress": 0.42,
    "metrics": {"tests": 18, "passed": 17},
    "artifacts": ["s3://.../test.report.json"]
  }
}
```

**[Added]** If outbound dispatch is restricted, emit via PR comment with a signed JSON block; Backend parses.

### 9.3 Permissions & runner policy

```yaml
# In every workflow
permissions:
  contents: write
  pull-requests: write
  issues: write
  actions: write
  id-token: write   # for OIDC to cloud if needed
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}-${{ inputs.runId || github.run_id }}
  cancel-in-progress: false
```

### 9.4 Example: `orchestrator.yml` (entry)

```yaml
name: orchestrator
on:
  repository_dispatch:
    types: [orchestrator.start, orchestrator.pause, orchestrator.cancel]

jobs:
  route:
    runs-on: ubuntu-latest
    steps:
      - name: Parse payload
        id: p
        run: |
          echo "runId=${{ github.event.client_payload.runId }}" >> $GITHUB_OUTPUT
      - name: Emit started
        uses: actions/github-script@v7
        with:
          script: |
            core.summary.addHeading('Orchestrator Started').addRaw(process.env.GITHUB_RUN_ID).write()
  spec:
    needs: route
    uses: ./.github/workflows/_reusable/ai.spec.yml
    with:
      runId: ${{ needs.route.outputs.runId }}
  plan:
    needs: spec
    uses: ./.github/workflows/_reusable/ai.plan.yml
    with:
      runId: ${{ needs.route.outputs.runId }}
  execute:
    needs: plan
    uses: ./.github/workflows/_reusable/exec.loop.yml
    with:
      runId: ${{ needs.route.outputs.runId }}
```

### 9.5 Example: Cursor executor (reusable)

```yaml
name: agent.cursor.execute
on:
  workflow_call:
    inputs:
      runId: { required: true, type: string }
      repo:  { required: true, type: string }
      branch:{ required: true, type: string }
      issueId:{ required: true, type: string }
permissions:
  contents: write
  pull-requests: write
jobs:
  exec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ inputs.branch }} }
      - name: Prepare context
        run: |
          mkdir -p .agent/context
          # write onboarding/context packs fetched via REST (omitted)
      - name: Run Cursor adapter
        env:
          RUN_ID: ${{ inputs.runId }}
        run: |
          ./scripts/cursor_adapter.sh "${RUN_ID}" "${{ inputs.issueId }}"
      - name: Commit & push
        run: |
          git config user.name "orchestrator-bot"
          git config user.email "bot@example.com"
          git add -A
          git commit -m "feat(${ {inputs.issueId} }): automated changes" || echo "no changes"
          git push
      - name: Report status
        uses: actions/github-script@v7
        with:
          script: |
            // POST back to Backend /runs/:runId/status (omitted)
```

### 9.6 Error handling & retries

* Exponential backoff for GitHub API (HTTP 4xx/5xx); jittered retries ×5.
* **[Added]** Mark steps with `continue-on-error: true` only for non-critical telemetry.
* Backend maintains **compensation actions** (e.g., if PR created but branch push failed).
* **Pause/Cancel**: workflows check a `controls.json` fetched from Backend; if `paused`, they sleep/exit gracefully.

---

## 10) Frontend UX Notes (for viability)

* **Idea intake** (rich text + options), immediate run timeline with chips (“Spec”, “Plan”, “Branch”, “Dev”, “QA”, “Merge”, “Release”).
* **Tree view** of issues with badges; clicking a node opens PR/issue panel, comments, test results.
* **Controls:** pause, resume, cancel; force advance when no blockers.
* **[Added]** “Dry-run” mode that creates plan/PR drafts without writing code.

---

## 11) Viability Assessment (short)

* **Yes, viable.** GitHub Actions’ `repository_dispatch`, reusable workflows, required checks, and environment gates support this architecture.
* Risks: Cursor programmatic invocation availability, LLM determinism, long-running steps. Mitigations provided via adapters, idempotency, artifacts, and pause/cancel controls.

---

## 12) Glossary of Added Items

* GitHub App over PAT; Mongo as run ledger; OIDC deploy; Security scans; Replay/Retry endpoints; Dry-run mode; Concurrency strategy; Signed JSON via comments as fallback; Cursor adapter interface; Admin “advance” endpoint; ADR/context packs; Telemetry artifacts.