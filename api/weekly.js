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

  const { userEmail } = req.query;

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

    const weeklyData = calculateWeeklyStats(allTasks);
    return res.json(weeklyData);
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    return res.status(500).json({ error: 'Unable to fetch weekly stats' });
  }
}

function calculateWeeklyStats(tasks) {
  const today = new Date();
  const weekDays = [];
  const weekStats = {};

  // Create 7 days (current week Mon-Sun)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    
    weekDays.push(dateStr);
    weekStats[dateStr] = { 
      date: dateStr, 
      day: dayName,
      success: 0, 
      stopped: 0, 
      focusTime: 0,
      tasks: 0,
      focusScore: 0
    };
  }

  // Populate stats from tasks
  tasks.forEach((task) => {
    const date = task.createdat ? task.createdat.split('T')[0] : null;
    
    if (date && weekStats[date]) {
      weekStats[date].tasks++;
      if (task.status === 'success') {
        weekStats[date].success++;
        weekStats[date].focusTime += task.duration || 0;
      } else if (task.status === 'stopped') {
        weekStats[date].stopped++;
      }
    }
  });

  // Calculate focus scores
  Object.keys(weekStats).forEach(date => {
    const dayData = weekStats[date];
    const total = dayData.success + dayData.stopped;
    dayData.focusScore = total > 0 ? Math.round((dayData.success / total) * 100) : 0;
  });

  // Summary stats
  const totalSuccess = Object.values(weekStats).reduce((sum, d) => sum + d.success, 0);
  const totalStopped = Object.values(weekStats).reduce((sum, d) => sum + d.stopped, 0);
  const totalFocusTime = Object.values(weekStats).reduce((sum, d) => sum + d.focusTime, 0);
  const avgFocusScore = Object.values(weekStats).length > 0 
    ? Math.round(Object.values(weekStats).reduce((sum, d) => sum + d.focusScore, 0) / 7)
    : 0;

  return {
    week: weekDays,
    daily: Object.values(weekStats),
    summary: {
      totalTasks: totalSuccess + totalStopped,
      totalSuccess,
      totalStopped,
      totalFocusTimeMinutes: Math.round(totalFocusTime / 60),
      avgFocusScore,
      focusScore: totalSuccess + totalStopped > 0 
        ? Math.round((totalSuccess / (totalSuccess + totalStopped)) * 100)
        : 0
    }
  };
}
