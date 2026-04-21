# 🚀 Quick Deployment Checklist

## Step 1: Update Database Schema (Supabase)
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy and run all SQL from `DATABASE_MIGRATION.sql`
- [ ] Verify: Check 'tasks' table now has columns:
  - [ ] `category`
  - [ ] `distractioncount`
  - [ ] `focusdata`

## Step 2: Test Locally
```bash
cd d:\githubProject\timmerApp\TimmerProductiveApp
vercel dev
```
- [ ] Open http://localhost:3000
- [ ] Google OAuth login works
- [ ] Create task with category dropdown
- [ ] Timer countdown works
- [ ] Click distraction button
- [ ] Complete task successfully
- [ ] Check /api/stats endpoint shows focus score & streak
- [ ] Check /api/weekly endpoint shows 7-day data
- [ ] Check /api/heatmap endpoint shows heat data
- [ ] Switch between Dashboard/Weekly/Heatmap views
- [ ] Test offline mode (DevTools → Network → Offline)
- [ ] Verify localStorage caching works

## Step 3: Deploy to Vercel
```bash
git add .
git commit -m "Enhanced timer: categories, distraction tracking, weekly/heatmap analytics, offline sync"
git push origin main
```
- [ ] Wait for Vercel deployment to complete
- [ ] Check build logs for any errors
- [ ] Production URL working: https://timmer-productive-app.vercel.app

## Step 4: Verify Environment Variables
In Vercel Dashboard → Settings → Environment Variables:
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_ANON_KEY` set
- [ ] `VITE_GOOGLE_CLIENT_ID` set
- [ ] `GOOGLE_CLIENT_ID` set

## Step 5: Test in Production
- [ ] Open production URL
- [ ] Google login works
- [ ] Create new task with category
- [ ] Complete task and verify saved in DB
- [ ] Check analytics panels load data
- [ ] Try Weekly view
- [ ] Try Heatmap view

## Step 6: Monitor
- [ ] Check Supabase query logs for errors
- [ ] Check Vercel function logs
- [ ] Monitor database growth

---

## 📝 API Testing (with cURL or Postman)

### Test GET /api/stats
```bash
curl "https://timmer-productive-app.vercel.app/api/stats?userEmail=your-email@gmail.com"
```
Expected response includes: `focusScore`, `streak`, `categoryStats`

### Test GET /api/weekly
```bash
curl "https://timmer-productive-app.vercel.app/api/weekly?userEmail=your-email@gmail.com"
```
Expected response includes: `daily`, `summary` with weekly breakdown

### Test GET /api/heatmap
```bash
curl "https://timmer-productive-app.vercel.app/api/heatmap?userEmail=your-email@gmail.com&days=30"
```
Expected response includes: `calendar`, `hourly`, `insights`

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Tasks not saving | Check Supabase connection + environment variables |
| Charts not displaying | Verify weekly/heatmap endpoints respond with data |
| Category dropdown missing | Refresh browser cache (Ctrl+Shift+Delete) |
| Offline sync not working | Check browser localStorage enabled |
| Google login fails | Verify `VITE_GOOGLE_CLIENT_ID` matches Google Console |
| 404 on /api/weekly | Ensure `/api/weekly.js` file exists |
| Stats show 0% focus score | Database migration not run - need `category` column |

---

## 📊 Expected Results After Setup

✅ Dashboard shows:
- Current timer with category selector
- Distraction counter button
- Focus Score (0-100%)
- Day Streak counter
- Total Focus Time in minutes
- Recent tasks with distraction counts

✅ Weekly View shows:
- 7-day line chart
- Daily success breakdown
- Weekly summary stats

✅ Heatmap View shows:
- 30-day color intensity grid
- Peak hours analysis
- Hourly success rates

✅ Offline Features:
- Tasks cached in localStorage
- Sync queue stores failed requests
- Auto-syncs when online

---

**Version:** 2.0
**Last Updated:** April 21, 2026
