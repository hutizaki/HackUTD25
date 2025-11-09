# Detailed Project Roadmap

**Project:** AIO SaaS Management Platform  
**Timeline:** 24-hour hackathon  
**Team:** 2 Developers  
**Last Updated:** Nov 8, 2025

---

## Team Assignment

**Dev 1:** Working on Phases 1-3 (Initialization, Database & Authentication, Core Infrastructure)  
**Dev 2:** Starting on Phase 4 (Workflow & Agent System) - will need prerequisites from Phases 1-3

**Note:** Dev 2 should coordinate with Dev 1 to ensure prerequisites are completed before starting Phase 4 steps.

---

## Code Modules Overview

This section describes all code modules in the system, their functions, and how they connect to each other.

### Module: API Server (`api/`)
**Description:** Express.js backend server that handles all API requests, business logic, and integrations.

**Functions:**
- REST API endpoints for all features
- Server-Sent Events (SSE) for real-time updates
- Webhook receivers for GitHub Actions
- Database operations via Mongoose
- Authentication and authorization
- Agent orchestration and workflow management

**Connections:**
- Connects to MongoDB for data persistence
- Connects to GitHub API via OAuth tokens
- Connects to Cursor AI API for agent execution
- Receives webhooks from GitHub Actions
- Sends SSE events to frontend clients

**Key Files:**
- `api/src/index.ts` - Main server entry point
- `api/src/routes/` - API route handlers
- `api/src/services/` - Business logic services
- `api/src/models/` - MongoDB models
- `api/src/integrations/` - External API integrations
- `api/src/middleware/` - Express middleware

---

### Module: Web Frontend (`web/`)
**Description:** React + TypeScript frontend application providing the user interface.

**Functions:**
- User interface for all features
- Real-time updates via SSE
- Chat interface for agent interactions
- Dashboard with KPIs and activity stream
- Project and ticket management UI
- Code module UI (hierarchical issues, branches, PRs, CI status)
- Run timeline visualization

**Connections:**
- Connects to API server via REST endpoints
- Connects to API server via SSE for real-time updates
- Uses TanStack Query for data fetching and caching
- Uses React Router for navigation

**Key Files:**
- `web/src/App.tsx` - Main app component with routing
- `web/src/pages/` - Page components
- `web/src/components/` - Reusable UI components
- `web/src/hooks/` - Custom React hooks
- `web/src/lib/` - Utility functions and API client

---

### Module: Database Models (`api/src/models/`)
**Description:** Mongoose schemas defining all data structures stored in MongoDB.

**Functions:**
- Define data schemas with validation
- Create database indexes for performance
- Provide type-safe data access
- Handle data relationships and references

**Models:**
- `User` - User accounts and authentication
- `Project` - Projects created by users
- `Integration` - External service integrations (GitHub, Cursor)
- `Ticket` - Hierarchical issues/tickets (Roadmap, Epic, Story, Ticket, Defect) with parent/child relationships
- `UserSettings` - User deployment preferences and settings
- `Agent` - AI agent configurations
- `AgentRun` - Individual agent execution records
- `Workflow` - Autonomous workflow executions
- `Webhook` - Webhook configurations and tracking
- `Deployment` - Deployment records and status
- `AnalyticsEvent` - Analytics event tracking
- `Secret` - Encrypted secrets storage

**Connections:**
- Used by all services for data access
- Referenced by routes for data operations

---

### Module: Authentication Service (`api/src/services/auth.service.ts`)
**Description:** Handles user authentication via GitHub OAuth.

**Functions:**
- GitHub OAuth flow initiation
- OAuth callback handling
- JWT token generation and verification
- User lookup and creation
- Session management

**Connections:**
- Uses GitHub OAuth API
- Creates/updates User model
- Generates JWT tokens for frontend
- Used by auth middleware to protect routes

---

### Module: Project Service (`api/src/services/project.service.ts`)
**Description:** Manages project CRUD operations and project-related business logic.

**Functions:**
- Create, read, update, delete projects
- Validate project ownership
- Manage project settings
- Link projects to GitHub repositories

**Connections:**
- Uses Project model
- Uses User model for ownership validation
- Used by project routes

---

### Module: GitHub Integration (`api/src/integrations/github.service.ts`)
**Description:** Wrapper around GitHub API for repository operations.

**Functions:**
- Repository listing and access
- Branch creation and management
- File creation, reading, and updating
- Pull request creation and management
- Issue creation and management
- Webhook installation
- Repository secret management
- CI/CD status checking

**Connections:**
- Uses GitHub API via @octokit/rest
- Uses Integration model for token storage
- Used by workflow orchestrator
- Used by code service
- Used by ticketing service

---

### Module: Cursor AI Integration (`api/src/integrations/cursor.service.ts`)
**Description:** Integration with Cursor Cloud Agents API for AI agent execution.

**Functions:**
- Execute agent prompts
- Manage agent runs
- Parse agent responses
- Handle agent errors and retries
- Format agent output for workflow use

**Connections:**
- Connects to Cursor AI API
- Used by agent service
- Used by workflow orchestrator

---

### Module: Agent Service (`api/src/services/agent.service.ts`)
**Description:** Manages AI agent execution and response parsing.

**Functions:**
- Execute agents with appropriate prompts
- Parse agent responses into structured data
- Prepare tool context for agents
- Log agent runs
- Handle agent errors

**Connections:**
- Uses Cursor AI integration
- Uses Agent and AgentRun models
- Uses prompt service for prompt templates
- Used by workflow orchestrator

---

### Module: Prompt Service (`api/src/services/prompt.service.ts`)
**Description:** Builds and manages prompt templates for different agent types.

**Functions:**
- Build PM agent prompts (planning)
- Build FE agent prompts (frontend code)
- Build BE agent prompts (backend code)
- Build QA agent prompts (testing)
- Build DevOps agent prompts (deployment)
- Build Marketing agent prompts (content generation)
- Inject context and tool information into prompts

**Connections:**
- Used by agent service
- Used by workflow orchestrator

---

### Module: Workflow Orchestrator (`api/src/services/workflow-orchestrator.service.ts`)
**Description:** Central orchestrator that manages autonomous hierarchical issue-based workflow execution from user input (description + size) to deployment.

**Functions:**
- Parse user input (description + size) and determine issue hierarchy
- Create hierarchical issues via PM Agent (Initiative → Roadmap → Epics → Stories → Tickets)
- Create branches for root issues from integration branch
- Process issues hierarchically (root → children)
- Coordinate between agents and services
- Manage workflow state machine
- Handle retries and error recovery
- Wait for external events (CI completion, defect resolution)
- Generate final workflow summary

**Workflow Steps:**
1. PM Agent: Analyze description and size, determine hierarchy
2. Create hierarchical issues via GitHub Issues/Webhooks
3. Create branches for root issues from integration branch
4. For each issue (hierarchically):
   - Create branch (from parent branch or integration if root)
   - Dev Agent: Generate code for issue
   - Commit code to issue branch
   - Create PR from issue branch to parent branch (or integration if root)
   - QA Agent: Review PR
   - If critical issues found, create Defect issues
   - Wait for defects resolved
   - Wait for CI completion
   - Merge PR to parent branch
   - Process child issues recursively
5. When root issue completed:
   - Final testing
   - Merge to regression branch
   - Deploy based on user settings
   - Marketing Agent: Generate release notes
6. Return final response with links

**Connections:**
- Uses agent service
- Uses GitHub integration
- Uses issue hierarchy service
- Uses code service
- Uses QA review service
- Uses deployment service
- Uses deployment config service
- Uses marketing service
- Uses workflow model for state tracking
- Uses Ticket model for issue hierarchy
- Emits SSE events for real-time updates

---

### Module: Workflow Service (`api/src/services/workflow.service.ts`)
**Description:** Manages workflow records and state.

**Functions:**
- Create workflow records
- Update workflow status
- Add workflow logs
- Query workflow history
- Manage workflow state machine

**Connections:**
- Uses Workflow model
- Used by workflow orchestrator
- Used by workflow routes

---

### Module: SSE Service (`api/src/services/sse.service.ts`)
**Description:** Manages Server-Sent Events connections for real-time updates.

**Functions:**
- Manage client connections
- Broadcast events to connected clients
- Handle connection lifecycle
- Implement heartbeat mechanism
- Support reconnection

**Connections:**
- Used by workflow orchestrator to send updates
- Used by webhook handlers to send CI updates
- Used by workflow routes for SSE endpoints

---

### Module: Code Service (`api/src/services/code.service.ts`)
**Description:** Manages code-related operations with hierarchical issue-based workflow (branches, PRs, files).

**Functions:**
- List branches and PRs
- Create hierarchical branches (from integration branch or parent issue branch)
- Create/update files
- Create pull requests (from issue branch to parent branch or integration)
- Get PR details
- Merge pull requests
- Merge to regression branch (for completed root issues)
- Get file content
- Ensure integration and regression branches exist

**Connections:**
- Uses GitHub integration
- Uses Project model
- Uses Ticket model (for issue hierarchy)
- Used by workflow orchestrator
- Used by code routes
- Used by issue hierarchy service

---

### Module: Issue Hierarchy Service (`api/src/services/issue-hierarchy.service.ts`)
**Description:** Manages hierarchical issue creation and traversal based on size classification.

**Functions:**
- Create hierarchical issues based on size (Initiative → Roadmap → Epics → Stories → Tickets)
- Get root issues for a project
- Get issue children and full hierarchy
- Create defect issues from QA reviews
- Check if issue and all children are complete
- Generate branch names for issues
- Get parent branch name (or integration if root)

**Connections:**
- Uses Ticket model for issue hierarchy
- Uses GitHub integration for creating issues
- Used by workflow orchestrator
- Used by code service

---

### Module: QA Review Service (`api/src/services/qa-review.service.ts`)
**Description:** Manages QA review process and defect issue creation.

**Functions:**
- Review PRs using QA Agent
- Identify critical bugs/defects from reviews
- Create defect issues from critical issues
- Check if all defects are resolved
- Wait for defects to be resolved
- Update issue status based on review results

**Connections:**
- Uses agent service (QA Agent)
- Uses issue hierarchy service
- Uses Ticket model for defect issues
- Used by workflow orchestrator
- Used by code routes

---

### Module: Deployment Configuration Service (`api/src/services/deployment-config.service.ts`)
**Description:** Manages user deployment preferences and settings.

**Functions:**
- Get deployment settings for project/user
- Update deployment settings
- Check if auto-deploy is enabled
- Get target deployment environment
- Determine deployment strategy (auto/manual/scheduled)

**Connections:**
- Uses UserSettings model
- Used by workflow orchestrator
- Used by deployment service

---

### Module: CI Service (`api/src/services/ci.service.ts`)
**Description:** Manages CI/CD status and webhook handling.

**Functions:**
- Receive CI webhook events
- Update CI status in database
- Wait for CI completion
- Query CI status
- Handle CI failures

**Connections:**
- Receives webhooks from GitHub Actions
- Updates workflow status
- Emits SSE events for CI updates
- Used by workflow orchestrator

---

### Module: Deployment Service (`api/src/services/deployment.service.ts`)
**Description:** Manages application deployments via Docker.

**Functions:**
- Build Docker images
- Run docker-compose
- Health check deployments
- Generate deployment URLs
- Rollback deployments
- Monitor deployment status

**Connections:**
- Uses Docker CLI/API
- Uses Deployment model
- Used by workflow orchestrator
- Used by deployment routes

---

### Module: Ticket Service (`api/src/services/ticket.service.ts`)
**Description:** Manages tickets/issues (GitHub Issues or local).

**Functions:**
- Create tickets
- List tickets with filters
- Update ticket status
- Sync with GitHub Issues
- Delete tickets

**Connections:**
- Uses Ticket model
- Uses GitHub integration for Issues sync
- Used by workflow orchestrator
- Used by ticket routes

---

### Module: Analytics Service (`api/src/services/analytics.service.ts`)
**Description:** Manages analytics event tracking and KPI calculation.

**Functions:**
- Record analytics events
- Calculate KPIs (DAU, load time, session length)
- Query analytics data
- Generate analytics summaries

**Connections:**
- Uses AnalyticsEvent model
- Used by frontend for event tracking
- Used by analytics routes

---

### Module: Marketing Service (`api/src/services/marketing.service.ts`)
**Description:** Generates marketing content (release notes, social copy).

**Functions:**
- Generate release notes from PRs/tickets
- Generate social media copy
- Format content for different platforms
- Use Marketing Agent for content generation

**Connections:**
- Uses agent service (Marketing Agent)
- Uses GitHub integration for PR/ticket data
- Used by workflow orchestrator
- Used by marketing routes

---

### Module: Webhook Handlers (`api/src/routes/*-webhook.routes.ts`)
**Description:** Receive and process webhooks from external services.

**Functions:**
- Verify webhook signatures (HMAC)
- Parse webhook payloads
- Update system state based on webhooks
- Emit SSE events for real-time updates
- Prevent replay attacks

**Webhook Types:**
- GitHub webhooks (PR, push, workflow events)
- CI webhooks (GitHub Actions status)

**Connections:**
- Receives webhooks from GitHub
- Updates workflow/CI status
- Emits SSE events
- Uses webhook verification utilities

---

### Module: Frontend Components (`web/src/components/`)
**Description:** Reusable React components for the UI.

**Key Components:**
- `Layout.tsx` - Main layout with sidebar and topbar
- `Sidebar.tsx` - Navigation sidebar
- `Topbar.tsx` - Top navigation bar
- `Dashboard.tsx` - Dashboard page with KPIs
- `Chat.tsx` - Chat interface for agent interactions
- `RunTimeline.tsx` - Timeline visualization for workflows
- `TicketCard.tsx` - Ticket display component
- `PRList.tsx` - Pull request list component
- `DeploymentCard.tsx` - Deployment status card
- `KPIWidget.tsx` - KPI display widget

**Connections:**
- Used by pages
- Connect to API via hooks
- Use TanStack Query for data
- Use SSE hooks for real-time updates

---

### Module: Frontend Pages (`web/src/pages/`)
**Description:** Page-level React components for different routes.

**Pages:**
- `Dashboard.tsx` - Main dashboard
- `Projects.tsx` - Project list and creation
- `Tickets.tsx` - Ticket management
- `Code.tsx` - Code module (branches, PRs)
- `Agents.tsx` - Agent management
- `Analytics.tsx` - Analytics dashboard
- `Marketing.tsx` - Marketing content generation
- `Login.tsx` - Login page

**Connections:**
- Use components
- Use hooks for data fetching
- Connect to API routes
- Use routing for navigation

---

### Module: Frontend Hooks (`web/src/hooks/`)
**Description:** Custom React hooks for data fetching and state management.

**Hooks:**
- `useAuth.ts` - Authentication state
- `useSSE.ts` - Server-Sent Events connection
- `useProjects.ts` - Project data fetching
- `useTickets.ts` - Ticket data fetching
- `useWorkflows.ts` - Workflow data fetching

**Connections:**
- Used by components and pages
- Connect to API endpoints
- Use TanStack Query

---

### Module: Docker Configuration (`docker-compose.yml`, `Dockerfile`s)
**Description:** Containerization configuration for local development and demo.

**Functions:**
- Define service containers (API, Web, MongoDB)
- Configure service dependencies
- Set up networking
- Define volume mounts
- Configure environment variables

**Connections:**
- Orchestrates all services
- Used for local development
- Used for demo deployment

---

### Module: GitHub Actions Workflows (`.github/workflows/`)
**Description:** CI/CD workflows that run on GitHub.

**Workflows:**
- `ci.yml` - Runs tests and builds on PR/push
- `deploy.yml` - Builds Docker images and notifies platform

**Functions:**
- Run tests
- Build applications
- Build Docker images
- Send webhooks to platform API

**Connections:**
- Triggers on GitHub events
- Sends webhooks to API server
- Uses repository secrets

---

## Phase 1: Initialization

**Goal:** Set up project structure, development environment, and basic infrastructure.

### Step 1.1: Repository Setup
- [ ] Create root directory structure
  - [ ] Create `api/` directory
  - [ ] Create `web/` directory
  - [ ] Create `.github/workflows/` directory
- [ ] Initialize Git repository
  - [ ] Create `.gitignore` file with Node.js, TypeScript, and environment file patterns
  - [ ] Add initial commit with basic structure
- [ ] Create root `README.md` with project overview and setup instructions

### Step 1.2: Docker Configuration
- [ ] Create `docker-compose.yml` in root
  - [ ] Define MongoDB service (port 27017, volume for persistence)
  - [ ] Define API service (port 8080, depends on MongoDB)
  - [ ] Define Web service (port 5173, depends on API)
  - [ ] Configure environment variable passing
- [ ] Create `.env.example` file
  - [ ] Document all required environment variables
  - [ ] Add placeholder values with descriptions
  - [ ] Include: `MONGO_URL`, `JWT_SECRET`, `CURSOR_API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `PLATFORM_WEBHOOK_TOKEN`
- [ ] Create `.env` file (local development, gitignored)

### Step 1.3: API Foundation
- [ ] Initialize Node.js project in `api/`
  - [ ] Run `npm init -y`
  - [ ] Install dependencies: `express`, `mongoose`, `dotenv`, `cors`, `jsonwebtoken`, `bcrypt`, `@octokit/rest`
  - [ ] Install dev dependencies: `typescript`, `@types/node`, `@types/express`, `@types/jsonwebtoken`, `@types/bcrypt`, `ts-node`, `nodemon`
  - [ ] Create `tsconfig.json` with appropriate compiler options
- [ ] Create API directory structure
  - [ ] Create `api/src/routes/`
  - [ ] Create `api/src/services/`
  - [ ] Create `api/src/integrations/`
  - [ ] Create `api/src/models/`
  - [ ] Create `api/src/lib/`
  - [ ] Create `api/src/middleware/`
  - [ ] Create `api/test/`
- [ ] Create basic Express server
  - [ ] Create `api/src/index.ts` as entry point
  - [ ] Set up Express app with CORS and JSON parser middleware
  - [ ] Add error handling middleware
  - [ ] Add request logging (pino or morgan)
  - [ ] Create health check endpoints (`GET /healthz`, `GET /readyz`)
  - [ ] Start server on port 8080 (from env or default)
- [ ] Create `api/Dockerfile`
  - [ ] Use Node.js base image
  - [ ] Set working directory
  - [ ] Copy package files and install dependencies
  - [ ] Copy source code
  - [ ] Expose port 8080
  - [ ] Set start command (`npm start`)

### Step 1.4: Web Foundation
- [ ] Initialize React project in `web/`
  - [ ] Run `npm create vite@latest . -- --template react-ts`
  - [ ] Install dependencies: `react-router-dom`, `@tanstack/react-query`, `framer-motion`
  - [ ] Install dev dependencies: `tailwindcss`, `postcss`, `autoprefixer`
- [ ] Set up Tailwind CSS
  - [ ] Initialize Tailwind config (`tailwind.config.js`)
  - [ ] Configure content paths (`./src/**/*.{js,ts,jsx,tsx}`)
  - [ ] Add Tailwind directives to `src/index.css`
- [ ] Create web directory structure
  - [ ] Create `web/src/components/`
  - [ ] Create `web/src/pages/`
  - [ ] Create `web/src/hooks/`
  - [ ] Create `web/src/lib/`
  - [ ] Create `web/src/types/`
- [ ] Set up routing
  - [ ] Create `web/src/App.tsx` with React Router setup
  - [ ] Create placeholder pages: `Dashboard.tsx`, `Projects.tsx`, `Tickets.tsx`, `Code.tsx`, `Agents.tsx`, `Analytics.tsx`, `Marketing.tsx`, `Settings.tsx`
  - [ ] Set up routes for each page
- [ ] Create `web/Dockerfile`
  - [ ] Use Node.js base image
  - [ ] Set working directory
  - [ ] Copy package files and install dependencies
  - [ ] Copy source code
  - [ ] Build production bundle (`npm run build`)
  - [ ] Use nginx or serve static files
  - [ ] Expose port 5173 (dev) or 80 (prod)

### Step 1.5: GitHub Actions Setup
- [ ] Create `.github/workflows/ci.yml`
  - [ ] Set up workflow triggers (on pull_request and push to main)
  - [ ] Define build job for API
    - [ ] Checkout code
    - [ ] Setup Node.js
    - [ ] Install dependencies
    - [ ] Run tests (if exist)
    - [ ] Build application
  - [ ] Define build job for Web
    - [ ] Checkout code
    - [ ] Setup Node.js
    - [ ] Install dependencies
    - [ ] Build application
  - [ ] Add webhook notification step (curl POST to platform API)
- [ ] Create `.github/workflows/deploy.yml`
  - [ ] Set up workflow triggers (workflow_dispatch, push to main)
  - [ ] Define Docker build job
    - [ ] Checkout code
    - [ ] Build Docker image
    - [ ] Add webhook notification step (notify platform API)

---

## Phase 2: Integrate Template

**Goal:** Integrate the template codebase (backend, frontend, and deployment configuration) into our project structure.

### Step 2.1: Backend Integration
- [ ] Copy template backend to API directory
  - [ ] Copy `template/backend/src/` to `api/src/`
  - [ ] Copy `template/backend/package.json` to `api/package.json` (merge dependencies)
  - [ ] Copy `template/backend/tsconfig.json` to `api/tsconfig.json`
  - [ ] Copy `template/backend/eslint.config.js` to `api/eslint.config.js`
  - [ ] Copy `template/backend/Dockerfile` to `api/Dockerfile` (or merge with existing)
- [ ] Update backend configuration
  - [ ] Update `api/src/config/env.ts` to match our environment variables
  - [ ] Update `api/src/index.ts` to use our port (8080) and CORS origin
  - [ ] Update MongoDB connection in `api/src/db/connect.ts` to use our connection string format
  - [ ] Update health check endpoints (`/healthz`, `/readyz`) to match our naming
- [ ] Merge template dependencies
  - [ ] Review template `package.json` dependencies
  - [ ] Merge with existing `api/package.json` dependencies
  - [ ] Install all dependencies: `npm install` in `api/` directory
  - [ ] Resolve any dependency conflicts
- [ ] Test backend integration
  - [ ] Start backend server: `npm run dev` in `api/`
  - [ ] Verify health check: `curl http://localhost:8080/healthz`
  - [ ] Verify MongoDB connection works
  - [ ] Test authentication endpoints (register, login)

### Step 2.2: Frontend Integration
- [ ] Copy template frontend to Web directory
  - [ ] Copy `template/frontend/src/` to `web/src/`
  - [ ] Copy `template/frontend/package.json` to `web/package.json` (merge dependencies)
  - [ ] Copy `template/frontend/tsconfig.json` to `web/tsconfig.json` (merge with existing)
  - [ ] Copy `template/frontend/tailwind.config.ts` to `web/tailwind.config.ts`
  - [ ] Copy `template/frontend/postcss.config.js` to `web/postcss.config.js`
  - [ ] Copy `template/frontend/vite.config.ts` to `web/vite.config.ts` (merge with existing)
  - [ ] Copy `template/frontend/index.html` to `web/index.html` (update title)
- [ ] Update frontend configuration
  - [ ] Update `web/src/lib/api.ts` to use our API base URL (`VITE_API_BASE_URL`)
  - [ ] Update `web/src/App.tsx` routing to match our routes
  - [ ] Update environment variable references to match our naming
- [ ] Merge template dependencies
  - [ ] Review template `package.json` dependencies
  - [ ] Merge with existing `web/package.json` dependencies
  - [ ] Install all dependencies: `npm install` in `web/` directory
  - [ ] Resolve any dependency conflicts
- [ ] Test frontend integration
  - [ ] Start frontend dev server: `npm run dev` in `web/`
  - [ ] Verify frontend loads: `http://localhost:5173`
  - [ ] Test routing and navigation
  - [ ] Verify Tailwind CSS styles are applied

### Step 2.3: Deployment Configuration
- [ ] Update docker-compose.yml
  - [ ] Review template `docker-compose.yml` structure
  - [ ] Merge with existing `docker-compose.yml`
  - [ ] Update service names to match our naming (api, web, mongodb)
  - [ ] Update port mappings (API: 8080, Web: 5174, MongoDB: 27017)
  - [ ] Update environment variable references
  - [ ] Ensure volume mounts are correct
- [ ] Update Dockerfiles
  - [ ] Review template backend Dockerfile
  - [ ] Merge with existing `api/Dockerfile` if needed
  - [ ] Review template frontend Dockerfile
  - [ ] Update `web/Dockerfile` and `web/Dockerfile.prod` if needed
- [ ] Create/update .env.example
  - [ ] Review template environment variables
  - [ ] Create `.env.example` with all required variables
  - [ ] Document each variable with descriptions
  - [ ] Include: MongoDB, JWT, GitHub OAuth, Cursor API, Webhook secrets
- [ ] Test Docker setup
  - [ ] Build Docker images: `docker compose build`
  - [ ] Start services: `docker compose up -d`
  - [ ] Verify all services are running: `docker compose ps`
  - [ ] Test API health check: `curl http://localhost:8080/healthz`
  - [ ] Test frontend: `http://localhost:5174`
  - [ ] Verify MongoDB connection from API

### Step 2.4: Template Features Verification
- [ ] Verify authentication works
  - [ ] Test user registration
  - [ ] Test user login
  - [ ] Test JWT token generation and validation
  - [ ] Test protected routes
- [ ] Verify database models
  - [ ] Test User model creation
  - [ ] Verify MongoDB connection and schema
  - [ ] Test basic CRUD operations
- [ ] Verify frontend features
  - [ ] Test routing and navigation
  - [ ] Test authentication flow
  - [ ] Test protected routes
  - [ ] Verify Tailwind CSS styling
  - [ ] Test responsive design
- [ ] Document integration status
  - [ ] List all template features that are working
  - [ ] Note any issues or conflicts
  - [ ] Document what needs to be customized in Phase 3

---

## Phase 3: Update Navbar, Landing, and Dashboard

**Goal:** Update the Navbar, Landing page, and Dashboard to match the AIO SaaS App branding and functionality. Implement project management features including project creation, listing, and project detail view with tabs.

### Step 3.1: Update Navbar
- [x] Update Navbar branding
  - [x] Review template Navbar (`web/src/components/Navbar.tsx`)
  - [x] Change "Hackathon Template" text to "AIO SaaS App"
  - [x] Verify branding appears correctly on all pages

### Step 3.2: Update Landing Page
- [x] Update Landing page content
  - [x] Review template Landing page (`web/src/routes/Landing.tsx`)
  - [x] Update content to describe the AIO SaaS App project
  - [x] Include information about what the platform does and its key features
- [x] Update logged-in user buttons
  - [x] When user is logged in, replace "Dashboard" and "Account" buttons with a single "Get Started" button
  - [x] "Get Started" button should navigate to Dashboard
  - [x] Verify button appears only when user is authenticated

### Step 3.3: Create Project Model and API
- [x] Create Project model
  - [x] Create `api/src/models/Project.ts`
  - [x] Define schema: `_id`, `user_id` (ref: User), `name` (required), `description`, `tags` (array of strings), `created_at`, `updated_at`
  - [x] Add validation for required fields
  - [x] Add timestamps plugin
  - [x] Create index on `user_id`
  - [x] Export model
- [x] Create project routes
  - [x] Create `api/src/routes/project.routes.ts`
  - [x] Implement `POST /api/projects` (create project, requires auth)
  - [x] Implement `GET /api/projects` (list user's projects, requires auth)
  - [x] Implement `GET /api/projects/:id` (get project details, requires auth, ownership check)
  - [x] Implement `PATCH /api/projects/:id` (update project, requires auth, ownership check)
  - [x] Implement `DELETE /api/projects/:id` (delete project, requires auth, ownership check)
  - [x] Add auth middleware to all routes
  - [x] Add validation middleware
- [x] Create project service
  - [x] Create `api/src/services/project.service.ts`
  - [x] Implement `createProject(userId, projectData)` - create project, link to user
  - [x] Implement `getProjectsByUser(userId)` - list all user's projects
  - [x] Implement `getProjectById(projectId, userId)` - get project with ownership check
  - [x] Implement `updateProject(projectId, userId, updates)` - update project with ownership check
  - [x] Implement `deleteProject(projectId, userId)` - delete project with ownership check
- [x] Register project routes
  - [x] Add project routes to main Express app in `api/src/index.ts`
  - [x] Test all endpoints with authentication

### Step 3.4: Update Dashboard Page
- [x] Update Dashboard to show project list
  - [x] Review template Dashboard (`web/src/routes/Dashboard.tsx`)
  - [x] Replace "Under Construction" with project list display
  - [x] Create project cards showing name, description, and tags
  - [x] Make project cards clickable to navigate to project detail
- [x] Add "Start First Project" button
  - [x] If user has no projects, display "Start First Project" button instead of empty list
  - [x] Button should be prominent and centered
- [x] Create project creation modal
  - [x] Create `web/src/components/CreateProjectModal.tsx`
  - [x] Add form fields: Project Name (required), Description (optional), Tags (optional)
  - [x] Add form validation
  - [x] Add Cancel and Create buttons
- [x] Implement project creation
  - [x] Connect modal form to `POST /api/projects` endpoint
  - [x] Handle form submission, validation, and error handling
  - [x] Refresh project list after successful creation
  - [x] Close modal after successful creation
- [x] Fetch and display projects
  - [x] On Dashboard load, fetch user's projects from `GET /api/projects`
  - [x] Handle loading state (show spinner while fetching)
  - [x] Handle error state (show error message if fetch fails)
  - [x] Display projects in a grid or list layout

### Step 3.5: Create Project Detail View
- [x] Create project detail route
  - [x] Add route `/projects/:id` to `web/src/App.tsx`
  - [x] Route should render ProjectDetail component
  - [x] Route should be protected (require authentication)
- [x] Create ProjectDetail component
  - [x] Create `web/src/pages/ProjectDetail.tsx`
  - [x] Implement left sidebar with tabs:
    - Home (enabled, clickable)
    - Tasks (disabled)
    - [gap/divider]
    - Development (disabled) with subtabs: Code, Deployment, Access Tokens (all disabled)
    - Marketing and Sales (disabled)
    - Analytics and Insights (disabled)
    - [gap/divider]
    - Project Settings (enabled, clickable)
    - Collaborators (disabled)
  - [x] Implement tab switching functionality
  - [x] Style disabled tabs (grayed out, cursor: not-allowed)
- [x] Fetch project data
  - [x] On ProjectDetail load, fetch project data from `GET /api/projects/:id`
  - [x] Use route parameter `:id` to identify project
  - [x] Handle loading state
  - [x] Handle error state (404 if project not found, 403 if not owner)
- [x] Add navigation from Dashboard
  - [x] Make project cards on Dashboard clickable
  - [x] Clicking a project card should navigate to `/projects/:id`
  - [x] Use React Router's `useNavigate` or `Link` component

### Step 3.6: Implement Home Tab
- [x] Create Home tab content
  - [x] In ProjectDetail component, create Home tab view
  - [x] Add disabled ChatGPT-style chatbot interface at the top
  - [x] Project details moved to top of page (above tabs and main content card)
- [x] Style disabled chatbot terminal
  - [x] Create visual ChatGPT-style chatbot interface (inline in ProjectDetail)
  - [x] Style as disabled (grayed out, shows "Coming Soon" overlay)
  - [x] Make it visually clear it's not functional yet
- [x] Display project information
  - [x] Project details header at top of page: name, description, tags (right), last updated (right)
  - [x] Home tab shows disabled ChatGPT-style interface with example prompts
  - [x] Style as placeholder/informational content

### Step 3.7: Implement Project Settings Tab
- [x] Create Project Settings tab content
  - [x] In ProjectDetail component, create Project Settings tab view
  - [x] Add edit form for Name, Description, and Tags
  - [x] Add Save and Cancel buttons
  - [x] Add Delete project button
- [x] Implement edit functionality
  - [x] Pre-fill form with current project data
  - [x] On save, call `PATCH /api/projects/:id` to update project
  - [x] Handle form validation (name required)
  - [x] Handle success (show success message, update UI)
  - [x] Handle errors (show error message)
- [x] Implement delete functionality
  - [x] Create delete button
  - [x] Show confirmation dialog: "Are you sure you want to delete this project? This action cannot be undone."
  - [x] On confirm, call `DELETE /api/projects/:id`
  - [x] On success, redirect to Dashboard
  - [x] Handle errors (show error message)
- [x] Handle loading and error states
  - [x] Show loading indicators during API calls
  - [x] Display error messages if operations fail
  - [x] Provide user feedback for all operations

### Step 3.8: Update Frontend API Client
- [x] Add project API functions
  - [x] Review template API client (`web/src/lib/api.ts`)
  - [x] Add `createProject(projectData)` - POST /api/projects
  - [x] Add `getProjects()` - GET /api/projects
  - [x] Add `getProject(id)` - GET /api/projects/:id
  - [x] Add `updateProject(id, updates)` - PATCH /api/projects/:id
  - [x] Add `deleteProject(id)` - DELETE /api/projects/:id
  - [x] Ensure all functions handle authentication (cookies)
  - [x] Ensure all functions handle errors appropriately

### Step 3.9: Testing and Verification
- [ ] Test Navbar branding
  - [ ] Verify "AIO SaaS App" appears in navbar on all pages
  - [ ] Verify branding is consistent
- [ ] Test Landing page
  - [ ] Verify landing page content describes the platform
  - [ ] Verify logged-in users see "Get Started" button
  - [ ] Verify "Get Started" button navigates to Dashboard
- [ ] Test project creation
  - [ ] Test creating project with name only
  - [ ] Test creating project with name, description, and tags
  - [ ] Verify project appears in Dashboard list after creation
  - [ ] Test form validation (name required)
- [ ] Test project listing
  - [ ] Verify Dashboard shows all user's projects
  - [ ] Verify "Start First Project" appears when no projects exist
  - [ ] Verify project cards display name, description, and tags
- [ ] Test project detail view
  - [ ] Verify clicking a project opens detail view
  - [ ] Verify tabs work (Home and Settings enabled, others disabled)
  - [ ] Verify disabled tabs show visual indicator
- [x] Test project editing
  - [x] Test editing project name
  - [x] Test editing project description
  - [x] Test editing project tags
  - [x] Verify changes are saved and reflected in UI
- [x] Test project deletion
  - [x] Test delete button shows confirmation dialog
  - [x] Test canceling deletion
  - [x] Test confirming deletion
  - [x] Verify project is deleted and user redirected to Dashboard
- [x] Test theme support
  - [x] Verify all new pages work with light theme
  - [x] Verify all new pages work with dark theme
  - [x] Test theme switching on all new pages
- [x] Test responsive design
  - [x] Test Dashboard on mobile, tablet, desktop
  - [x] Test ProjectDetail on mobile, tablet, desktop
  - [x] Test modals on mobile, tablet, desktop
  - [x] Verify navigation works on all screen sizes

---

## Phase 4: Workflow & Agent System (Backend Only)

**Goal:** Build backend workflow orchestrator, GitHub Actions integration, agent system, and real-time update infrastructure. **NO FRONTEND UPDATES** in this phase.

**Assigned to:** Dev 2  
**Prerequisites from Phases 1-3:**
- Phase 1: API server setup (`api/src/index.ts`), Express app with middleware, environment variable setup
- Phase 2: Template integrated (backend, frontend, deployment), authentication working, database models available
- Phase 3: UI updated to display project branding and structure, Project model and service created, all template functionality preserved (RBAC, themes, etc.)

**Note:** This phase is backend-only. Frontend updates for viewing and interacting with workflows will be implemented in Phase 5.

### Step 4.1: GitHub App Integration

**Prerequisites (from Dev 1):**
- ✅ API server running (`api/src/index.ts` from Phase 1, Step 1.3)
- ✅ Environment variable setup (Phase 1, Step 1.2)
- ✅ `api/src/integrations/` directory exists (Phase 1, Step 1.3)

- [ ] Research GitHub App setup
  - [ ] Review GitHub App documentation
  - [ ] Understand GitHub App vs OAuth App differences
  - [ ] Identify required permissions: `issues`, `pull_requests`, `actions:write`, `contents:write`, `metadata`
  - [ ] Understand installation flow and webhook setup
- [ ] Create GitHub App integration service
  - [ ] Create `api/src/integrations/github-app.service.ts`
  - [ ] Implement GitHub App authentication (JWT generation)
  - [ ] Implement installation token retrieval
  - [ ] Implement `repository_dispatch` wrapper with idempotency (UUID v7 dispatchId)
  - [ ] Implement retry logic with exponential backoff (5 attempts with jitter)
  - [ ] Add error handling (rate limits, API errors)
- [ ] Create GitHub App routes
  - [ ] Create `api/src/routes/github-app.routes.ts`
  - [ ] Implement `POST /auth/github-app/callback` (App installation flow)
  - [ ] Implement `GET /repos` (list installable repos)
  - [ ] Add auth middleware
- [ ] Testing
  - [ ] Test GitHub App installation flow
  - [ ] Test repository_dispatch with idempotency
  - [ ] Test rate limit handling
  - [ ] Test error scenarios

### Step 4.2: Run and Issue Models

**Prerequisites (from Dev 1):**
- ✅ `api/src/models/` directory exists (Phase 1, Step 1.3)
- ✅ Project model created (Phase 3, Step 3.3 - Project model)
- ✅ MongoDB connection working (Phase 1, Step 1.3)

- [ ] Create Run model
  - [ ] Create `api/src/models/Run.ts`
  - [ ] Define schema: `runId` (string, unique), `ideaId` (string), `projectId` (ref: Project), `rootIssueId` (number, optional), `state` (enum: IDEA_SUBMITTED, SPEC_WRITING, ISSUE_TREE, EXECUTION_LOOP, QA, MERGE, RELEASE, DONE), `timeline` (array of log entries), `currentIssueId` (number, optional), `interrupt` (object with paused boolean and reason), `correlationId` (string), `created_at`, `updated_at`
  - [ ] Add timestamps plugin
  - [ ] Create indexes on `runId`, `projectId`, `state`
  - [ ] Export model
- [ ] Create Ticket/Issue model
  - [ ] Create `api/src/models/Ticket.ts` (or `Issue.ts`)
  - [ ] Define schema: `id` (number, GitHub issue number), `repo` (string), `type` (enum: 'epic', 'feature', 'task', 'defect'), `title` (string), `body` (string), `parentId` (number, optional), `children` (array of numbers), `orderIndex` (number, optional), `status` (enum: 'NEW', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'QA', 'DONE'), `branch` (string, optional), `prNumber` (number, optional), `labels` (array of strings), `acceptanceCriteria` (array of strings, optional), `dependencies` (array of numbers, optional), `projectId` (ref: Project), `runId` (string, optional), `created_at`, `updated_at`
  - [ ] Add timestamps plugin
  - [ ] Create indexes on `id`, `repo`, `parentId`, `projectId`, `runId`, `status`
  - [ ] Export model
- [ ] Create Agent model
  - [ ] Create `api/src/models/Agent.ts`
  - [ ] Define schema: `_id`, `projectId` (ref: Project, optional), `type` (enum: 'spec-writer', 'roadmap-decomposer', 'acceptance-criteria-author', 'issue-planner', 'developer-implementer', 'refactorer', 'test-author', 'code-reviewer', 'qa-tester', 'security-auditor', 'release-manager', 'infra-deploy-engineer'), `name` (string), `role` (string), `goals` (array of strings), `tools` (array of strings), `constraints` (array of strings), `guardrails` (array of strings), `enabled` (boolean), `onboardingDocRef` (string, optional), `contextPacks` (array of strings, optional), `created_at`, `updated_at`
  - [ ] Add timestamps plugin
  - [ ] Create indexes on `projectId`, `type`, `enabled`
  - [ ] Export model
- [ ] Create AgentRun model
  - [ ] Create `api/src/models/AgentRun.ts`
  - [ ] Define schema: `_id`, `runId` (string, ref: Run), `agentId` (ref: Agent), `projectId` (ref: Project), `input` (object), `output` (object, optional), `steps` (array of objects), `status` (enum: 'pending', 'running', 'completed', 'failed'), `artifactsIn` (array of strings, optional), `artifactsOut` (array of strings, optional), `created_at`, `updated_at`
  - [ ] Add timestamps plugin
  - [ ] Create indexes on `runId`, `agentId`, `projectId`, `status`
  - [ ] Export model
- [ ] Testing
  - [ ] Test Run model CRUD operations
  - [ ] Test Ticket model with hierarchy (parent/children)
  - [ ] Test Agent model CRUD operations
  - [ ] Test AgentRun model CRUD operations
  - [ ] Test model relationships and references

### Step 4.3: Cursor AI Integration & Adapter

**Prerequisites (from Dev 1):**
- ✅ API server running (`api/src/index.ts` from Phase 1, Step 1.3)
- ✅ Environment variable `CURSOR_API_KEY` set in `.env` (Phase 1, Step 1.2)
- ✅ `api/src/integrations/` directory exists (Phase 1, Step 1.3)
- ✅ Agent model created (Step 4.2 above)

- [ ] Research Cursor Cloud Agents API
  - [ ] Find API documentation
  - [ ] Identify endpoint URLs
  - [ ] Identify authentication method (API key in header)
  - [ ] Identify request/response formats
  - [ ] Understand adapter interface requirements
- [ ] Create Cursor adapter interface
  - [ ] Create `api/src/integrations/cursor-adapter.interface.ts`
  - [ ] Define interface: `POST /adapters/cursor/execute { repo, branch, task, context }`
  - [ ] Define request/response contract matching agent contract from notes
- [ ] Create Cursor API client
  - [ ] Create `api/src/integrations/cursor.service.ts`
  - [ ] Implement API client initialization with API key from env
  - [ ] Implement `createAgentRun(agentConfig, prompt, context)` - create agent run
  - [ ] Implement `getAgentRunStatus(runId)` - check run status
  - [ ] Implement `getAgentRunResult(runId)` - get run result
  - [ ] Implement adapter interface methods
  - [ ] Add error handling (network errors, API errors)
  - [ ] Add retry logic (3 attempts with exponential backoff)
- [ ] Create Cursor adapter routes (for headless runner pattern)
  - [ ] Create `api/src/routes/cursor-adapter.routes.ts`
  - [ ] Implement `POST /adapters/cursor/execute` (internal endpoint for GitHub Actions)
  - [ ] Add authentication/authorization (verify request from GitHub Actions)
- [ ] Testing
  - [ ] Test Cursor API client initialization
  - [ ] Test agent run creation and status checking
  - [ ] Test adapter interface
  - [ ] Test error handling and retries

### Step 4.4: Prompt Templates & Onboarding Docs

**Prerequisites (from Dev 1):**
- ✅ `api/src/services/` directory exists (Phase 1, Step 1.3)
- ✅ Project model created (Phase 3, Step 3.3 - Project model)
- ✅ Agent model created (Step 4.2 above)

- [ ] Create prompt template service
  - [ ] Create `api/src/services/prompt.service.ts`
  - [ ] Implement `buildPMPrompt(objective, context)` - build PM agent prompt with objective and project context
  - [ ] Implement `buildFEPrompt(task, context)` - build FE agent prompt with task details and codebase context
  - [ ] Implement `buildBEPrompt(task, context)` - build BE agent prompt with task details and API context
  - [ ] Implement `buildQAPrompt(task, context)` - build QA agent prompt with task and test context
  - [ ] Implement `buildDevOpsPrompt(task, context)` - build DevOps agent prompt with deployment context
  - [ ] Implement `buildMarketingPrompt(releaseData, context)` - build Marketing agent prompt with PR/ticket data
  - [ ] Implement `buildNemotronPrompt(agentType, objective, context)` - build Nemotron agent prompts
- [ ] Create onboarding docs service
  - [ ] Create `api/src/services/onboarding-docs.service.ts`
  - [ ] Implement `getOnboardingDoc(agentType)` - retrieve onboarding doc from DB/repo
  - [ ] Implement `updateOnboardingDoc(agentType, content)` - update onboarding doc
  - [ ] Implement `getContextPacks(projectId, agentType)` - retrieve context packs (prior PRs, logs, ADRs)
  - [ ] Create default onboarding doc templates:
    - [ ] `onboarding/spec-writer.md` (product voice, templates, non-functional reqs)
    - [ ] `onboarding/roadmap.md` (tree rules, ordering, DoR/DoD)
    - [ ] `onboarding/dev.md` (coding standards, arch overview, service boundaries)
    - [ ] `onboarding/tests.md` (test pyramid, coverage thresholds, fixtures)
    - [ ] `onboarding/reviewer.md` (PR rubric, style guide, security checks)
    - [ ] `onboarding/qa.md` (test plans, exploratory checklist, defect taxonomy)
    - [ ] `onboarding/release.md` (semver, changelog, rollback)
    - [ ] `onboarding/infra.md` (deploy targets, IaC, secrets policy)
- [ ] Testing
  - [ ] Test prompt building for each agent type
  - [ ] Test onboarding doc retrieval and updates
  - [ ] Test context pack retrieval

### Step 4.5: Run Service & State Machine

**Prerequisites (from Dev 1):**
- ✅ `api/src/services/` directory exists (Phase 1, Step 1.3)
- ✅ Run model created (Step 4.2 above)
- ✅ Project model created (Phase 3, Step 3.3 - Project model)

- [ ] Create run service
  - [ ] Create `api/src/services/run.service.ts`
  - [ ] Import Run model (from Step 4.2)
  - [ ] Import Project model (from Phase 3, Step 3.3)
  - [ ] Implement `createRun(projectId, ideaId, correlationId)` - create run record
  - [ ] Implement `getRun(runId)` - get run details
  - [ ] Implement `updateRunState(runId, state)` - update run state
  - [ ] Implement `addRunLog(runId, logEntry)` - add log entry to run timeline
  - [ ] Implement `setCurrentIssue(runId, issueId)` - set current issue being processed
  - [ ] Implement `interruptRun(runId, action, reason)` - pause/resume/cancel run
  - [ ] Implement run state machine
    - [ ] Define states: IDEA_SUBMITTED, SPEC_WRITING, ISSUE_TREE, EXECUTION_LOOP, QA, MERGE, RELEASE, DONE
    - [ ] Implement state transitions with validation
    - [ ] Add validation for valid transitions only
    - [ ] Handle interrupt states (paused, cancelled)
- [ ] Testing
  - [ ] Test run creation and retrieval
  - [ ] Test state machine transitions
  - [ ] Test interrupt functionality
  - [ ] Test timeline logging

### Step 4.6: GitHub Webhook Receiver

**Prerequisites (from Dev 1):**
- ✅ API server running with Express app (Phase 1, Step 1.3)
- ✅ Auth middleware created (Phase 2, Step 2.1 - template auth middleware, updated in Phase 3)
- ✅ Run service completed (Step 4.5 above)
- ✅ Ticket model created (Step 4.2 above)
- ✅ GitHub App integration completed (Step 4.1 above)
- ✅ `api/src/routes/` directory exists (Phase 1, Step 1.3)

- [ ] Create webhook verification utility
  - [ ] Create `api/src/lib/webhook-verification.ts`
  - [ ] Implement HMAC signature verification for GitHub webhooks
  - [ ] Implement replay protection (cache delivery_id)
  - [ ] Add error handling for invalid signatures
- [ ] Create GitHub webhook receiver
  - [ ] Create `api/src/routes/github-webhook.routes.ts`
  - [ ] Implement `POST /webhooks/github` (HMAC verified webhook receiver)
  - [ ] Implement event router to handle different webhook types:
    - [ ] `issues` - update issue status, create/update Ticket
    - [ ] `issue_comment` - update issue comments
    - [ ] `pull_request` - update PR status, create/update Ticket
    - [ ] `pull_request_review` - update review status
    - [ ] `check_run` - update CI status
    - [ ] `check_suite` - update CI suite status
    - [ ] `workflow_job` - update workflow job status
    - [ ] `workflow_run` - update workflow run status
    - [ ] `push` - update branch status
    - [ ] `status` - update commit status
    - [ ] `deployment` - update deployment status
    - [ ] `deployment_status` - update deployment status
  - [ ] Implement `repository_dispatch` handler for status callbacks from GitHub Actions
    - [ ] Parse `orchestrator.status` events
    - [ ] Update run state and timeline
    - [ ] Update issue/ticket status
  - [ ] Add webhook verification middleware
- [ ] Integrate webhook receiver with run service
  - [ ] Update run state based on webhook events
  - [ ] Add timeline entries from webhook events
  - [ ] Update ticket/issue status from webhook events
- [ ] Testing
  - [ ] Test webhook signature verification
  - [ ] Test replay protection
  - [ ] Test each webhook event type
  - [ ] Test repository_dispatch status callbacks
  - [ ] Test error handling for invalid webhooks

### Step 4.7: Ideas & Runs API Routes

**Prerequisites (from Dev 1):**
- ✅ API server running with Express app (Phase 1, Step 1.3)
- ✅ Auth middleware created (Phase 2, Step 2.1 - template auth middleware, updated in Phase 3)
- ✅ Run service completed (Step 4.5 above)
- ✅ Project service available (Phase 3, Step 3.3 - Project service)
- ✅ GitHub App integration completed (Step 4.1 above)
- ✅ `api/src/routes/` directory exists (Phase 1, Step 1.3)

- [ ] Create ideas/runs routes
  - [ ] Create `api/src/routes/ideas.routes.ts`
  - [ ] Import auth middleware (from template - Phase 2)
  - [ ] Import run service (from Step 4.5)
  - [ ] Import project service (from Phase 3, Step 3.3)
  - [ ] Import GitHub App service (from Step 4.1)
  - [ ] Implement `POST /api/ideas` - create idea and start run
    - [ ] Accept: `{ideaText, repo, options}` (projectId, description, size)
    - [ ] Create run with correlationId
    - [ ] Emit `repository_dispatch` to target repo with `{runId, ideaId, planOptions}`
    - [ ] Return: `{runId}`
  - [ ] Implement `GET /api/runs/:runId` - get run state and timeline
    - [ ] Return run details with full timeline
  - [ ] Implement `POST /api/runs/:runId/interrupt` - pause/resume/cancel run
    - [ ] Accept: `{action:'pause'|'resume'|'cancel', reason?}`
    - [ ] Update run interrupt state
    - [ ] Emit `repository_dispatch` type `orchestrator.pause` or `orchestrator.cancel`
  - [ ] Implement `GET /api/runs/:runId/issues` - get hierarchical issue tree
    - [ ] Return hierarchical tree of issues/tickets
  - [ ] Implement `GET /api/issues/:id` - get full issue with children
    - [ ] Return issue details with all children
  - [ ] Implement `POST /api/issues/:id/reorder` - set child order
    - [ ] Accept: `{children: [issueIds]}`
    - [ ] Update issue orderIndex
  - [ ] Implement `POST /api/runs/:runId/retry/:nodeId` - retry failed node
    - [ ] Reset node state and retry
  - [ ] Implement `POST /api/runs/:runId/advance` - force next step when allowed
    - [ ] Advance run to next state if no blockers
  - [ ] Add auth middleware to all routes
- [ ] Testing
  - [ ] Test idea creation and run start
  - [ ] Test run retrieval with timeline
  - [ ] Test interrupt functionality
  - [ ] Test issue hierarchy retrieval
  - [ ] Test retry and advance endpoints

### Step 4.8: Agents API Routes

**Prerequisites (from Dev 1):**
- ✅ API server running with Express app (Phase 1, Step 1.3)
- ✅ Auth middleware created (Phase 2, Step 2.1 - template auth middleware, updated in Phase 3)
- ✅ Agent model created (Step 4.2 above)
- ✅ Onboarding docs service completed (Step 4.4 above)
- ✅ `api/src/routes/` directory exists (Phase 1, Step 1.3)

- [ ] Create agents routes
  - [ ] Create `api/src/routes/agents.routes.ts`
  - [ ] Import auth middleware (from template - Phase 2)
  - [ ] Import Agent model (from Step 4.2)
  - [ ] Import onboarding docs service (from Step 4.4)
  - [ ] Implement `GET /api/agents` - get agent catalog
    - [ ] Return list of all agents with their types and configurations
  - [ ] Implement `GET /api/agents/:id` - get agent details
    - [ ] Return agent configuration and details
  - [ ] Implement `GET /api/agents/:id/onboarding` - get agent onboarding doc
    - [ ] Return onboarding doc content for agent
  - [ ] Implement `PUT /api/agents/:id/onboarding` - update agent onboarding doc refs
    - [ ] Accept: `{onboardingDocRef, contextPacks}`
    - [ ] Update agent onboarding doc references
  - [ ] Add auth middleware to all routes
- [ ] Testing
  - [ ] Test agent catalog retrieval
  - [ ] Test agent details retrieval
  - [ ] Test onboarding doc retrieval
  - [ ] Test onboarding doc updates
  - [ ] Test authorization checks

### Step 4.9: SSE Service (Backend Only)

**Prerequisites (from Dev 1):**
- ✅ API server running with Express app (Phase 1, Step 1.3)
- ✅ Auth middleware created (Phase 2, Step 2.1 - template auth middleware, updated in Phase 3)
- ✅ Run service completed (Step 4.5 above)
- ✅ `api/src/middleware/` directory exists (Phase 1, Step 1.3)

**Note:** This step creates the SSE backend infrastructure only. Frontend SSE hook will be created in Phase 5.

- [ ] Create SSE service
  - [ ] Create `api/src/services/sse.service.ts`
  - [ ] Implement client connection management (Map of runId to Set of response objects)
  - [ ] Implement `sendEvent(runId, eventType, data)` - send event to all clients for run
  - [ ] Implement `broadcastEvent(runId, event)` - broadcast event to all connected clients
  - [ ] Implement client reconnection handling (client reconnects, resume from last event)
  - [ ] Add connection cleanup (remove clients on disconnect)
- [ ] Create SSE middleware
  - [ ] Create `api/src/middleware/sse.middleware.ts`
  - [ ] Set SSE headers (Content-Type: text/event-stream, Cache-Control: no-cache)
  - [ ] Handle connection lifecycle (keep connection open, handle disconnect)
  - [ ] Add heartbeat mechanism (send ping every 30 seconds)
- [ ] Create SSE route
  - [ ] Add `GET /api/runs/:runId/stream` to `api/src/routes/ideas.routes.ts`
  - [ ] Import SSE service
  - [ ] Import auth middleware
  - [ ] Implement SSE stream endpoint (requires auth)
  - [ ] Register client connection on connect
  - [ ] Clean up client connection on disconnect
- [ ] Integrate SSE in run service
  - [ ] Import SSE service in run service
  - [ ] Emit SSE events at each run state change
  - [ ] Send state change events
  - [ ] Send timeline update events
  - [ ] Send error events
- [ ] Testing
  - [ ] Test SSE connection establishment
  - [ ] Test event broadcasting
  - [ ] Test client reconnection
  - [ ] Test connection cleanup
  - [ ] Test heartbeat mechanism

---

## Phase 5: Code Module & Frontend Integration (Critical Path)

**Goal:** Build the core code module that enables autonomous hierarchical issue-based workflow execution via GitHub Actions, and create frontend UI to view and interact with GitHub Actions workflows.

**Assigned to:** Dev 2 (continuing from Phase 4)

**Prerequisites from Phase 4:**
- Phase 4: GitHub App integration, Run/Ticket/Agent models, Cursor adapter, prompt templates, run service, webhook receiver, ideas/runs API routes, SSE service (backend)

### Step 5.1: Agent Service & Orchestration

**Prerequisites (from Dev 1):**
- ✅ Cursor AI integration completed (Phase 4, Step 4.3)
- ✅ Prompt service completed (Phase 4, Step 4.4)
- ✅ Run service completed (Phase 4, Step 4.5)
- ✅ Agent model created (Phase 4, Step 4.2)
- ✅ AgentRun model created (Phase 4, Step 4.2)
- ✅ GitHub App integration completed (Phase 4, Step 4.1)

- [ ] Create agent service
  - [ ] Create `api/src/services/agent.service.ts`
  - [ ] Import Agent and AgentRun models (from Phase 4, Step 4.2)
  - [ ] Import Cursor AI integration (from Phase 4, Step 4.3)
  - [ ] Import prompt service (from Phase 4, Step 4.4)
  - [ ] Import onboarding docs service (from Phase 4, Step 4.4)
  - [ ] Import GitHub App service (from Phase 4, Step 4.1)
  - [ ] Implement `executeAgent(agentType, prompt, context)` - execute agent with prompt and context
  - [ ] Implement agent response parsing (parse structured output from agent)
  - [ ] Implement tool context preparation (prepare GitHub, ticket, code context for agent)
  - [ ] Implement context pack preparation (prior PRs, logs, ADRs)
  - [ ] Add agent run logging (log to AgentRun model)
  - [ ] Add error handling (catch and log agent errors)
- [ ] Create workflow orchestrator service
  - [ ] Create `api/src/services/workflow-orchestrator.service.ts`
  - [ ] Import run service (from Phase 4, Step 4.5)
  - [ ] Import agent service (from above)
  - [ ] Import GitHub App service (from Phase 4, Step 4.1)
  - [ ] Import project service (from Phase 3, Step 3.3)
  - [ ] Import Ticket model (from Phase 4, Step 4.2)
  - [ ] Import SSE service (from Phase 4, Step 4.8)
  - [ ] Implement `startCodeWorkflow(projectId, description, size)` - start code workflow from description and size
    - [ ] Create run with correlationId
    - [ ] Emit `repository_dispatch` type `orchestrator.start` with `{runId, ideaId, planOptions}`
    - [ ] Update run state to IDEA_SUBMITTED
  - [ ] Implement workflow state transitions (IDEA_SUBMITTED → SPEC_WRITING → ISSUE_TREE → EXECUTION_LOOP → QA → MERGE → RELEASE → DONE)
  - [ ] Implement interrupt handling (pause/resume/cancel via repository_dispatch)
- [ ] Testing
  - [ ] Test agent execution for each agent type
  - [ ] Test agent response parsing
  - [ ] Test context preparation
  - [ ] Test workflow orchestrator start
  - [ ] Test state transitions
  - [ ] Test interrupt functionality

### Step 5.2: Hierarchical Issue Service

**Prerequisites (from Dev 1):**
- ✅ Ticket model created (Phase 4, Step 4.2)
- ✅ GitHub App integration completed (Phase 4, Step 4.1)
- ✅ Agent service completed (Step 5.1 above)

- [ ] Create issue hierarchy service
  - [ ] Create `api/src/services/issue-hierarchy.service.ts`
  - [ ] Import Ticket model (from Phase 4, Step 4.2)
  - [ ] Import GitHub App service (from Phase 4, Step 4.1)
  - [ ] Import agent service (from Step 5.1)
  - [ ] Implement `createIssueHierarchy(projectId, description, size)` - create hierarchical issues based on size
    - [ ] Call PM Agent (Nemotron) to analyze description and size, determine hierarchy
    - [ ] Create hierarchical issues via GitHub Issues API:
      - [ ] Initiative → Roadmap → Epics → Stories → Tickets
      - [ ] New Feature → Epic → Stories → Tickets
      - [ ] Maintenance → Story → Tickets
      - [ ] Bug Fix → Ticket
    - [ ] Store issue hierarchy in database (use Ticket model with parentId/children)
    - [ ] Set orderIndex for ordered children
  - [ ] Implement `getRootIssues(projectId)` - get all root issues
  - [ ] Implement `getIssueChildren(issueId)` - get all children of an issue
  - [ ] Implement `getIssueHierarchy(issueId)` - get full hierarchy (issue + all descendants)
  - [ ] Implement `createDefectIssue(parentIssueId, description)` - create defect issue from QA review
  - [ ] Implement `isIssueComplete(issueId)` - check if issue and all children are complete
  - [ ] Implement `getIssueBranchName(issueId)` - generate branch name for issue
    - [ ] Epic → `epic/<id>-<slug>` from `integration`
    - [ ] Child → `feature/<id>-<slug>` branched from nearest open ancestor branch
    - [ ] Leaf → `task/<id>-<slug>` branched from parent feature
  - [ ] Implement `getParentBranch(issueId)` - get parent branch name (or 'integration' if root)
  - [ ] Implement status propagation (leaf completion → parent advances; open Defect reopens parent and blocks merge)
- [ ] Testing
  - [ ] Test hierarchical issue creation for each size type
  - [ ] Test issue hierarchy retrieval
  - [ ] Test defect issue creation
  - [ ] Test issue completion checking
  - [ ] Test branch name generation
  - [ ] Test status propagation

### Step 5.3: Code Service (GitHub Operations)

**Prerequisites (from Dev 1):**
- ✅ GitHub App integration completed (Phase 4, Step 4.1)
- ✅ Issue hierarchy service completed (Step 5.2 above)
- ✅ Ticket model created (Phase 4, Step 4.2)

- [ ] Create code service
  - [ ] Create `api/src/services/code.service.ts`
  - [ ] Import GitHub App service (from Phase 4, Step 4.1)
  - [ ] Import Ticket model (from Phase 4, Step 4.2)
  - [ ] Import issue hierarchy service (from Step 5.2)
  - [ ] Implement `getBranches(projectId)` - list branches for project's repo
  - [ ] Implement `createBranch(projectId, branchName, baseBranch)` - create branch from base
  - [ ] Implement `createHierarchicalBranch(projectId, issueId, parentBranch)` - create branch for issue with hierarchical naming
  - [ ] Implement `getPullRequests(projectId, filters)` - list PRs with optional filters
  - [ ] Implement `createPullRequest(projectId, branch, base, title, body)` - create PR
  - [ ] Implement `createIssuePR(projectId, issueId)` - create PR for issue (to parent branch or integration)
    - [ ] Each non-root branch targets its parent branch; root targets `integration`
  - [ ] Implement `getPullRequest(projectId, prNumber)` - get PR details
  - [ ] Implement `mergePullRequest(projectId, prNumber)` - merge PR
  - [ ] Implement `mergeToRegression(projectId, branch)` - merge branch to regression branch
  - [ ] Implement `getFileContent(projectId, path, branch)` - get file content
  - [ ] Implement `createOrUpdateFile(projectId, path, content, branch, message)` - create or update file
  - [ ] Implement `ensureIntegrationBranch(projectId)` - ensure integration branch exists
  - [ ] Implement `ensureRegressionBranch(projectId)` - ensure regression branch exists
- [ ] Testing
  - [ ] Test branch listing and creation
  - [ ] Test hierarchical branch creation
  - [ ] Test PR creation and listing
  - [ ] Test PR merging
  - [ ] Test file operations
  - [ ] Test integration/regression branch creation

### Step 5.4: GitHub Actions Workflow Files

**Prerequisites (from Dev 1):**
- ✅ GitHub App integration completed (Phase 4, Step 4.1)
- ✅ Run service completed (Phase 4, Step 4.5)
- ✅ Workflow orchestrator completed (Step 5.1 above)

**Note:** These workflow files will be committed to the target repository (not this platform repo).

- [ ] Create orchestrator workflow
  - [ ] Create `.github/workflows/orchestrator.yml` (entrypoint via `repository_dispatch`)
    - [ ] Trigger on: `repository_dispatch` types: `orchestrator.start`, `orchestrator.pause`, `orchestrator.cancel`
    - [ ] Parse payload: `{runId, ideaId, planOptions}`
    - [ ] Call reusable workflows: `ai.spec`, `plan.issues`, then loop `exec.issue → qa.pipeline → merge.gate → next`
    - [ ] Emit status callbacks via `repository_dispatch` back to backend
  - [ ] Add permissions: `contents: write`, `pull-requests: write`, `issues: write`, `actions: write`, `id-token: write`
  - [ ] Add concurrency groups with runId
- [ ] Create reusable workflows (under `.github/workflows/_reusable/`)
  - [ ] Create `ai.spec.yml` - Drafts product spec from Idea (Nemotron)
  - [ ] Create `ai.plan.yml` - Decomposes spec → ordered issue DAG with acceptance criteria (Nemotron)
  - [ ] Create `issues.sync.yml` - Creates/updates GitHub issues from DAG (labels, order)
  - [ ] Create `branch.manage.yml` - Creates branches per node, sets PR targets/auto-draft
  - [ ] Create `agent.cursor.execute.yml` - Implement task; push commits; update PR (Cursor)
  - [ ] Create `agent.cursor.review.yml` - Code review; inline comments (Cursor)
  - [ ] Create `qa.run.yml` - Unit/integration/e2e matrix; coverage gates
  - [ ] Create `sec.scan.yml` - SAST/Secrets/License scans
  - [ ] Create `qa.defect.file.yml` - Files defects from failing checks or QA prompts
  - [ ] Create `merge.gate.yml` - Ensures all children resolved; required checks pass; merges
  - [ ] Create `release.notes.yml` - Generates release notes (Nemotron)
  - [ ] Create `deploy.env.yml` - Deploy via environment protection rules & OIDC
  - [ ] Create `audit.emit.yml` - Posts structured events to Backend
  - [ ] Create `artifacts.retention.yml` - Packages logs/reports
  - [ ] Each workflow should:
    - [ ] Accept `runId` as input
    - [ ] Emit status via `repository_dispatch` back to backend
    - [ ] Upload artifacts (JSON) for backend to fetch as fallback
    - [ ] Check `cancellationToken` flag (fetched from backend) for pause/cancel
- [ ] Testing
  - [ ] Test orchestrator workflow trigger via repository_dispatch
  - [ ] Test each reusable workflow independently
  - [ ] Test status callbacks to backend
  - [ ] Test pause/cancel functionality
  - [ ] Test artifact upload and retrieval

### Step 5.5: QA Review & Defect Management

**Prerequisites (from Dev 1):**
- ✅ Agent service completed (Step 5.1 above)
- ✅ Issue hierarchy service completed (Step 5.2 above)
- ✅ Code service completed (Step 5.3 above)

- [ ] Create QA review service
  - [ ] Create `api/src/services/qa-review.service.ts`
  - [ ] Import agent service (from Step 5.1)
  - [ ] Import issue hierarchy service (from Step 5.2)
  - [ ] Import Ticket model (from Phase 4, Step 4.2)
  - [ ] Implement `reviewPR(projectId, prNumber)` - call QA Agent (Nemotron+Cursor hybrid) to review PR
  - [ ] Implement `identifyCriticalIssues(review)` - identify critical bugs/defects from review
  - [ ] Implement `createDefectIssues(projectId, parentIssueId, criticalIssues)` - create defect issues from critical issues
    - [ ] Defect type: 'defect', parent: current issue
    - [ ] Defect turns a leaf into a non-leaf until resolved
  - [ ] Implement `checkDefectsResolved(issueId)` - check if all defect issues are resolved
  - [ ] Implement `waitForDefectsResolved(issueId, timeout)` - wait for defects to be resolved
- [ ] Integrate QA review in workflow
  - [ ] After PR creation, call QA review service
  - [ ] If critical issues found, create defect issues
  - [ ] Block PR merge until defects resolved (gating rule)
  - [ ] Update issue status based on review results
- [ ] Testing
  - [ ] Test QA review for PRs
  - [ ] Test defect issue creation
  - [ ] Test defect resolution checking
  - [ ] Test merge blocking with unresolved defects

### Step 5.6: CI/CD Status Service

**Prerequisites (from Dev 1):**
- ✅ GitHub webhook receiver completed (Phase 4, Step 4.6)
- ✅ Run service completed (Phase 4, Step 4.5)
- ✅ SSE service completed (Phase 4, Step 4.8)

- [ ] Create CI status service
  - [ ] Create `api/src/services/ci.service.ts`
  - [ ] Import Ticket model (from Phase 4, Step 4.2)
  - [ ] Import run service (from Phase 4, Step 4.5)
  - [ ] Import SSE service (from Phase 4, Step 4.8)
  - [ ] Implement `updateCIStatus(projectId, prNumber, status)` - update CI status from webhook
  - [ ] Implement `getCIStatus(projectId, prNumber)` - get current CI status
  - [ ] Implement `waitForCI(projectId, prNumber, timeout)` - poll CI status until complete or timeout
  - [ ] Integrate with webhook receiver (from Phase 4, Step 4.6)
    - [ ] Handle `check_run`, `check_suite`, `workflow_job`, `workflow_run` webhook events
    - [ ] Update run timeline with CI status
    - [ ] Broadcast SSE events for CI status updates
- [ ] Testing
  - [ ] Test CI status updates from webhooks
  - [ ] Test CI status polling
  - [ ] Test SSE events for CI updates
  - [ ] Test timeout handling

### Step 5.7: Code Routes
- [ ] Create code routes
  - [ ] Create `api/src/routes/code.routes.ts`
  - [ ] Import auth middleware (from template - Phase 2)
  - [ ] Import code service (from Step 5.3)
  - [ ] Import issue hierarchy service (from Step 5.2)
  - [ ] Import workflow orchestrator (from Step 5.1)
  - [ ] Implement `POST /api/projects/:id/code` (start code workflow with description and size, requires auth)
  - [ ] Implement `GET /api/projects/:id/branches` (list branches, requires auth)
  - [ ] Implement `POST /api/projects/:id/branches` (create branch, requires auth)
  - [ ] Implement `GET /api/projects/:id/prs` (list PRs, requires auth)
  - [ ] Implement `POST /api/projects/:id/prs` (create PR, requires auth)
  - [ ] Implement `GET /api/projects/:id/prs/:prNumber` (get PR, requires auth)
  - [ ] Implement `POST /api/projects/:id/prs/:prNumber/merge` (merge PR, requires auth)
  - [ ] Implement `POST /api/projects/:id/issues/:issueId/defects` (create defect issue, requires auth)
  - [ ] Implement `GET /api/projects/:id/issues/:issueId/hierarchy` (get issue hierarchy, requires auth)
  - [ ] Add auth middleware to all routes
- [ ] Testing
  - [ ] Test all code routes with authentication
  - [ ] Test authorization checks
  - [ ] Test error handling

### Step 5.8: Deployment Module
- [ ] Create deployment service
  - [ ] Create `api/src/services/deployment.service.ts`
  - [ ] Implement `deploy(projectId, version, env)` - trigger deployment
  - [ ] Implement `getDeployment(deploymentId)` - get deployment details
  - [ ] Implement `getDeployments(projectId)` - list deployments
  - [ ] Implement `rollbackDeployment(deploymentId)` - rollback deployment
  - [ ] Implement Docker operations
    - [ ] Build Docker image (spawn docker build process)
    - [ ] Run docker-compose (spawn docker-compose up process)
    - [ ] Health check (HTTP GET to deployment URL)
    - [ ] Generate deployment URL (construct URL from project and version)
- [ ] Create Docker utility
  - [ ] Create `api/src/lib/docker.ts`
  - [ ] Implement `buildImage(projectId, version)` - build Docker image using child_process
  - [ ] Implement `runContainer(projectId, image)` - run container using docker-compose
  - [ ] Implement `healthCheck(url)` - check if deployment is healthy
  - [ ] Implement `stopContainer(projectId)` - stop running container
  - [ ] Add error handling (catch docker errors, log output)
- [ ] Create deployment routes
  - [ ] Create `api/src/routes/deployment.routes.ts`
  - [ ] Implement `POST /api/projects/:id/deploy` (trigger deployment, requires auth)
  - [ ] Implement `GET /api/projects/:id/deployments` (list deployments, requires auth)
  - [ ] Implement `GET /api/projects/:id/deployments/:id` (get deployment, requires auth)
  - [ ] Implement `POST /api/projects/:id/deployments/:id/rollback` (rollback, requires auth)
  - [ ] Add auth middleware
- [ ] Testing
  - [ ] Test deployment service operations
  - [ ] Test Docker utility functions
  - [ ] Test deployment routes
  - [ ] Test error handling

### Step 5.9: Frontend SSE Hook

**Prerequisites (from Dev 1):**
- ✅ SSE service completed (Phase 4, Step 4.8)
- ✅ Frontend API client created (Phase 2, Step 2.2 - template API client, updated in Phase 3)
- ✅ `web/src/hooks/` directory exists (Phase 1, Step 1.4)

- [ ] Create frontend SSE hook
  - [ ] Create `web/src/hooks/useSSE.ts`
  - [ ] Use frontend API client for base URL (from template - Phase 2)
  - [ ] Implement EventSource connection
  - [ ] Handle reconnection on disconnect
  - [ ] Parse SSE events (parse JSON from event data)
  - [ ] Return event stream as React state
  - [ ] Handle different event types: `workflow.started`, `workflow.step.started`, `workflow.step.completed`, `workflow.step.failed`, `workflow.completed`, `workflow.failed`, `ci.status`, `issue.updated`
- [ ] Testing
  - [ ] Test SSE connection establishment
  - [ ] Test event parsing
  - [ ] Test reconnection handling
  - [ ] Test state updates

### Step 5.10: Frontend - Run Timeline UI

**Prerequisites (from Dev 1):**
- ✅ SSE hook completed (Step 5.9 above)
- ✅ Ideas/runs API routes completed (Phase 4, Step 4.7)
- ✅ `web/src/components/` directory exists (Phase 1, Step 1.4)

- [ ] Create timeline component
  - [ ] Create `web/src/components/RunTimeline.tsx`
  - [ ] Display workflow steps (vertical timeline)
  - [ ] Show step status (pending, running, completed, failed) with icons
  - [ ] Add step details (expandable, show logs and data)
  - [ ] Add links to GitHub resources (PR links, issue links, CI run links)
  - [ ] Connect to SSE hook for live updates
  - [ ] Auto-scroll to latest step
- [ ] Create timeline step component
  - [ ] Create `web/src/components/TimelineStep.tsx`
  - [ ] Display step information (step name, description)
  - [ ] Show step status icon (pending/running/completed/failed)
  - [ ] Show step duration (calculate from timestamps)
  - [ ] Show step logs (expandable section with log output)
  - [ ] Show step artifacts (links to artifacts if available)
- [ ] Integrate timeline in project detail view
  - [ ] Add timeline to Project Detail Home tab
  - [ ] Connect to SSE for live updates (update timeline as workflow progresses)
  - [ ] Show timeline when run is active
- [ ] Testing
  - [ ] Test timeline rendering with different step states
  - [ ] Test SSE updates on timeline
  - [ ] Test step expansion and log display
  - [ ] Test GitHub resource links
  - [ ] Test auto-scroll functionality

### Step 5.11: Frontend - Issue Hierarchy Tree View

**Prerequisites (from Dev 1):**
- ✅ Ideas/runs API routes completed (Phase 4, Step 4.7)
- ✅ `web/src/components/` directory exists (Phase 1, Step 1.4)

- [ ] Create issue hierarchy tree component
  - [ ] Create `web/src/components/IssueHierarchyTree.tsx`
  - [ ] Display hierarchical tree of issues with badges
  - [ ] Show issue type (Epic, Feature, Task, Defect) with color coding
  - [ ] Show issue status (NEW, IN_PROGRESS, BLOCKED, REVIEW, QA, DONE) with badges
  - [ ] Show issue title and description
  - [ ] Make nodes clickable to open PR/issue panel
  - [ ] Show branch name and PR number if available
  - [ ] Show CI status badges on PR nodes
  - [ ] Indent children to show hierarchy
- [ ] Create issue node component
  - [ ] Create `web/src/components/IssueNode.tsx`
  - [ ] Display issue information (title, type, status)
  - [ ] Show expand/collapse for children
  - [ ] Show links to GitHub issue and PR
  - [ ] Show CI status if PR exists
- [ ] Integrate issue tree in project detail view
  - [ ] Add issue tree to Project Detail Home tab
  - [ ] Fetch issue hierarchy from API
  - [ ] Connect to SSE for live updates (update tree as issues change)
- [ ] Testing
  - [ ] Test tree rendering with different hierarchy structures
  - [ ] Test node expansion and collapse
  - [ ] Test issue/PR links
  - [ ] Test SSE updates on tree
  - [ ] Test status badge updates

### Step 5.12: Frontend - Chat Interface

**Prerequisites (from Dev 1):**
- ✅ Ideas/runs API routes completed (Phase 4, Step 4.7)
- ✅ SSE hook completed (Step 5.9 above)
- ✅ `web/src/components/` directory exists (Phase 1, Step 1.4)

- [ ] Create chat service (frontend API client)
  - [ ] Add chat API functions to `web/src/lib/api.ts` (or create `web/src/lib/chat.ts`)
  - [ ] Implement `sendMessage(projectId, message)` - POST /api/ideas
  - [ ] Implement `getChatHistory(projectId)` - GET /api/runs (filter by project)
  - [ ] Implement `interruptRun(runId, action, reason)` - POST /api/runs/:runId/interrupt
- [ ] Create chat component
  - [ ] Create `web/src/components/Chat.tsx`
  - [ ] Create chat input (textarea with send button)
  - [ ] Add size selector (Initiative/New Feature/Maintenance/Bug Fix) or parse from message
  - [ ] Create message history display (scrollable list of messages)
  - [ ] Implement slash command parsing (highlight commands, show suggestions)
  - [ ] Add message sending (call API with description and size, add message to history)
  - [ ] Support size shortcuts: `/initiative`, `/feature`, `/maintenance`, `/bug`
  - [ ] Connect to SSE for live updates (show workflow updates in chat)
  - [ ] Auto-scroll to latest message
- [ ] Create chat message component
  - [ ] Create `web/src/components/ChatMessage.tsx`
  - [ ] Display user messages (right-aligned, user styling)
  - [ ] Display system messages (center-aligned, info styling)
  - [ ] Display agent responses (left-aligned, agent styling)
  - [ ] Display workflow status updates (timeline chips: "Spec", "Plan", "Branch", "Dev", "QA", "Merge", "Release")
- [ ] Integrate chat in dashboard
  - [ ] Add chat panel to Dashboard (replace disabled chatbot)
  - [ ] Connect to SSE for live updates
  - [ ] Show run timeline chips in chat
- [ ] Testing
  - [ ] Test chat message sending
  - [ ] Test slash command parsing
  - [ ] Test size selector
  - [ ] Test SSE updates in chat
  - [ ] Test message history display
  - [ ] Test auto-scroll

### Step 5.13: Frontend - Code Module UI

**Prerequisites (from Dev 1):**
- ✅ Code routes completed (Step 5.7 above)
- ✅ `web/src/pages/` directory exists (Phase 1, Step 1.4)

- [ ] Create code module API client
  - [ ] Add code API functions to `web/src/lib/api.ts` (or create `web/src/lib/code.ts`)
  - [ ] Implement `getBranches(projectId)`, `getPullRequests(projectId)`, `getPullRequest(projectId, prNumber)`, `getIssueHierarchy(projectId, issueId)`
- [ ] Create code page
  - [ ] Create `web/src/pages/Code.tsx` (or update Project Detail Code tab)
  - [ ] Display branches and PRs (tabs for branches/PRs)
  - [ ] Add "Create Branch" button
  - [ ] Add "Create PR" button
- [ ] Create branch list component
  - [ ] Create `web/src/components/BranchList.tsx`
  - [ ] Display branches with status (active, merged, deleted)
  - [ ] Show branch hierarchy (epic/feature/task structure)
  - [ ] Add "Create Branch" button
  - [ ] Add links to GitHub branches
- [ ] Create PR list component
  - [ ] Create `web/src/components/PRList.tsx`
  - [ ] Display PRs with status (open, merged, closed)
  - [ ] Show CI status badges (passing, failing, pending)
  - [ ] Show PR title, description, and links
  - [ ] Add "Create PR" button
  - [ ] Connect to SSE for CI status updates
- [ ] Create PR detail component
  - [ ] Create `web/src/components/PRDetail.tsx`
  - [ ] Display PR information (title, description, status, CI status)
  - [ ] Show CI status with link to CI run
  - [ ] Show issue hierarchy for PR
  - [ ] Add merge button (with confirmation modal)
  - [ ] Connect to SSE for real-time CI updates
- [ ] Integrate code module in project detail view
  - [ ] Enable "Code and Deployment" tab in Project Detail
  - [ ] Add Code tab content with branch/PR lists
  - [ ] Connect to SSE for live updates
- [ ] Testing
  - [ ] Test branch list display
  - [ ] Test PR list display
  - [ ] Test PR detail view
  - [ ] Test CI status updates via SSE
  - [ ] Test merge functionality
  - [ ] Test navigation and routing

### Step 5.14: User Settings & Deployment Configuration

**Prerequisites (from Dev 1):**
- ✅ Deployment service completed (Step 5.8 above)
- ✅ `api/src/models/` directory exists (Phase 1, Step 1.3)

- [ ] Create user settings model
  - [ ] Create `api/src/models/UserSettings.ts`
  - [ ] Define schema: `_id`, `user_id` (ref: User), `project_id` (ref: Project, optional), `deployment_strategy` (enum: 'auto', 'manual', 'scheduled'), `deployment_env` (enum: 'dev', 'staging', 'production'), `auto_merge_regression` (boolean), `require_approval` (boolean), `created_at`, `updated_at`
  - [ ] Add timestamps plugin
  - [ ] Create indexes on `user_id` and `project_id`
  - [ ] Export model
- [ ] Create deployment configuration service
  - [ ] Create `api/src/services/deployment-config.service.ts`
  - [ ] Import UserSettings model (from above)
  - [ ] Implement `getDeploymentSettings(projectId, userId)` - get deployment settings for project/user
  - [ ] Implement `updateDeploymentSettings(projectId, userId, settings)` - update deployment settings
  - [ ] Implement `shouldAutoDeploy(projectId, userId)` - check if auto-deploy is enabled
  - [ ] Implement `getDeploymentEnvironment(projectId, userId)` - get target deployment environment
- [ ] Integrate deployment settings in workflow
  - [ ] Check deployment settings when root issue completed
  - [ ] Deploy based on user settings (auto/manual/scheduled)
  - [ ] Use specified deployment environment
- [ ] Testing
  - [ ] Test user settings model CRUD operations
  - [ ] Test deployment configuration service
  - [ ] Test deployment settings integration in workflow

### Step 5.15: End-to-End Testing

**Prerequisites (from Dev 1):**
- ✅ All Phase 5 steps completed above
- ✅ All Phase 4 steps completed

- [ ] Test full autonomous workflow
  - [ ] Create test project
  - [ ] Connect GitHub repository
  - [ ] Send idea/command via chat
  - [ ] Verify workflow executes all steps
  - [ ] Verify timeline updates in real-time via SSE
  - [ ] Verify issue hierarchy is created correctly
  - [ ] Verify branches and PRs are created
  - [ ] Verify CI status updates
  - [ ] Verify deployment succeeds
  - [ ] Verify release notes are generated
- [ ] Test error scenarios
  - [ ] Test with invalid GitHub token (should show error)
  - [ ] Test with Cursor API failure (should use fallback or show error)
  - [ ] Test with CI failure (should handle gracefully)
  - [ ] Test with deployment failure (should show error and allow retry)
- [ ] Test webhook delivery
  - [ ] Trigger GitHub Actions workflow
  - [ ] Verify webhook is received
  - [ ] Verify CI status updates in UI
  - [ ] Verify SSE events are sent
- [ ] Test frontend interactions
  - [ ] Test chat interface
  - [ ] Test timeline UI
  - [ ] Test issue hierarchy tree
  - [ ] Test code module UI
  - [ ] Test SSE reconnection
  - [ ] Test theme support on all new pages
  - [ ] Test responsive design

---

## Phase 6: Supporting Modules

**Goal:** Build supporting features (ticketing, analytics, marketing).

### Step 6.1: Ticketing Module
- [ ] Create ticket service
  - [ ] Create `api/src/services/ticket.service.ts`
  - [ ] Implement `createTicket(projectId, ticketData)` - create ticket
  - [ ] Implement `getTickets(projectId, filters)` - list tickets with optional filters (status, labels)
  - [ ] Implement `getTicket(ticketId)` - get ticket details
  - [ ] Implement `updateTicket(ticketId, updates)` - update ticket
  - [ ] Implement `deleteTicket(ticketId)` - delete ticket
  - [ ] Implement GitHub Issues sync
    - [ ] Sync from GitHub Issues (fetch issues, create/update local tickets)
    - [ ] Create local tickets from GitHub Issues
    - [ ] Update local tickets when GitHub Issues change (on webhook)
- [ ] Create ticket routes
  - [ ] Create `api/src/routes/ticket.routes.ts`
  - [ ] Implement `GET /api/projects/:id/tickets` (list tickets, requires auth)
  - [ ] Implement `POST /api/projects/:id/tickets` (create ticket, requires auth)
  - [ ] Implement `GET /api/projects/:id/tickets/:ticketId` (get ticket, requires auth)
  - [ ] Implement `PATCH /api/projects/:id/tickets/:ticketId` (update ticket, requires auth)
  - [ ] Implement `DELETE /api/projects/:id/tickets/:ticketId` (delete ticket, requires auth)
  - [ ] Implement `POST /api/projects/:id/tickets/sync` (sync from GitHub, requires auth)
  - [ ] Add auth middleware
  - [ ] Add validation
- [ ] Create frontend ticket API client
  - [ ] Add ticket API functions to `web/src/lib/api.ts`
  - [ ] Implement `getTickets(projectId)`, `createTicket(projectId, data)`, `updateTicket(ticketId, data)`, `deleteTicket(ticketId)`
- [ ] Create ticket list page
  - [ ] Create `web/src/pages/Tickets.tsx`
  - [ ] Display tickets in table format (columns: title, status, labels, assignee, created)
  - [ ] Add filters (status dropdown, label filter)
  - [ ] Add sorting (by status, created date)
- [ ] Create ticket card component
  - [ ] Create `web/src/components/TicketCard.tsx`
  - [ ] Display ticket information (title, description, status, labels)
  - [ ] Add status badge (color-coded by status)
  - [ ] Add labels display (chips with colors)
- [ ] Create ticket creation form
  - [ ] Create `web/src/components/CreateTicketForm.tsx`
  - [ ] Add form fields: title (required), description, labels (multi-select)
  - [ ] Handle form submission (call API, show success/error)

### Step 6.2: Analytics Module
- [ ] Create analytics service
  - [ ] Create `api/src/services/analytics.service.ts`
  - [ ] Implement `recordEvent(projectId, userId, type, payload)` - record analytics event
  - [ ] Implement `getAnalyticsSummary(projectId, timeframe)` - get analytics summary
  - [ ] Implement KPI calculations
    - [ ] DAU (simulated - count unique users per day)
    - [ ] Avg load time (seeded - random values between 100-500ms)
    - [ ] Session length (mock - random values between 5-30 minutes)
    - [ ] Active users now (simulated - random count)
- [ ] Create analytics routes
  - [ ] Create `api/src/routes/analytics.routes.ts`
  - [ ] Implement `POST /api/analytics/events` (ingest event, requires auth)
  - [ ] Implement `GET /api/analytics/summary` (get KPIs, requires auth)
  - [ ] Add auth middleware
- [ ] Create frontend analytics API client
  - [ ] Add analytics API functions to `web/src/lib/api.ts`
  - [ ] Implement `recordEvent(type, payload)`, `getAnalyticsSummary(projectId)`
- [ ] Create analytics widgets
  - [ ] Create `web/src/components/AnalyticsWidget.tsx`
  - [ ] Display KPIs (DAU, load time, session length, active users)
  - [ ] Add charts (if time permits - use recharts or similar)
- [ ] Integrate analytics in dashboard
  - [ ] Add analytics widgets to dashboard
  - [ ] Display key metrics
  - [ ] Add event tracking (track page views, button clicks)

### Step 6.3: Marketing Module
- [ ] Create marketing service
  - [ ] Create `api/src/services/marketing.service.ts`
  - [ ] Implement `generateReleaseNotes(projectId, releaseData)` - generate release notes from PRs/tickets
  - [ ] Implement `generateSocialCopy(releaseData, platform)` - generate social copy for Twitter/LinkedIn
  - [ ] Integrate with Marketing Agent (call agent with release data)
  - [ ] Parse agent responses (extract release notes and social copy)
- [ ] Create marketing routes
  - [ ] Create `api/src/routes/marketing.routes.ts`
  - [ ] Implement `POST /api/marketing/release-notes` (generate release notes, requires auth)
  - [ ] Implement `POST /api/marketing/social-copy` (generate social copy, requires auth)
  - [ ] Add auth middleware
- [ ] Create frontend marketing API client
  - [ ] Add marketing API functions to `web/src/lib/api.ts`
  - [ ] Implement `generateReleaseNotes(projectId)`, `generateSocialCopy(projectId, platform)`
- [ ] Create marketing page
  - [ ] Create `web/src/pages/Marketing.tsx`
  - [ ] Display generated content (release notes, social copy)
  - [ ] Add "Generate" buttons (generate release notes, generate social copy)
- [ ] Create release notes component
  - [ ] Create `web/src/components/ReleaseNotes.tsx`
  - [ ] Display release notes (formatted markdown)
  - [ ] Add copy-to-clipboard button
- [ ] Create social copy component
  - [ ] Create `web/src/components/SocialCopy.tsx`
  - [ ] Display social media copy
  - [ ] Add platform tabs (Twitter, LinkedIn)
  - [ ] Add copy-to-clipboard button

---

## Phase 7: UI Polish & Integration

**Goal:** Polish UI, integrate all modules, and prepare for demo.

### Step 7.1: UI Components & Layout
- [ ] Complete layout components
  - [ ] Style Sidebar with active state highlighting
  - [ ] Style Topbar with project switcher dropdown
  - [ ] Make layout responsive (mobile, tablet, desktop)
- [ ] Complete dashboard page
  - [ ] Add real KPI widgets (connect to analytics service)
  - [ ] Add real activity stream (connect to workflow service)
  - [ ] Integrate chat panel (connect to chat service)
  - [ ] Add deployment card (show latest deployment status)
- [ ] Create KPI widget component
  - [ ] Create `web/src/components/KPIWidget.tsx`
  - [ ] Display metric value (large number)
  - [ ] Display metric label (small text)
  - [ ] Add trend indicator (if data available - up/down arrow)
- [ ] Create activity stream component
  - [ ] Create `web/src/components/ActivityStream.tsx`
  - [ ] Display recent activities (list of activity items)
  - [ ] Add activity types (ticket created, PR opened, deploy completed)
  - [ ] Add timestamps and user avatars

### Step 7.2: Styling & Animations
- [ ] Configure Tailwind theme
  - [ ] Customize colors (primary, secondary, success, error)
  - [ ] Customize typography (font families, sizes)
  - [ ] Customize spacing (consistent spacing scale)
- [ ] Add Framer Motion animations
  - [ ] Create `web/src/components/PageTransition.tsx` - page transition wrapper
  - [ ] Add fade/slide animations for page transitions
  - [ ] Add hover effects to buttons and cards
  - [ ] Add loading animations (spinner, skeleton loaders)
  - [ ] Add toast animations (slide in/out)
- [ ] Make components responsive
  - [ ] Add mobile breakpoints (sm, md, lg)
  - [ ] Adjust component layouts for mobile (stack vertically)
  - [ ] Add mobile navigation (hamburger menu for sidebar)

### Step 7.3: Code Module Frontend
- [ ] Create code page
  - [ ] Create `web/src/pages/Code.tsx`
  - [ ] Display branches and PRs (tabs for branches/PRs)
  - [ ] Add "Create Branch" button
  - [ ] Add "Create PR" button
- [ ] Create branch list component
  - [ ] Create `web/src/components/BranchList.tsx`
  - [ ] Display branches with status (active, merged, deleted)
  - [ ] Add "Create Branch" button
- [ ] Create PR list component
  - [ ] Create `web/src/components/PRList.tsx`
  - [ ] Display PRs with status (open, merged, closed)
  - [ ] Show CI status badges (passing, failing, pending)
  - [ ] Add "Create PR" button
- [ ] Create PR detail component
  - [ ] Create `web/src/components/PRDetail.tsx`
  - [ ] Display PR information (title, description, status, CI status)
  - [ ] Show CI status with link to CI run
  - [ ] Add merge button (with confirmation modal)

### Step 7.4: Deployment Frontend
- [ ] Create deployment API client
  - [ ] Add deployment API functions to `web/src/lib/api.ts`
  - [ ] Implement `deploy(projectId)`, `getDeployments(projectId)`, `getDeployment(id)`
- [ ] Create deployment card component
  - [ ] Create `web/src/components/DeploymentCard.tsx`
  - [ ] Display deployment status (pending, building, deploying, success, failed)
  - [ ] Show deployment URL (link to deployed app)
  - [ ] Add health check indicator (green/red dot)
- [ ] Create deployment list
  - [ ] Create `web/src/components/DeploymentList.tsx`
  - [ ] Display deployment history (list of deployments)
  - [ ] Add "Deploy" button (trigger new deployment)

---

## Phase 8: Demo Preparation

**Goal:** Test end-to-end flow, seed demo data, and prepare presentation.

### Step 8.1: End-to-End Testing
- [ ] Test full autonomous run
  - [ ] Create test project
  - [ ] Connect GitHub repository
  - [ ] Send `/auto` command with test prompt
  - [ ] Verify workflow executes all steps
  - [ ] Verify timeline updates in real-time
  - [ ] Verify deployment succeeds
  - [ ] Verify release notes are generated
- [ ] Test error scenarios
  - [ ] Test with invalid GitHub token (should show error)
  - [ ] Test with Cursor API failure (should use fallback or show error)
  - [ ] Test with CI failure (should handle gracefully)
  - [ ] Test with deployment failure (should show error and allow retry)
- [ ] Test webhook delivery
  - [ ] Trigger GitHub Actions workflow
  - [ ] Verify webhook is received
  - [ ] Verify CI status updates in UI
  - [ ] Verify SSE events are sent

### Step 8.2: Demo Data Seeding
- [ ] Create seed script
  - [ ] Create `api/src/scripts/seed.ts`
  - [ ] Create sample user (or use existing user)
  - [ ] Create sample project with GitHub integration
  - [ ] Create sample tickets (various statuses)
  - [ ] Create sample agent runs (completed workflows)
  - [ ] Create sample deployments (successful and failed)
  - [ ] Create sample analytics events
- [ ] Run seed script
  - [ ] Add npm script: `npm run seed`
  - [ ] Run seed script to populate database
  - [ ] Verify data is created correctly

### Step 8.3: Presentation Preparation
- [ ] Create demo script
  - [ ] Write detailed demo script (5-7 minutes)
  - [ ] Document each step with timing
  - [ ] Prepare talking points for each step
- [ ] Practice demo
  - [ ] Practice demo 3+ times
  - [ ] Time each practice run
  - [ ] Identify and fix bottlenecks
  - [ ] Ensure demo runs smoothly
- [ ] Create backup demo
  - [ ] Record demo video (screen recording)
  - [ ] Prepare screenshots of key features
  - [ ] Create static demo (if needed)
- [ ] Create pitch deck
  - [ ] Create 9-slide presentation
  - [ ] Slide 1: Title (project name, team, hackathon)
  - [ ] Slide 2: Problem (tool fragmentation, manual coordination)
  - [ ] Slide 3: Solution (unified platform, AI agents)
  - [ ] Slide 4: Key Features (autonomous workflows, real-time updates)
  - [ ] Slide 5: Tech Stack (React, Express, MongoDB, GitHub Actions, Cursor AI)
  - [ ] Slide 6: Demo (live demo or video)
  - [ ] Slide 7: Impact (accelerates development lifecycle)
  - [ ] Slide 8: Future Vision (multi-tool integrations, enterprise features)
  - [ ] Slide 9: Q&A
- [ ] Prepare Q&A answers
  - [ ] Prepare answers for: How agents work, Security, Scalability, Real-world applicability, Technical architecture, Future plans

### Step 8.4: Documentation
- [ ] Update README
  - [ ] Add project overview
  - [ ] Add setup instructions
  - [ ] Add environment variables guide
  - [ ] Add running instructions (docker-compose, local)
  - [ ] Add development guide
  - [ ] Add API documentation (list endpoints)
  - [ ] Add demo instructions
- [ ] Add code documentation
  - [ ] Add JSDoc comments to key functions
  - [ ] Document API endpoints (request/response formats)
  - [ ] Document data models (schema descriptions)
  - [ ] Document workflow execution flow
  - [ ] Document agent integration

---

## Critical Path Checklist

**Must Complete for Demo:**
1. ✅ Project structure and Docker setup
2. ✅ Database models and connection
3. ✅ Authentication (GitHub OAuth)
4. ✅ Project creation and management
5. ✅ GitHub integration (repos, branches, PRs)
6. ✅ Workflow orchestrator (core logic)
7. ✅ Agent integration (Cursor AI)
8. ✅ SSE streaming (real-time updates)
9. ✅ Code module (branches, PRs, file operations)
10. ✅ CI webhook handling
11. ✅ Deployment module (Docker operations)
12. ✅ Chat interface (user input, command parsing)
13. ✅ Run timeline UI (workflow visualization)
14. ✅ End-to-end autonomous run (full workflow)
15. ✅ Demo data seeding
16. ✅ Demo script and practice
17. ✅ Presentation preparation

**Should Complete (Important):**
- Ticketing module (basic CRUD)
- Analytics module (basic KPIs)
- Marketing module (release notes generation)
- UI polish (responsive design, animations)

**Nice to Have (If Time Permits):**
- Advanced UI features
- Comprehensive error handling
- Performance optimization
- Extensive testing

---

## Suggestions & Recommendations

### Hierarchical Issue Management

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

### Branch Strategy

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

### QA Review & Defect Management

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

### Deployment Configuration

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

### Workflow Optimization

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

### Implementation Considerations

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

---

**Last Updated:** Nov 8, 2025
