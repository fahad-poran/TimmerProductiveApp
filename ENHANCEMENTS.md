# Timer App Enhancements

## Overview
Your Supabase-based timer app has been enhanced with advanced analytics, offline support, and productivity features.

---

## New Backend Endpoints

### 1. **Enhanced `/api/tasks`** (existing, now with new features)
- **GET** - Fetch tasks with optional category filter
  ```
  GET /api/tasks?userEmail=user@example.com&category=Work
  ```
  Returns tasks for the user, optionally filtered by category

- **POST** - Create task with category and distraction tracking
  ```json
  {
    "name": "Design homepage",
    "duration": 1500,
    "status": "success",
    "userEmail": "user@example.com",
    "category": "Work",
    "distractionCount": 2,
    "completedAt": "2026-04-20T10:30:00Z"
  }
  ```

- **PATCH** - Update distraction count during a running task
  ```json
  {
    "id": 123,
    "userEmail": "user@example.com",
    "distractionCount": 3
  }
  ```

---

### 2. **Enhanced `/api/stats`** (existing, now with new metrics)
```
GET /api/stats?userEmail=user@example.com&category=Work
```

**Response includes:**
- `success` - Number of completed tasks
- `stopped` - Number of interrupted tasks
- `focusScore` - Success / (success + stopped) as percentage
- `dailyTotalMinutes` - Total focused time in minutes
- `streak` - Consecutive days with ≥1 successful task
- `categoryBreakdown` - Stats per category
  ```json
  {
    "Work": { "success": 5, "stopped": 1, "duration": 7200 },
    "Study": { "success": 3, "stopped": 0, "duration": 5400 }
  }
  ```

---

### 3. **NEW `/api/weekly`**
```
GET /api/weekly?userEmail=user@example.com
```

**Returns weekly summary:**
- Start and end dates
- Total successful/stopped tasks this week
- Overall focus score for the week
- Total focus minutes
- Average distractions per task
- Breakdown by day (Sun-Sat) with success/stopped counts

**Example Response:**
```json
{
  "weekStart": "2026-04-13",
  "weekEnd": "2026-04-19",
  "totalSuccess": 12,
  "totalStopped": 2,
  "focusScore": 86,
  "totalFocusMinutes": 180,
  "avgDistractions": 1.2,
  "tasksThisWeek": 14,
  "dayBreakdown": {
    "Mon": { "success": 2, "stopped": 0, "focusMinutes": 50 },
    "Tue": { "success": 1, "stopped": 1, "focusMinutes": 25 }
  }
}
```

---

### 4. **NEW `/api/heatmap`**
```
GET /api/heatmap?userEmail=user@example.com&range=3m
```

**Range options:** `1w`, `1m` (default), `3m`, `6m`, `1y`

**Returns activity heatmap data:**
- Date-indexed object with intensity (0-4)
- 0 = no activity, 4 = most active
- Useful for GitHub-style activity visualization

**Example Response:**
```json
{
  "range": "3m",
  "startDate": "2026-01-20",
  "endDate": "2026-04-20",
  "data": {
    "2026-04-20": { "success": 3, "stopped": 0, "intensity": 3, "totalMinutes": 75 },
    "2026-04-19": { "success": 0, "stopped": 0, "intensity": 0, "totalMinutes": 0 },
    "2026-04-18": { "success": 2, "stopped": 1, "intensity": 2, "totalMinutes": 50 }
  },
  "maxValue": { "success": 5, "minutes": 150 }
}
```

---

## Frontend Enhancements

### 1. **Category Support**
- Task creation now includes category selection (General, Work, Study, Exercise, Creative, Personal)
- Category filter in analytics view
- Category-specific stats breakdown

### 2. **Distraction Tracking**
- Click "😵 Distraction" button during active task to log distractions
- Distraction count saved with task
- Visible distraction metrics in analytics

### 3. **Pomodoro Logic**
- 25-minute timer triggers alert: "🎯 Pomodoro done! Take a 5-min break."
- Alert appears in final 60 seconds of 25-min session
- Customizable timer duration

### 4. **Enhanced Analytics**
- **Focus Score** - Percentage of successful vs. interrupted sessions
- **Day Streak** - Consecutive days with ≥1 completed task
- **Focus Score** replaces simple success/stop counts
- Category breakdown visible in stats

### 5. **Offline Support**
- Tasks saved to localStorage when offline
- "📡 Offline mode" banner shows when using cached data
- Sync queue persists failed API calls
- Auto-sync when connection restored
- Tasks remain visible even without network

### 6. **Database Schema Enhancements**
Your Supabase `tasks` table should have these columns:
```sql
- id (Primary Key)
- useremail (Text)
- name (Text)
- duration (Integer, seconds)
- status (Text: 'success' | 'stopped')
- category (Text, default: 'General')
- distractioncount (Integer, default: 0)
- createdat (Timestamp)
- completedat (Timestamp, nullable)
```

---

## Usage Examples

### Complete a task (React)
```javascript
// Automatically tracked when timer ends:
// 1. Task saved with category
// 2. Distraction count recorded
// 3. Status marked 'success'
// 4. Stats updated (focus score, streak)
```

### Fetch weekly report
```bash
curl "https://your-domain/api/weekly?userEmail=user@example.com"
```

### Get activity heatmap for last 6 months
```bash
curl "https://your-domain/api/heatmap?userEmail=user@example.com&range=6m"
```

### Filter tasks by category
```bash
curl "https://your-domain/api/tasks?userEmail=user@example.com&category=Work"
```

---

## Key Improvements

| Feature | Benefit |
|---------|---------|
| Categories | Organize and analyze tasks by type |
| Distraction Count | Track focus quality, not just completion |
| Focus Score | Better metric than raw success count |
| Day Streak | Motivate consistent daily effort |
| Weekly Reports | See productivity trends |
| Heatmap Data | Visualize activity patterns |
| Offline Mode | Work without internet connectivity |
| Pomodoro Alerts | Built-in break reminders |

---

## Next Steps

1. **Update Supabase Schema**
   - Add new columns to tasks table if not present

2. **Deploy API Routes**
   - Push `/api/weekly.js` and `/api/heatmap.js` to Vercel
   - Update existing `/api/tasks.js` and `/api/stats.js`

3. **Test New Features**
   - Create tasks with different categories
   - Use distraction button during timers
   - View weekly report and heatmap

4. **Optional: Advanced Analytics**
   - Add charts for weekly/monthly trends
   - Build heatmap visualization component
   - Show category breakdown pie chart

---

## API Migration Checklist

- [ ] Update database schema with new columns
- [ ] Deploy new API endpoints (weekly.js, heatmap.js)
- [ ] Deploy updated endpoints (tasks.js, stats.js)
- [ ] Test category filtering
- [ ] Test offline sync queue
- [ ] Verify Pomodoro alerts trigger correctly
- [ ] Test distraction tracking
- [ ] Check focus score calculation
