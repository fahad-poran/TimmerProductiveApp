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

  const { userEmail, category } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'Missing userEmail' });
  }

  try {
    let query = supabase
      .from('tasks')
      .select('status, duration, category, createdat')
      .eq('useremail', userEmail);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = calculateStats(data || []);
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Unable to fetch stats' });
  }
}

function calculateStats(tasks) {
  const stats = {
    success: 0,
    stopped: 0,
    focusScore: 0,
    dailyTotalMinutes: 0,
    streak: 0,
    categoryBreakdown: {}
  };

  let successCount = 0;
  let stoppedCount = 0;
  let totalSuccessDuration = 0;
  const dailyMap = {};

  tasks.forEach((task) => {
    if (task.status === 'success') {
      successCount++;
      totalSuccessDuration += task.duration || 0;
    }
    if (task.status === 'stopped') {
      stoppedCount++;
    }

    // Category breakdown
    const cat = task.category || 'General';
    if (!stats.categoryBreakdown[cat]) {
      stats.categoryBreakdown[cat] = { success: 0, stopped: 0, duration: 0 };
    }
    if (task.status === 'success') {
      stats.categoryBreakdown[cat].success++;
      stats.categoryBreakdown[cat].duration += task.duration || 0;
    } else if (task.status === 'stopped') {
      stats.categoryBreakdown[cat].stopped++;
    }

    // Daily breakdown
    if (task.createdat) {
      const date = new Date(task.createdat).toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { success: 0, total: 0 };
      }
      dailyMap[date].total++;
      if (task.status === 'success') {
        dailyMap[date].success++;
      }
    }
  });

  stats.success = successCount;
  stats.stopped = stoppedCount;

  // Focus score: success / (success + stopped)
  const totalTasks = successCount + stoppedCount;
  stats.focusScore = totalTasks > 0 ? Math.round((successCount / totalTasks) * 100) : 0;

  // Daily total in minutes
  stats.dailyTotalMinutes = Math.round(totalSuccessDuration / 60);

  // Streak: consecutive days with at least 1 successful task
  const sortedDates = Object.keys(dailyMap).sort().reverse();
  let streak = 0;
  let expectedDate = new Date();
  for (const dateStr of sortedDates) {
    const currentDate = new Date(dateStr);
    const daysDiff = Math.floor((expectedDate - currentDate) / (1000 * 60 * 60 * 24));
    if (daysDiff === 0 && dailyMap[dateStr].success > 0) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (daysDiff === 0) {
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }
  stats.streak = streak;

  return stats;
}
