# 06 - Web Dashboard

> **Use this prompt to create the `@claudeforge/forge-web` React dashboard.**

---

## Package Summary

Control Center web interface. Real-time task monitoring, queue management, analytics.

---

## Technologies

- **Framework**: React 19
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: TanStack Query (server state)
- **Routing**: TanStack Router
- **Icons**: Lucide React
- **Dev Port**: 5173 (proxy to 3344)

---

## Package Structure

```
packages/web/
├── src/
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Router setup
│   ├── routes/
│   │   ├── Dashboard.tsx     # Main page
│   │   ├── Tasks.tsx         # Task list
│   │   ├── TaskDetail.tsx    # Single task detail
│   │   ├── Queue.tsx         # Queue management
│   │   ├── Projects.tsx      # Project list
│   │   └── Analytics.tsx     # Statistics
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── task/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── CriteriaList.tsx
│   │   │   ├── IterationHistory.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── LiveOutput.tsx
│   │   ├── queue/
│   │   │   ├── QueueList.tsx
│   │   │   └── AddTaskModal.tsx
│   │   └── common/
│   │       ├── StatusBadge.tsx
│   │       ├── MetricCard.tsx
│   │       └── EmptyState.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts   # Real-time updates
│   │   ├── useTasks.ts       # Task queries
│   │   └── useStats.ts       # Stats queries
│   ├── lib/
│   │   ├── api.ts            # API client
│   │   └── utils.ts          # Helpers
│   └── styles/
│       └── globals.css
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

---

## Pages

### Dashboard (/)
- Overview metrics: Total tasks, completed, failed, cost
- Running task (if any) with live progress
- Recent activity list
- Quick actions

### Tasks (/tasks)
- Task list (filterable by status, project)
- Status badges
- Click → TaskDetail

### TaskDetail (/tasks/:id)
- Task info: name, prompt, status
- Criteria progress (checklist)
- Iteration history (timeline)
- Live output (if running)
- Metrics: tokens, cost, duration
- Actions: pause, resume, abort, checkpoint

### Queue (/queue)
- Running task card
- Queued tasks (drag to reorder)
- Add task button → modal
- Queue controls: pause/resume

### Projects (/projects)
- Project list with stats
- Add/delete projects
- Click → filtered tasks

### Analytics (/analytics)
- Cost over time chart
- Tasks per day
- Average iterations
- Success rate

---

## Components

### StatusBadge
Color badge based on status:
- running: green, pulsing dot
- paused: yellow
- completed: blue
- failed: red
- stuck: orange
- queued: purple

### MetricCard
Icon + title + value + optional trend

### CriteriaList
Checkbox list, shows passed/pending

### IterationHistory
Timeline view, for each iteration:
- Number
- Outcome icon
- Summary
- Duration

### ProgressBar
Iteration progress or completion %

### LiveOutput
Shows output from WebSocket (for running tasks)

---

## Hooks

### useWebSocket
- Connect to /api/ws
- Auto-reconnect
- Invalidate queries on updates
- Subscribe pattern for components

### useTasks
- getTasks(projectId?)
- getTask(id)
- getTaskIterations(id)
- createTask, updateTask, deleteTask mutations

### useStats
- getStats()
- getCostByDay(days)
- useQueue()

---

## API Client

```typescript
const api = {
  // Projects
  getProjects: () => GET /api/projects
  createProject: (data) => POST /api/projects
  deleteProject: (id) => DELETE /api/projects/:id

  // Tasks
  getTasks: (projectId?) => GET /api/tasks
  getTask: (id) => GET /api/tasks/:id
  createTask: (data) => POST /api/tasks
  updateTask: (id, data) => PATCH /api/tasks/:id
  deleteTask: (id) => DELETE /api/tasks/:id
  getTaskIterations: (id) => GET /api/tasks/:id/iterations

  // Queue
  getQueue: () => GET /api/queue
  reorderQueue: (taskIds) => POST /api/queue/reorder
  runNext: () => POST /api/queue/run-next
  pauseQueue: () => POST /api/queue/pause
  resumeQueue: () => POST /api/queue/resume

  // Stats
  getStats: () => GET /api/stats
  getCostByDay: (days) => GET /api/stats/cost-by-day
}
```

---

## Vite Config

```javascript
export default {
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3344",
        ws: true
      }
    }
  }
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "@claudeforge/forge-shared": "workspace:*",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-router": "^1.0.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.300.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## Color Palette

```javascript
// tailwind.config.js
colors: {
  forge: {
    50: "#fff7ed",
    500: "#f97316",  // Primary orange
    600: "#ea580c",
    700: "#c2410c",
  }
}
```

---

## Next Step

Move to `07-INTEGRATION.md`.
