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
    const { data, error } = await supabase
      .from('tasks')
      .select('status, duration, createdat, category, distractioncount')
      .eq('useremail', userEmail);

    if (error) throw error;

    const weeklyReport = calculateWeeklyReport(data || []);
    return res.json(weeklyReport);
  } catch (error) {
    console.error('Error fetching weekly report:', error);
    return res.status(500).json({ error: 'Unable to fetch weekly report' });
  }
}

function calculateWeeklyReport(tasks) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekTasks = tasks.filter((task) => {
    if (!task.createdat) return false;
    const taskDate = new Date(task.createdat);
    return taskDate >= weekStart && taskDate <= weekEnd;
  });

  const dayBreakdown = {};
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dateKey = day.toISOString().split('T')[0];
    const dayName = days[day.getDay()];
    dayBreakdown[dayName] = {
      date: dateKey,
      success: 0,
      stopped: 0,
      focusMinutes: 0,
      avgDistractions: 0
    };
  }

  let totalSuccess = 0;
  let totalStopped = 0;
  let totalFocusMinutes = 0;
  let totalDistractions = 0;
  let distractionCount = 0;

  weekTasks.forEach((task) => {
    const taskDate = new Date(task.createdat);
    const dayName = days[taskDate.getDay()];

    if (task.status === 'success') {
      dayBreakdown[dayName].success++;
      totalSuccess++;
      dayBreakdown[dayName].focusMinutes += Math.round(task.duration / 60);
      totalFocusMinutes += Math.round(task.duration / 60);
    } else if (task.status === 'stopped') {
      dayBreakdown[dayName].stopped++;
      totalStopped++;
    }

    if (task.distractioncount) {
      totalDistractions += task.distractioncount;
      distractionCount++;
    }
  });

  const focusScore = totalSuccess + totalStopped > 0 
    ? Math.round((totalSuccess / (totalSuccess + totalStopped)) * 100)
    : 0;

  const avgDistractions = distractionCount > 0 ? (totalDistractions / distractionCount).toFixed(1) : 0;

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    totalSuccess,
    totalStopped,
    focusScore,
    totalFocusMinutes,
    avgDistractions,
    dayBreakdown,
    tasksThisWeek: weekTasks.length
  };
}
