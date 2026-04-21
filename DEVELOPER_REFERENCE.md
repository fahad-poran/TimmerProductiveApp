# 🔧 Developer Quick Reference

## Building & Running

### Local Development
```bash
# Install dependencies (if needed)
npm install

# Start local dev server with Vercel functions
vercel dev

# Open browser
http://localhost:3000
```

### Production Deployment
```bash
# Push to GitHub (Vercel auto-deploys on main branch)
git add .
git commit -m "Your message"
git push origin main

# Check deployment status
# Visit: https://vercel.com/dashboard
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/google` - Verify Google JWT token

### Tasks Management
- `GET /api/tasks?userEmail=user@gmail.com` - Fetch all user tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks` - Update task (distraction count, status)

### Analytics
- `GET /api/stats?userEmail=user@gmail.com` - User stats (focus score, streak, category breakdown)
- `GET /api/weekly?userEmail=user@gmail.com` - 7-day analytics
- `GET /api/heatmap?userEmail=user@gmail.com&days=30` - 30-day activity heatmap

---

## Environment Variables

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

Set in:
- Local: `.env.local` (git-ignored)
- Vercel Dashboard: Settings → Environment Variables

---

## Database Schema

### tasks table
```sql
Column              Type        Default
-------------------------------------------
id                  bigint      (auto)
created_at          timestamp   now()
name                text        required
duration            int         (seconds)
status              text        ('success'|'stopped')
category            text        'General'
distractioncount    int         0
focusdata           jsonb       NULL
completedat         timestamp   NULL
createdat           timestamp   now()
useremail           text        required
```

### Indexes
```sql
idx_tasks_useremail_createdat   -- Fast date queries
idx_tasks_useremail_status      -- Fast status filtering
idx_tasks_useremail_category    -- Fast category queries
```

---

## Frontend State Management

### Main State Variables
```javascript
user                    // Google auth user profile
taskName               // Current task name input
taskMinutes            // Duration in minutes
taskCategory           // Selected category
activeTask             // Currently running task
timerSec               // Seconds remaining
status                 // 'idle'|'running'|'paused'|'finished'|'stopped'
tasks                  // Array of all user tasks
stats                  // Aggregated stats object
weeklyStats            // 7-day breakdown
heatmapData            // 30-day activity data
distractionCount       // Distractions in current session
viewMode               // 'dashboard'|'weekly'|'heatmap'
isOffline              // Network status
```

### Key Functions
- `startTask()` - Begin timer
- `endTask(result)` - Complete task (success/stopped)
- `recordDistraction()` - Increment distraction counter
- `fetchTasks()` - Load tasks from API
- `fetchStats()` - Load aggregated stats
- `fetchWeeklyStats()` - Load 7-day data
- `fetchHeatmapData()` - Load 30-day heatmap
- `syncQueue()` - Retry failed offline requests

---

## localStorage Keys

```javascript
'timerapp_tasks_cache'      // Cached tasks array
'timerapp_sync_queue'       // Failed API requests to retry
```

These persist offline data and sync when online.

---

## Common Development Tasks

### Add a New API Endpoint
1. Create file: `/api/newroute.js`
2. Export default handler: `export default async function handler(req, res)`
3. Set headers: `res.setHeader('Access-Control-Allow-Origin', '*')`
4. Handle methods: `if (req.method === 'GET') ...`
5. Vercel auto-routes `/api/newroute` → `/api/newroute.js`

### Add a New Category
1. Update categories array in App.jsx
2. No database changes needed (stored as text)

### Add New Stats Metric
1. Calculate in `/api/stats.js` `calculateStats()` function
2. Update `setStats()` state in App.jsx
3. Display in UI

### Test Offline Mode
1. DevTools → Network tab → Offline checkbox
2. Make API call (will be queued)
3. Switch back Online
4. Verify sync happens automatically

---

## Monitoring & Debugging

### Supabase Monitoring
1. Open Supabase Dashboard
2. SQL Editor → check recent queries
3. Table Editor → verify data saves
4. Logs → check for errors

### Vercel Monitoring
1. Open Vercel Dashboard
2. Functions → check execution logs
3. Analytics → monitor response times & errors
4. Environment → verify variables set

### Browser DevTools
```javascript
// Check localStorage
localStorage.getItem('timerapp_tasks_cache')
localStorage.getItem('timerapp_sync_queue')

// Check network requests
// Network tab → filter by /api

// Check console for errors
// Console tab → look for red errors
```

---

## Performance Tips

- **Database**: Indexes on (useremail, createdat) and (useremail, status) keep queries < 100ms
- **Frontend**: Charts only render when switching views (lazy load weekly/heatmap)
- **Offline**: localStorage syncs in background, doesn't block UI
- **Caching**: Tasks cached on every fetch, reduces API calls

---

## Troubleshooting Checklist

❌ Tasks not saving?
- [ ] Check user logged in with email
- [ ] Verify Supabase connection URL
- [ ] Check network tab for /api/tasks response
- [ ] Verify userEmail param sent

❌ Charts not showing?
- [ ] Check if Chart.js library imported
- [ ] Verify data passes to chart component
- [ ] Check browser console for errors
- [ ] Ensure weekly endpoint returns data

❌ Offline not working?
- [ ] Check localStorage enabled in browser
- [ ] Verify STORAGE_KEY matches constant
- [ ] Check DevTools → Application → Storage

❌ Google login failing?
- [ ] Verify VITE_GOOGLE_CLIENT_ID matches Google Console
- [ ] Check Google Console has http://localhost:3000 (dev) and production URL
- [ ] Verify token verification in /api/auth/google

❌ Focus score always 0%?
- [ ] Run DATABASE_MIGRATION.sql (missing `category` column)
- [ ] Verify stats calculation logic in /api/stats.js
- [ ] Check that tasks have `status: 'success'` or `'stopped'`

---

## File Locations Reference

```
Core Files
├── src/App.jsx                    Main React component (850+ lines)
├── src/main.jsx                   Entry point
├── src/styles.css                 Styling

API Routes (Vercel Serverless)
├── api/index.js                   Root endpoint /
├── api/tasks.js                   POST/GET/PATCH tasks
├── api/stats.js                   GET user stats
├── api/weekly.js                  GET 7-day analytics
├── api/heatmap.js                 GET 30-day heatmap
└── api/auth/google.js              POST Google auth

Configuration
├── package.json                   Dependencies
├── vite.config.js                 Vite bundler config
├── vercel.json                    Vercel deployment config (optional)
├── .env.local                     Local env vars (git-ignored)

Documentation
├── IMPLEMENTATION_SUMMARY.md      Feature details & architecture
├── DEPLOYMENT_CHECKLIST.md        Step-by-step deployment guide
├── DATABASE_MIGRATION.sql         Schema updates
└── README.md                       Project overview
```

---

**Created:** April 21, 2026  
**Version:** 2.0  
**Last Updated:** Deployment Ready
