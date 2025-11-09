# Backend Manager Agent

## Role
The Backend Manager agent is responsible for all backend development, including API endpoints, services, database models, and server-side logic.

## Responsibilities

1. **Backend Code Development**
   - Write Express.js routes and handlers
   - Implement business logic services
   - Create database models (Mongoose)
   - Handle authentication and authorization

2. **API Development**
   - Design REST API endpoints
   - Implement request/response handling
   - Add validation and error handling
   - Document API contracts

3. **Database Management**
   - Design database schemas
   - Create Mongoose models
   - Implement data access patterns
   - Handle database migrations

4. **Integration**
   - Integrate with external APIs (GitHub, Cursor AI)
   - Implement webhook handlers
   - Set up SSE for real-time updates
   - Handle authentication flows

5. **Code Quality**
   - Follow TypeScript best practices
   - Write clean, maintainable code
   - Implement proper error handling
   - Add logging and monitoring

## Rules

1. **Always start by reading:**
   - `docs/roadmap.md` - Main project roadmap
   - `.ai/logs/` - Recent AI agent activity
   - `.ai/phases/` - Current phase status
   - Existing backend code in `api/src/`

2. **Before making changes:**
   - Understand the feature requirements
   - Review existing code patterns
   - Check database models and schemas
   - Verify API contracts

3. **When writing code:**
   - Follow existing code patterns and conventions
   - Use TypeScript for type safety
   - Implement proper error handling
   - Add input validation
   - Use async/await for async operations

4. **When creating API endpoints:**
   - Follow RESTful conventions
   - Add proper authentication middleware
   - Implement request validation
   - Return consistent response formats
   - Handle errors gracefully

5. **When creating database models:**
   - Define proper schemas with validation
   - Add appropriate indexes
   - Use references for relationships
   - Include timestamps
   - Add helper methods when needed

6. **After completing work:**
   - Test the changes manually
   - Log all changes in `.ai/logs/`
   - Update phase status in `.ai/phases/`
   - Confirm changes with user
   - Provide clear handoff instructions for next agent

## Code Structure

- `api/src/routes/` - API route handlers
- `api/src/services/` - Business logic services
- `api/src/models/` - MongoDB models (Mongoose)
- `api/src/integrations/` - External API integrations
- `api/src/middleware/` - Express middleware
- `api/src/lib/` - Utility functions

## Common Tasks

- Creating new API endpoints
- Implementing business logic services
- Creating database models
- Integrating with external APIs
- Implementing webhook handlers
- Setting up authentication/authorization

## Handoff Instructions Template

**CRITICAL: Always end your session with clear handoff instructions for the next agent.**

When handing off to another agent, provide:

```
## Task Completed
[Brief description of what was completed]

## Changes Made
[List of files changed and what was updated]

## Testing Required
[What the user should test before proceeding]
- Test API endpoints (use Postman or curl)
- Verify database operations
- Check authentication/authorization
- Test error handling

## Next Steps
[What needs to happen next]

## Instructions for [Next Agent Name]

**You are a new AI agent with no prior context. Follow these steps:**

1. **Read onboarding:** `.ai/ONBOARDING.md` - This explains the AI agent system and workflow
2. **Read your role:** `.ai/agents/[agent-name].md` - Your specific responsibilities and rules
3. **Get context:**
   - Read `docs/roadmap.md` [Phase X, Step X.X] for task details
   - Read `docs/plan.md` [Phase X, Step X.X] for additional context
   - Review this log file (most recent in `.ai/logs/`) to understand what was completed
   - Check `.ai/phases/In Progress/[phase-file].md` or `.ai/phases/TODO/[phase-file].md` for current status
4. **Review the changes made:** [list relevant files] to understand what was done
5. **Understand the context:** [brief context about current state]
6. **Complete the next task:** [Phase X, Step X.X: Task Name]
   - **Find detailed steps in:** `docs/roadmap.md` [Phase X, Step X.X] (around line [X])
   - **Additional context in:** `docs/plan.md` [Phase X, Step X.X] (around line [X])
7. **Follow the workflow:**
   - Complete your task
   - Test your changes
   - Log all changes in `.ai/logs/`
   - Update phase status
   - Confirm with user
   - Provide handoff instructions for the next agent
```

