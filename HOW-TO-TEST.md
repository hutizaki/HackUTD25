# How to Test the Pipeline POC

## 🚀 Fastest Way (One Command)

```bash
# 1. Start the backend in one terminal
cd /workspace/api
npm install
npm run dev

# 2. In another terminal, run the quick test
cd /workspace
export REPOSITORY="https://github.com/your-org/your-repo"
./quick-test.sh
```

That's it! The script will:
- ✅ Check if backend is running
- ✅ Create/login user account
- ✅ Create a test project
- ✅ Execute the pipeline
- ✅ Monitor progress in real-time
- ✅ Show final results

**Time: 10-15 minutes total**

---

## 📋 Prerequisites

Before running any tests, you need:

### 1. Cursor API Keys (REQUIRED)

Get three API keys from https://cursor.com/settings/api-keys

Add them to `api/.env`:
```bash
PM_CLOUD_AGENT_API_KEY=cur_xxx_your_pm_key
DEV_CLOUD_AGENT_API_KEY=cur_xxx_your_dev_key
QA_CLOUD_AGENT_API_KEY=cur_xxx_your_qa_key
```

### 2. MongoDB (REQUIRED)

Start MongoDB:
```bash
# Docker (easiest)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# OR use local MongoDB on localhost:27017
```

### 3. GitHub Repository (REQUIRED)

You need a GitHub repository where agents can create branches and PRs.

```bash
export REPOSITORY="https://github.com/your-org/your-repo"
```

---

## 🎯 Testing Options

### Option 1: Fully Automated Test (Recommended)

**Best for:** First-time testing, quick validation

```bash
cd /workspace
export REPOSITORY="https://github.com/your-org/your-repo"
./quick-test.sh
```

**What it does:**
- Creates account automatically
- Creates project automatically
- Executes pipeline
- Shows real-time progress
- Displays final results

**Time:** 10-15 minutes

---

### Option 2: Manual Step-by-Step Test

**Best for:** Understanding how it works, debugging

Follow the complete guide in `TESTING-GUIDE.md`:

```bash
# 1. Setup environment
cd /workspace/api
# Edit .env with your API keys
npm install
npm run dev

# 2. Create user and get JWT token
curl -X POST http://localhost:8080/api/auth/register ...

# 3. Create project
curl -X POST http://localhost:8080/api/projects ...

# 4. Execute pipeline
curl -X POST http://localhost:8080/api/projects/:id/pipeline/execute ...

# 5. Monitor progress
curl http://localhost:8080/api/projects/:id/pipeline/runs/:runId ...
```

**Time:** 15-20 minutes

See `TESTING-GUIDE.md` for detailed commands.

---

### Option 3: Using the Original Test Script

**Best for:** Testing with existing JWT token

```bash
cd /workspace
export JWT_TOKEN="your_existing_token"
export REPOSITORY="https://github.com/your-org/your-repo"
./test-pipeline.sh
```

**Time:** 10-15 minutes

---

## 📊 What You'll See

### During Execution

```
[10:00:00] Pipeline initialized
[10:00:05] 📝 PM Agent is creating product specification...
[10:02:30] ✓ PM Agent completed - Spec created
[10:02:35] 💻 DEV Agent is implementing the feature...
[10:07:15] ✓ DEV Agent completed - Code + tests created
[10:07:20] 🔍 QA Agent is reviewing the implementation...
[10:09:45] ✓ QA Agent completed - Review finished
[10:09:50] 🎉 Pipeline completed successfully!
```

### After Completion

Check your GitHub repository for:

1. **PR #1: Product Specification**
   - Branch: `docs/pm-spec-{timestamp}`
   - File: `docs/PRODUCT_SPEC.md`
   - Contains: Requirements, user stories, acceptance criteria

2. **PR #2: Implementation**
   - Branch: `feature/dev-impl-{timestamp}`
   - Files: Implementation code + unit tests
   - Contains: Working feature with tests

3. **Branch: QA Review**
   - Branch: `qa/review-{timestamp}`
   - File: `QA_REPORT.md`
   - Contains: Code review findings, recommendations

---

## 🔍 Monitoring in Real-Time

Each agent provides a Cursor URL where you can watch it work:

```bash
# Get the run status
curl http://localhost:8080/api/projects/PROJECT_ID/pipeline/runs/RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.data.timeline'

# Look for "cursorUrl" in the timeline
# Open it in your browser to watch the agent work!
```

Example URL: `https://cursor.com/agents?id=bc_abc123`

---

## ⚡ Quick Commands Reference

```bash
# Check if backend is running
curl http://localhost:8080/healthz

# Check if MongoDB is running
docker ps | grep mongodb

# Get JWT token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# List all projects
curl http://localhost:8080/api/projects \
  -H "Authorization: Bearer $JWT_TOKEN"

# List all pipeline runs
curl http://localhost:8080/api/projects/PROJECT_ID/pipeline/runs \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get specific run status
curl http://localhost:8080/api/projects/PROJECT_ID/pipeline/runs/RUN_ID \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## 🐛 Common Issues

### "Backend is not running"
```bash
cd /workspace/api
npm run dev
```

### "Cursor API key not configured"
```bash
# Edit api/.env and add your API keys
nano api/.env

# Restart the backend
```

### "MongoDB connection error"
```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### "Unauthorized"
```bash
# Get a fresh JWT token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

---

## 📚 Documentation

- **This file**: Quick testing guide
- **`TESTING-GUIDE.md`**: Comprehensive step-by-step guide
- **`QUICK-START-POC.md`**: 5-minute setup guide
- **`POC-PIPELINE-README.md`**: Full POC documentation
- **`POC-SUMMARY.md`**: Technical implementation details

---

## ✅ Success Criteria

The test is successful if:

- ✅ Pipeline state reaches `COMPLETED`
- ✅ Two PRs are created in GitHub
- ✅ PM Agent created `docs/PRODUCT_SPEC.md`
- ✅ DEV Agent created implementation + tests
- ✅ QA Agent created `QA_REPORT.md`
- ✅ Timeline shows all events
- ✅ No errors in backend logs

---

## 🎓 Next Steps

After successful testing:

1. **Review the code** in `api/src/services/pipeline.service.ts`
2. **Customize prompts** for different agent behaviors
3. **Try different features** with various prompts
4. **Add more agents** to extend the pipeline
5. **Build the frontend** to visualize the pipeline
6. **Implement GitHub Actions** for the full system

---

## 💡 Tips

- **First test**: Use the automated script (`./quick-test.sh`)
- **Debugging**: Use manual steps from `TESTING-GUIDE.md`
- **Multiple tests**: Each test creates a new project
- **Watch agents**: Open the Cursor URLs to see them work
- **Check logs**: Backend terminal shows detailed logs

---

**Ready to test?** Run `./quick-test.sh` now! 🚀
