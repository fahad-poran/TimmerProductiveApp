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
      .select('status')
      .eq('useremail', userEmail);

    if (error) throw error;

    const stats = { success: 0, stopped: 0 };
    data.forEach((task) => {
      if (task.status === 'success') stats.success++;
      if (task.status === 'stopped') stats.stopped++;
    });
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Unable to fetch stats' });
  }
}
