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

  const { userEmail, range = '3m' } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'Missing userEmail' });
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('status, createdat, duration')
      .eq('useremail', userEmail);

    if (error) throw error;

    const heatmap = calculateHeatmap(data || [], range);
    return res.json(heatmap);
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return res.status(500).json({ error: 'Unable to fetch heatmap data' });
  }
}

function calculateHeatmap(tasks, range = '3m') {
  const rangeMs = getRangeInMs(range);
  const now = new Date();
  const startDate = new Date(now.getTime() - rangeMs);

  const heatmapData = {};
  const maxValue = { success: 0, minutes: 0 };

  const filteredTasks = tasks.filter((task) => {
    if (!task.createdat) return false;
    const taskDate = new Date(task.createdat);
    return taskDate >= startDate && taskDate <= now;
  });

  filteredTasks.forEach((task) => {
    const taskDate = new Date(task.createdat);
    const dateKey = taskDate.toISOString().split('T')[0];

    if (!heatmapData[dateKey]) {
      heatmapData[dateKey] = {
        date: dateKey,
        success: 0,
        stopped: 0,
        totalMinutes: 0,
        intensity: 0
      };
    }

    if (task.status === 'success') {
      heatmapData[dateKey].success++;
      heatmapData[dateKey].totalMinutes += Math.round(task.duration / 60);
      maxValue.minutes = Math.max(maxValue.minutes, heatmapData[dateKey].totalMinutes);
      maxValue.success = Math.max(maxValue.success, heatmapData[dateKey].success);
    } else {
      heatmapData[dateKey].stopped++;
    }
  });

  // Calculate intensity: 0-4 (based on success count or minutes)
  Object.values(heatmapData).forEach((day) => {
    if (maxValue.success > 0) {
      day.intensity = Math.ceil((day.success / maxValue.success) * 4);
    }
  });

  // Fill missing dates in range with 0 intensity
  const allDates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= now) {
    const dateKey = currentDate.toISOString().split('T')[0];
    if (!heatmapData[dateKey]) {
      heatmapData[dateKey] = {
        date: dateKey,
        success: 0,
        stopped: 0,
        totalMinutes: 0,
        intensity: 0
      };
    }
    allDates.push(dateKey);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    range,
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
    data: heatmapData,
    maxValue
  };
}

function getRangeInMs(range) {
  const rangeMap = {
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
    '3m': 90 * 24 * 60 * 60 * 1000,
    '6m': 180 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };
  return rangeMap[range] || rangeMap['3m'];
}
