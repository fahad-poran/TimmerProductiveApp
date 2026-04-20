import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
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

  if (req.method === 'PATCH') {
    return handlePatchTask(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetTasks(req, res) {
  const { userEmail, category } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'Missing userEmail' });
  }

  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('useremail', userEmail)
      .order('createdat', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ error: 'Unable to fetch tasks' });
  }
}

async function handlePostTask(req, res) {
  const { name, duration, status, completedAt, userEmail, category = 'General', distractionCount = 0 } = req.body;

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
          useremail: userEmail,
          category,
          distractioncount: distractionCount
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

async function handlePatchTask(req, res) {
  const { id, userEmail, distractionCount } = req.body;

  if (!id || !userEmail) {
    return res.status(400).json({ error: 'Missing id or userEmail' });
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ distractioncount: distractionCount })
      .eq('id', id)
      .eq('useremail', userEmail)
      .select();

    if (error) throw error;
    return res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({ error: 'Unable to update task' });
  }
}
