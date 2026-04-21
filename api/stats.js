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

    const stats = calculateStats(allTasks);
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Unable to fetch stats' });
  }
}

function calculateStats(tasks) {
  let success = 0;
  let stopped = 0;
  let totalFocusTime = 0; // in seconds
  const dailyStats = {}; // { date: { success, stopped, focusTime } }
  const categoryStats = {}; // { category: { success, stopped, count } }
  const lastDates = {}; // track last successful task date per category

  tasks.forEach((task) => {
    if (task.status === 'success') success++;
    if (task.status === 'stopped') stopped++;

    // Calculate total focus time for successful tasks
    if (task.status === 'success') {
      totalFocusTime += task.duration || 0;
    }

    // Daily stats
    const date = task.createdat ? task.createdat.split('T')[0] : new Date().toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { success: 0, stopped: 0, focusTime: 0 };
    }
    if (task.status === 'success') {
      dailyStats[date].success++;
      dailyStats[date].focusTime += task.duration || 0;
      lastDates[task.category || 'General'] = date;
    } else if (task.status === 'stopped') {
      dailyStats[date].stopped++;
    }

    // Category stats
    const category = task.category || 'General';
    if (!categoryStats[category]) {
      categoryStats[category] = { success: 0, stopped: 0, totalDuration: 0 };
    }
    if (task.status === 'success') {
      categoryStats[category].success++;
    } else if (task.status === 'stopped') {
      categoryStats[category].stopped++;
    }
    categoryStats[category].totalDuration += task.duration || 0;
  });

  // Calculate focus score
  const totalTasks = success + stopped;
  const focusScore = totalTasks > 0 ? Math.round((success / totalTasks) * 100) : 0;

  // Calculate streak (consecutive days with at least 1 success)
  const streak = calculateStreak(Object.keys(dailyStats).sort().reverse(), dailyStats);

  // Calculate daily totals for today
  const today = new Date().toISOString().split('T')[0];
  const todayStats = dailyStats[today] || { success: 0, stopped: 0, focusTime: 0 };

  return {
    success,
    stopped,
    focusScore,
    totalFocusTime,
    focusTimeMinutes: Math.round(totalFocusTime / 60),
    streak,
    todayStats,
    dailyStats,
    categoryStats: Object.keys(categoryStats).map(cat => ({
      name: cat,
      ...categoryStats[cat],
      focusScore: categoryStats[cat].success + categoryStats[cat].stopped > 0 
        ? Math.round((categoryStats[cat].success / (categoryStats[cat].success + categoryStats[cat].stopped)) * 100)
        : 0
    }))
  };
}

function calculateStreak(sortedDates, dailyStats) {
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (const date of sortedDates) {
    if (dailyStats[date].success > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
