# Enhanced Timer App - Quick Reference

## Files Updated/Created

### ✅ Backend API (`/api`)
- **tasks.js** (updated)
  - Added category filter to GET
  - Added category + distractionCount to POST
  - Added PATCH for distraction updates
  
- **stats.js** (updated)
  - Added focusScore calculation
  - Added dailyTotalMinutes
  - Added streak calculation
  - Added categoryBreakdown
  - Added optional category filter

- **weekly.js** (NEW)
  - Weekly summary endpoint
  - Day-by-day breakdown
  - Focus score + average distractions
  
- **heatmap.js** (NEW)
  - Activity visualization data
  - Configurable date range (1w, 1m, 3m, 6m, 1y)
  - Intensity scores 0-4

### ✅ Frontend (`/src`)
- **App.jsx** (updated)
  - Category selector on task creation
  - Distraction tracking button
  - Pomodoro alerts (25-min sessions)
  - Focus Score + Streak display
  - localStorage caching
  - Offline mode indicator
  - Sync queue for offline tasks
  - Enhanced stats display

- **styles.css** (no changes needed)
  - Select elements already styled

### 📄 Documentation
- **ENHANCEMENTS.md** - Complete feature guide
- **API_REFERENCE.md** - This file

---

## State Management Changes

**New React State Variables:**
```javascript
const [taskCategory, setTaskCategory]           // Task category
const [distractionCount, setDistractionCount]   // Distraction count during session
const [selectedCategory, setSelectedCategory]   // Filter view by category
const [pomodoroAlert, setPomodoroAlert]         // Pomodoro completion alert
const [syncQueue, setSyncQueue]                 // Offline tasks queue
const [offlineMode, setOfflineMode]             // Offline status flag
```

**Updated State Variables:**
```javascript
const [stats, setStats]  // Now includes focusScore, streak, categoryBreakdown
```

---

## API Endpoint Summary

| Endpoint | Method | Feature | New/Updated |
|----------|--------|---------|-------------|
| `/api/tasks` | GET | Fetch with category filter | Updated |
| `/api/tasks` | POST | Create with category + distraction | Updated |
| `/api/tasks` | PATCH | Update distraction count | Updated |
| `/api/stats` | GET | Focus score, streak, category breakdown | Updated |
| `/api/weekly` | GET | Weekly report + daily breakdown | **NEW** |
| `/api/heatmap` | GET | Activity heatmap data | **NEW** |

---

## Database Changes Required

Add columns to Supabase `tasks` table:
```sql
ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'General';
ALTER TABLE tasks ADD COLUMN distractioncount INTEGER DEFAULT 0;
```

---

## New Features by Priority

### High Priority (Core Functionality)
1. ✅ Categories - Essential for organization
2. ✅ Focus Score - Better metric than raw counts
3. ✅ Pomodoro Alerts - Built-in break reminders

### Medium Priority (Analytics)
1. ✅ Day Streak - Motivation boost
2. ✅ Weekly Reports - Trend analysis
3. ✅ Distraction Tracking - Focus quality metric

### Lower Priority (Advanced)
1. ✅ Heatmap Data - Visualization-ready
2. ✅ Offline Mode - Edge case handling
3. ✅ Category Breakdown - Detailed analytics

---

## Testing Checklist

### Backend
- [ ] POST task with category
- [ ] GET stats with focus score
- [ ] GET weekly report
- [ ] GET heatmap data
- [ ] PATCH distraction count

### Frontend
- [ ] Category dropdown works
- [ ] Distraction button increments
- [ ] Pomodoro alert triggers at 60s
- [ ] Focus Score displays correctly
- [ ] Offline sync queue persists
- [ ] localStorage caching works

### Integration
- [ ] Tasks sync when online
- [ ] Stats update after task completes
- [ ] Category filter works end-to-end
- [ ] Streak calculates correctly

---

## Common Queries

### Get User's Weekly Stats
```bash
curl "https://api.example.com/api/weekly?userEmail=user@email.com"
```

### Get Activity Heatmap (Last 3 Months)
```bash
curl "https://api.example.com/api/heatmap?userEmail=user@email.com&range=3m"
```

### Get Work Category Tasks Only
```bash
curl "https://api.example.com/api/tasks?userEmail=user@email.com&category=Work"
```

### Get Focus Score by Category
```bash
curl "https://api.example.com/api/stats?userEmail=user@email.com&category=Study"
```

---

## Performance Notes

- **Stats Calculation**: O(n) where n = number of user tasks
- **Heatmap**: Filters by date range, generates intensity per day
- **Weekly Report**: Calculates streaks on-the-fly
- **localStorage**: ~100KB per user (tasks + queue)
- **Sync Queue**: Auto-syncs on network restore

---

## Customization Ideas

1. **Add More Categories**
   - Update CATEGORIES array in App.jsx
   - Extend Supabase enum if used

2. **Adjust Pomodoro Duration**
   - Change `taskMinutes === 25` check in App.jsx
   - Currently hardcoded to 25 minutes

3. **Break Duration**
   - Calculate break suggestion based on session length
   - E.g., 1 hour session → 10 min break

4. **Custom Alerts**
   - Add sound/notification on task completion
   - Customize alert messages per category

5. **Export Data**
   - Add endpoint to export weekly/monthly reports
   - CSV or JSON format

---

**Last Updated:** 2026-04-20
**Version:** 2.0
