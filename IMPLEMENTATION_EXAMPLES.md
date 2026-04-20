# Timer App - Implementation Examples

## Frontend Examples

### 1. Track Distraction During Session
```javascript
// User clicks "😵 Distraction" button
const handleDistraction = () => {
  setDistractionCount(prev => prev + 1);
  // Optionally update backend in real-time
  fetch('/api/tasks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: activeTask.id,
      userEmail: user.email,
      distractionCount
    })
  });
};
```

### 2. Create Task with Category
```javascript
const handleStartTask = () => {
  const payload = {
    name: 'Design landing page',
    duration: 25 * 60,
    category: 'Work',     // ← New
    status: 'running',
    userEmail: user.email
  };
  // Task saved with category
};
```

### 3. Fetch Stats with Category Filter
```javascript
const fetchWorkStats = async () => {
  const res = await fetch(
    `/api/stats?userEmail=${user.email}&category=Work`
  );
  const stats = await res.json();
  console.log(stats);
  // {
  //   focusScore: 85,
  //   streak: 3,
  //   success: 8,
  //   stopped: 1,
  //   categoryBreakdown: {...}
  // }
};
```

### 4. Offline Task Storage
```javascript
const saveTaskOffline = (taskData) => {
  // Add to sync queue
  const queue = JSON.parse(
    localStorage.getItem('timerAppSyncQueue') || '[]'
  );
  queue.push(taskData);
  localStorage.setItem('timerAppSyncQueue', JSON.stringify(queue));
  setOfflineMode(true);
};

const syncWhenOnline = async () => {
  window.addEventListener('online', async () => {
    const queue = JSON.parse(
      localStorage.getItem('timerAppSyncQueue') || '[]'
    );
    for (const task of queue) {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
    }
    localStorage.setItem('timerAppSyncQueue', '[]');
    setOfflineMode(false);
  });
};
```

### 5. Category Filter UI
```javascript
const CATEGORIES = ['General', 'Work', 'Study', 'Exercise', 'Creative', 'Personal'];

const CategorySelector = ({ value, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}>
    {CATEGORIES.map(cat => (
      <option key={cat} value={cat}>{cat}</option>
    ))}
  </select>
);

// Usage:
<CategorySelector 
  value={taskCategory} 
  onChange={setTaskCategory} 
/>
```

---

## Backend Examples

### 1. Enhanced Stats Calculation
```javascript
// In /api/stats.js
const stats = {
  success: 12,           // Completed tasks
  stopped: 2,            // Interrupted tasks
  focusScore: 86,        // 12/(12+2) * 100
  dailyTotalMinutes: 300,
  streak: 5,             // Days with 1+ success
  categoryBreakdown: {
    'Work': { success: 8, stopped: 0, duration: 28800 },
    'Study': { success: 4, stopped: 2, duration: 10800 }
  }
};

// Formula: Focus Score = (Success / (Success + Stopped)) * 100
const focusScore = Math.round((12 / 14) * 100); // 86%
```

### 2. Weekly Report Generation
```javascript
// In /api/weekly.js
const weeklyReport = {
  weekStart: "2026-04-13",
  weekEnd: "2026-04-19",
  totalSuccess: 12,
  totalStopped: 2,
  focusScore: 86,
  totalFocusMinutes: 300,
  avgDistractions: 1.2,  // (12 + 14 + ... ) / taskCount
  dayBreakdown: {
    "Mon": { success: 2, stopped: 0, focusMinutes: 50 },
    "Tue": { success: 1, stopped: 1, focusMinutes: 25 },
    "Wed": { success: 3, stopped: 0, focusMinutes: 75 },
    // ... rest of week
  }
};
```

### 3. Heatmap Data for Visualization
```javascript
// In /api/heatmap.js
// Perfect for GitHub-style activity chart
const heatmapData = {
  "2026-04-20": {
    date: "2026-04-20",
    success: 3,
    stopped: 0,
    totalMinutes: 75,
    intensity: 3  // 0-4 scale
  },
  "2026-04-19": {
    date: "2026-04-19",
    success: 0,
    stopped: 0,
    totalMinutes: 0,
    intensity: 0  // No activity
  },
  "2026-04-18": {
    date: "2026-04-18",
    success: 2,
    stopped: 1,
    totalMinutes: 50,
    intensity: 2
  }
};

// Render in React:
Object.entries(heatmapData).map(([date, data]) => (
  <div 
    key={date}
    style={{
      background: getIntensityColor(data.intensity),
      title: `${data.success} tasks on ${date}`
    }}
  />
));
```

### 4. Distraction Tracking
```javascript
// POST task with distraction count
const taskPayload = {
  name: "Implement auth",
  duration: 1800,
  category: "Work",
  status: "success",
  userEmail: "dev@example.com",
  distractionCount: 2  // ← Tracked
};

// PATCH to update during session
const patchPayload = {
  id: 123,
  userEmail: "dev@example.com",
  distractionCount: 3  // Incremented
};
```

### 5. Streak Calculation
```javascript
// Algorithm: Count consecutive days with ≥1 success
function calculateStreak(tasks) {
  const dailyMap = {};
  
  // Group tasks by date
  tasks.forEach(task => {
    if (!task.createdat) return;
    const date = task.createdat.split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = { success: 0, total: 0 };
    }
    if (task.status === 'success') {
      dailyMap[date].success++;
    }
    dailyMap[date].total++;
  });

  // Count from today backwards
  const sortedDates = Object.keys(dailyMap).sort().reverse();
  let streak = 0;
  let expectedDate = new Date();

  for (const dateStr of sortedDates) {
    const daysDiff = Math.floor(
      (expectedDate - new Date(dateStr)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff === 0 && dailyMap[dateStr].success > 0) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (daysDiff > 1) {
      break;  // Gap in streak
    } else {
      expectedDate.setDate(expectedDate.getDate() - 1);
    }
  }

  return streak;
}
```

---

## Data Flow Examples

### Complete User Journey

```
1. USER SIGNS IN
   └─> Google OAuth → setUser → fetchTasks + fetchStats

2. USER CREATES TASK
   Category: "Work"
   Duration: 25 minutes
   └─> setActiveTask + start timer

3. TIMER RUNNING
   User clicks "😵 Distraction"
   └─> distractionCount increments
   └─> (optional) PATCH /api/tasks to update backend

4. POMODORO ALERT
   At 60 seconds remaining:
   └─> setPomodoroAlert("🎯 Pomodoro done!...")

5. TIMER COMPLETES
   └─> endTask('success')
   └─> POST /api/tasks with:
       { name, duration, category, distractionCount, ... }
   └─> fetchTasks() + fetchStats()

6. STATS UPDATE
   /api/stats returns:
   {
     success: 1,
     stopped: 0,
     focusScore: 100,
     streak: 1,
     categoryBreakdown: {...}
   }
```

### Offline Sync Flow

```
1. USER OFFLINE
   └─> Task saved to localStorage
   └─> Added to syncQueue
   └─> Show "📡 Offline mode" banner

2. USER BACK ONLINE
   window.addEventListener('online')
   └─> syncOfflineQueue()
   └─> For each task: POST /api/tasks
   └─> Clear syncQueue
   └─> Hide offline banner

3. STATS RECALCULATED
   └─> fetchStats() refreshes UI
```

---

## Query Examples

### Get Weekly Report
```bash
curl -X GET \
  'https://your-api.vercel.app/api/weekly?userEmail=user@example.com' \
  -H 'Accept: application/json'
```

### Get Heatmap Data
```bash
curl -X GET \
  'https://your-api.vercel.app/api/heatmap?userEmail=user@example.com&range=1m' \
  -H 'Accept: application/json'
```

### Get Work Category Stats
```bash
curl -X GET \
  'https://your-api.vercel.app/api/stats?userEmail=user@example.com&category=Work' \
  -H 'Accept: application/json'
```

### Create Task with Category
```bash
curl -X POST \
  'https://your-api.vercel.app/api/tasks' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Code review",
    "duration": 1800,
    "status": "success",
    "userEmail": "user@example.com",
    "category": "Work",
    "distractionCount": 1
  }'
```

---

## Component Examples

### Stats Display Component
```jsx
const StatsDisplay = ({ stats }) => (
  <div className="stats-grid">
    <Stat label="Focus Score" value={`${stats.focusScore}%`} />
    <Stat label="Day Streak" value={stats.streak} />
    <Stat label="Completed" value={stats.success} />
    <Stat label="Interrupted" value={stats.stopped} />
  </div>
);

const Stat = ({ label, value }) => (
  <div className="stat-box">
    <strong>{value}</strong>
    <small>{label}</small>
  </div>
);
```

### Category Filter Component
```jsx
const CategoryFilter = ({ selected, onChange, categories }) => (
  <select value={selected} onChange={e => onChange(e.target.value)}>
    <option value="All">All Categories</option>
    {categories.map(cat => (
      <option key={cat} value={cat}>{cat}</option>
    ))}
  </select>
);
```

### Heatmap Component (Skeleton)
```jsx
const ActivityHeatmap = ({ heatmapData }) => (
  <div className="heatmap">
    {Object.entries(heatmapData).map(([date, data]) => (
      <div
        key={date}
        className={`heatmap-cell intensity-${data.intensity}`}
        title={`${data.success} tasks on ${date}`}
      />
    ))}
  </div>
);

// CSS
.heatmap-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin: 2px;
}
.intensity-0 { background: #ebedf0; }
.intensity-1 { background: #c6e48b; }
.intensity-2 { background: #7bc96f; }
.intensity-3 { background: #239a3b; }
.intensity-4 { background: #196127; }
```

