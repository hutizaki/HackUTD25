# AIO SaaS Management Platform

An autonomous SaaS management platform that orchestrates AI agents to handle the complete software development lifecycle from planning to deployment.

## Overview

The AIO SaaS Management Platform is a unified system that integrates multiple development tools and AI agents to automate the software development workflow. It provides:

- **Autonomous Workflow Execution**: AI agents handle planning, development, testing, and deployment
- **Hierarchical Issue Management**: Supports initiatives, roadmaps, epics, stories, and tickets
- **Real-time Updates**: Server-Sent Events (SSE) for live workflow progress
- **GitHub Integration**: Seamless integration with GitHub for repositories, branches, PRs, and issues
- **CI/CD Integration**: Automated testing and deployment workflows
- **Multi-Agent Orchestration**: Coordinates Product Manager, Frontend, Backend, QA, DevOps, and Marketing agents

## Project Structure

```
.
├── api/                    # Backend API server (Express.js + TypeScript)
├── web/                    # Frontend application (React + TypeScript)
├── .github/workflows/      # GitHub Actions CI/CD workflows
├── docs/                   # Project documentation
└── .ai/                    # AI agent system configuration (gitignored)
```

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: GitHub OAuth + JWT
- **Real-time**: Server-Sent Events (SSE)

### Frontend
- **Framework**: React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: React Router
- **Animations**: Framer Motion

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **AI Integration**: Cursor Cloud Agents API

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Docker and Docker Compose
- MongoDB (or use Docker Compose)
- GitHub account (for OAuth)
- Cursor AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HackUTD25
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env` (when available)
   - Fill in required environment variables:
     - `MONGO_URL`: MongoDB connection string
     - `JWT_SECRET`: Secret for JWT token signing
     - `CURSOR_API_KEY`: Cursor AI API key
     - `GITHUB_CLIENT_ID`: GitHub OAuth app client ID
     - `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret
     - `GITHUB_WEBHOOK_SECRET`: Secret for GitHub webhook verification
     - `PLATFORM_WEBHOOK_TOKEN`: Token for platform webhook authentication

3. **Start services with Docker Compose**
   ```bash
   docker compose up -d
   ```
   This will start:
   - MongoDB (port 27017)
   - API server (port 8080)
   - Web frontend (port 5174)

4. **Or run locally (development)**
   
   **Backend:**
   ```bash
   cd api
   npm install
   npm run dev
   ```
   
   **Frontend:**
   ```bash
   cd web
   npm install
   npm run dev
   ```

### Development Setup

1. **Backend Development**
   - Navigate to `api/` directory
   - Install dependencies: `npm install`
   - Run in development mode: `npm run dev`
   - The API server will run on `http://localhost:8080`

2. **Frontend Development**
   - Navigate to `web/` directory
   - Install dependencies: `npm install`
   - Run in development mode: `npm run dev`
   - The frontend will run on `http://localhost:5173` (local) or `http://localhost:5174` (Docker)

3. **Database Setup**
   - MongoDB will be automatically started with Docker Compose
   - Or connect to your own MongoDB instance using `MONGO_URL`

## Features

### Core Features
- **Project Management**: Create and manage multiple projects
- **GitHub Integration**: Connect GitHub repositories and manage branches, PRs, and issues
- **Autonomous Workflows**: AI agents execute complete development workflows
- **Real-time Updates**: Live progress updates via SSE
- **Chat Interface**: Interactive chat for triggering workflows
- **Run Timeline**: Visual timeline of workflow execution

### AI Agents
- **Product Manager**: Plans and creates hierarchical issue structures
- **Frontend Manager**: Develops frontend code
- **Backend Manager**: Develops backend code and APIs
- **QA Agent**: Reviews code and identifies defects
- **DevOps Agent**: Handles deployment and infrastructure
- **Marketing Agent**: Generates release notes and marketing content

## API Documentation

The API server provides REST endpoints for:
- Authentication (`/api/auth/*`)
- Projects (`/api/projects/*`)
- GitHub Integration (`/api/integrations/github/*`)
- Workflows (`/api/workflows/*`)
- Code Management (`/api/projects/:id/code/*`)
- Tickets (`/api/projects/:id/tickets/*`)
- Analytics (`/api/analytics/*`)
- Marketing (`/api/marketing/*`)

## Contributing

This project follows an AI agent-based development workflow. See `.ai/ONBOARDING.md` for information about the agent system.

## License

[Add license information]

## Support

For issues and questions, please refer to the documentation in `docs/` or check the project roadmap in `docs/roadmap.md`.

