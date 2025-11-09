# Pipeline UX - User Guide

## 🎯 What You'll See

### Landing Page
```
┌─────────────────────────────────────────┐
│     Watch AI Build Your App ✨          │
│                                         │
│  Experience the future of software      │
│  development. Watch autonomous AI       │
│  agents collaborate in real-time.       │
│                                         │
│  👀 Watch the Magic                     │
│  🤖 Autonomous Pipeline                 │
│  ✨ Simple & Beautiful                  │
│                                         │
│     [Get Started]  [Sign In]            │
└─────────────────────────────────────────┘
```

---

## 📊 Project Pipeline View

### Stats Dashboard
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 🤖 Total    │ ▶️ Running  │ ✅ Completed│ ❌ Failed   │
│    15       │    3        │    10       │    2        │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Agent Run Cards
```
┌────────────────────────────────────────────────────┐
│  🤖  Product Manager              ▶️ Running       │
│      Product Manager and Spec Writer               │
│                                                     │
│  Progress  ████████░░░░░░  8/12                   │
│  🔄 Creating acceptance criteria...                │
│                                                     │
│  🌿 feature/auth-system-#100                       │
│  🔗 View in Cursor                                 │
│  5m ago                                            │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  👨‍💻  Backend Developer          ✅ Completed      │
│      Backend Developer and API Implementer         │
│                                                     │
│  Progress  ████████████████  12/12                │
│                                                     │
│  🌿 feature/auth-system-#100/oauth-#101           │
│  🔗 PR #42                                         │
│  2h ago                                            │
└────────────────────────────────────────────────────┘
```

---

## 🔍 Agent Run Detail Modal

```
┌──────────────────────────────────────────────────────┐
│  🤖  Backend Developer                               │
│      Backend Developer and API Implementer           │
│      ▶️ Running                                      │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  Execution Steps                                     │
│                                                      │
│  ✓ 1  Agent launched                    12:30 PM   │
│  │                                                   │
│  ✓ 2  Reading ticket details            12:31 PM   │
│  │                                                   │
│  ▶ 3  Implementing OAuth flow           In progress│
│  │    🔄 Writing authentication service...          │
│  │                                                   │
│  ⏳ 4  Running tests                    Pending     │
│  │                                                   │
│  ⏳ 5  Creating pull request            Pending     │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  Input                          Output               │
│  ┌──────────────────┐          ┌──────────────────┐│
│  │ {                │          │ (pending...)     ││
│  │   "prompt": "...",│          │                  ││
│  │   "repository":.. │          │                  ││
│  │ }                │          │                  ││
│  └──────────────────┘          └──────────────────┘│
│                                                      │
│                              [Close]                 │
└──────────────────────────────────────────────────────┘
```

---

## 📱 Activity Feed View

```
┌────────────────────────────────────────────────────┐
│  Recent Activity                     [Refresh]     │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🤖 Product Manager              just now     │ │
│  │ Creating acceptance criteria...              │ │
│  │ ▶️ Running • feature/auth-#100               │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │ 👨‍💻 Backend Developer            5m ago      │ │
│  │ Task completed successfully                  │ │
│  │ ✅ Completed • feature/oauth-#101            │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🔍 QA Engineer                   15m ago     │ │
│  │ Running integration tests                    │ │
│  │ ▶️ Running • feature/oauth-#101              │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Design Elements

### Colors
- **Blue** - Running/Active (with pulse animation)
- **Green** - Completed/Success
- **Red** - Failed/Error
- **Yellow** - Cancelled
- **Gray** - Pending

### Animations
- **Pulse** - Active agents have pulsing icon
- **Progress Bars** - Smooth fill animations
- **Card Hover** - Subtle scale up (1.01x)
- **List Items** - Staggered fade-in
- **Modals** - Scale + fade transition

### Icons (Emoji-based)
- 🤖 Generic Agent
- 📋 Product Manager
- 👨‍💻 Developer
- 🔍 QA Engineer
- 🚀 DevOps
- ⏳ Pending
- ▶️ Running
- ✅ Completed
- ❌ Failed
- 🚫 Cancelled

---

## 🔄 Real-Time Updates

The interface automatically refreshes every **5 seconds** to show:
- New agent runs
- Status changes
- Progress updates
- Completed tasks

You can also manually refresh using the **Refresh** button.

---

## 📱 Responsive Design

### Desktop (1024px+)
- 4-column stats grid
- Full-width pipeline cards
- Side-by-side input/output in modal

### Tablet (768px - 1023px)
- 2-column stats grid
- Full-width pipeline cards
- Stacked input/output in modal

### Mobile (< 768px)
- 1-column stats grid
- Full-width pipeline cards
- Stacked input/output in modal
- Simplified navigation

---

## 🎯 Key User Flows

### 1. Watching an Agent Work
1. Open project
2. See agent card with "Running" status
3. Watch progress bar fill up
4. See current step updating
5. Get notified when complete

### 2. Viewing Details
1. Click on any agent card
2. Modal opens with full timeline
3. See each step's status
4. View input/output data
5. Click links to PR or Cursor

### 3. Checking Recent Activity
1. Switch to "Activity Feed" tab
2. See chronological list
3. Scroll through recent events
4. Click to see full details

---

## ✨ What Makes It Special

### Simple
- No GitHub jargon
- Clear status indicators
- Easy to understand at a glance

### Beautiful
- Smooth animations
- Modern design
- Dark mode support
- Emoji icons for personality

### Real-Time
- Auto-refresh
- Live progress updates
- Instant feedback

### Informative
- Detailed timelines
- Progress tracking
- Error messages
- Links to related resources

---

## 🚀 Getting Started

1. **Create a Project** - Start from the dashboard
2. **Trigger Agents** - Agents start automatically
3. **Watch the Magic** - See them work in real-time
4. **Review Results** - Check completed work

---

**That's it! Simple, beautiful, magical. ✨**

