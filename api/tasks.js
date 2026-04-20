import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGetTasks(req, res);
  }

  if (req.method === 'POST') {
    return handlePostTask(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetTasks(req, res) {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'Missing userEmail' });
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('useremail', userEmail)
      .order('createdat', { ascending: false });

    if (error) throw error;

    console.log('Data found:', data);
    console.log('Number of tasks:', data?.length || 0);

    return res.json(data);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ error: 'Unable to fetch tasks' });
  }
}

async function handlePostTask(req, res) {
  const { name, duration, status, completedAt, userEmail } = req.body;

  if (!name || !duration || !status || !userEmail) {
    return res.status(400).json({ error: 'Missing task payload' });
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          name,
          duration,
          status,
          completedat: completedAt || null,
          createdat: new Date().toISOString(),
          useremail: userEmail
        }
      ])
      .select();

    if (error) throw error;
    return res.json({ id: data[0].id });
  } catch (error) {
    console.error('Error saving task:', error);
    return res.status(500).json({ error: 'Unable to save task' });
  }
}
