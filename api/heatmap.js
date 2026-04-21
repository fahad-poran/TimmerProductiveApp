import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, days = 30 } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'Missing userEmail' });
  }

  try {
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('useremail', userEmail)
      .order('createdat', { ascending: false });

    if (error) throw error;

    const heatmapData = calculateHeatmap(allTasks, parseInt(days));
    return res.json(heatmapData);
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return res.status(500).json({ error: 'Unable to fetch heatmap data' });
  }
}

function calculateHeatmap(tasks, daysBack = 30) {
  const heatmap = {};
  const hourlyActivity = {};
  
  // Initialize hourly bins (0-23)
  for (let h = 0; h < 24; h++) {
    hourlyActivity[h] = { count: 0, focusTime: 0, success: 0 };
  }

  // Initialize date grid
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    heatmap[dateStr] = { count: 0, focusTime: 0, success: 0, failed: 0, dayOfWeek: date.getDay() };
  }

  // Process tasks
  tasks.forEach((task) => {
    if (!task.createdat) return;
    
    const date = task.createdat.split('T')[0];
    const time = task.createdat.split('T')[1];
    const hour = parseInt(time.split(':')[0]);

    // Add to heatmap
    if (heatmap[date]) {
      heatmap[date].count++;
      if (task.status === 'success') {
        heatmap[date].success++;
        heatmap[date].focusTime += task.duration || 0;
      } else {
        heatmap[date].failed++;
      }
    }

    // Add to hourly activity
    hourlyActivity[hour].count++;
    if (task.status === 'success') {
      hourlyActivity[hour].focusTime += task.duration || 0;
      hourlyActivity[hour].success++;
    }
  });

  // Calculate intensity (0-5 scale) for each date
  const maxActivityInDay = Math.max(...Object.values(heatmap).map(d => d.count), 1);
  Object.keys(heatmap).forEach(date => {
    heatmap[date].intensity = Math.ceil((heatmap[date].count / maxActivityInDay) * 5);
  });

  // Build hourly insights
  const hourlyInsights = Object.keys(hourlyActivity).map(hour => ({
    hour: parseInt(hour),
    taskCount: hourlyActivity[hour].count,
    focusTimeMinutes: Math.round(hourlyActivity[hour].focusTime / 60),
    successRate: hourlyActivity[hour].count > 0 
      ? Math.round((hourlyActivity[hour].success / hourlyActivity[hour].count) * 100)
      : 0
  }));

  // Find peak hours
  const peak = hourlyInsights.reduce((max, h) => h.taskCount > max.taskCount ? h : max, hourlyInsights[0]);

  return {
    calendar: heatmap,
    hourly: hourlyInsights,
    insights: {
      peakHour: peak ? peak.hour : 0,
      peakHourActivity: peak ? peak.taskCount : 0,
      totalDaysActive: Object.values(heatmap).filter(d => d.count > 0).length,
      avgTasksPerDay: Math.round(Object.values(heatmap).reduce((sum, d) => sum + d.count, 0) / daysBack)
    }
  };
}
