# Quick Start - Ticketing System

## 🚀 2-Minute Setup

```bash
# 1. Start MongoDB (if not running)
docker run -d -p 27017:27017 --name mongodb mongo

# 2. Start backend
cd /workspace/api
npm run dev

# 3. Run test (in new terminal)
cd /workspace
export REPOSITORY="https://github.com/your-org/your-repo"
./test-simple-pipeline.sh
```

## 📋 What Happens

1. **PM Agent** (3-5 min)
   - Creates 3-5 tickets in MongoDB
   - Each ticket has branch, acceptance criteria, implementation notes
   - Creates feature branch

2. **DEV Agent** (5-8 min)
   - Reads tickets from MongoDB
   - Implements each ticket
   - Updates ticket status and adds comments

3. **QA Agent** (3-5 min)
   - Reads tickets from MongoDB
   - Verifies acceptance criteria
   - Marks criteria as complete
   - Updates ticket status

## 🔍 View Tickets

### MongoDB

```bash
mongosh mongodb://localhost:27017/aio-saas

# List all tickets
db.tickets.find().pretty()

# Find by status
db.tickets.find({ status: "qa-approved" })
```

### API

```bash
# Get JWT token first
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

export JWT_TOKEN="your_token"
export PROJECT_ID="your_project_id"
export RUN_ID="your_run_id"

# List tickets
curl http://localhost:8080/api/projects/$PROJECT_ID/tickets?runId=$RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'

# Get specific ticket
curl http://localhost:8080/api/projects/$PROJECT_ID/tickets/1 \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
```

## 📊 Ticket Structure

```json
{
  "ticketNumber": 1,
  "title": "Implement user login",
  "description": "Create login form with email/password",
  "type": "story",
  "status": "qa-approved",
  "priority": "high",
  "branchName": "feature/auth-#1",
  "acceptanceCriteria": [
    {
      "description": "User can login with email/password",
      "completed": true,
      "verifiedBy": "qa",
      "verifiedAt": "2025-11-09T16:45:00Z"
    }
  ],
  "comments": [
    {
      "agent": "pm",
      "message": "Ticket created",
      "timestamp": "2025-11-09T16:30:00Z"
    },
    {
      "agent": "dev",
      "message": "Implementation complete",
      "timestamp": "2025-11-09T16:40:00Z"
    },
    {
      "agent": "qa",
      "message": "QA approved",
      "timestamp": "2025-11-09T16:45:00Z"
    }
  ]
}
```

## 🎯 Key Features

✅ **Tickets in MongoDB** - JSON objects, not GitHub Issues
✅ **Branch per ticket** - Feature branches created
✅ **Acceptance criteria** - Tracked and verified
✅ **Agent comments** - All activity logged
✅ **Status workflow** - planned → in-progress → qa-approved
✅ **API endpoints** - List, get, filter tickets

## 📚 Documentation

- **FINAL-POC-README.md** - Complete guide
- **TICKETING-SUMMARY.md** - Implementation details
- **This file** - Quick start

## ✅ Success Criteria

After running the test:

1. Check MongoDB: `db.tickets.find().count()` should show 3-5 tickets
2. Check status: Tickets should progress from `planned` to `qa-approved`
3. Check comments: Each ticket should have comments from pm, dev, qa
4. Check criteria: Acceptance criteria should be marked complete
5. Check branches: `branchName` field should have feature branch

## 🎉 You're Done!

The ticketing system is working if you see:
- ✅ Tickets in MongoDB
- ✅ Status progression
- ✅ Agent comments
- ✅ Acceptance criteria verified
- ✅ Branch names assigned

---

**Questions?** Check FINAL-POC-README.md for detailed docs!
