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
    return handleUpdateTask(req, res);
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
  // optional fields
  const category = req.body.category;
  const distractioncount = req.body.distractioncount;
  const distractiontype = req.body.distractiontype;

  if (!name || !duration || !status || !userEmail) {
    return res.status(400).json({ error: 'Missing task payload' });
  }

  const now = new Date().toISOString();
  // Build insert object dynamically so we can retry without fields that don't exist in schema
  const baseObj = {
    name,
    duration,
    status,
    completedat: status === 'success' ? (completedAt || now) : null,
    createdat: now,
    useremail: userEmail,
  };
  if (category !== undefined) baseObj.category = category;
  if (distractioncount !== undefined) baseObj.distractioncount = distractioncount;
  if (distractiontype !== undefined) baseObj.distractiontype = distractiontype;

  try {
    // Lightweight de-duplication: if a very recent identical task exists, return it instead of inserting again
    try {
      const recentWindow = new Date(Date.now() - 15000).toISOString(); // 15s window
      const { data: dupCheck, error: dupErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('useremail', userEmail)
        .eq('name', name)
        .eq('duration', duration)
        .eq('status', status)
        .gte('createdat', recentWindow)
        .limit(1);
      if (dupErr) console.warn('Dup check error:', dupErr);
      if (dupCheck && dupCheck.length > 0) {
        const existing = dupCheck[0];
        return res.json({ id: existing.id, focusScore: status === 'success' ? 100 : 0 });
      }
    } catch (e) {
      console.warn('Duplication check failed, proceeding to insert', e);
    }

    // Try inserting with all provided fields first
    let resp = await supabase.from('tasks').insert([baseObj]).select();
    if (resp.error) {
      // If error mentions missing column(s), attempt to remove those keys and retry
      const errMsg = String(resp.error.message || resp.error.details || '');
      console.error('Insert error, trying fallback if possible:', errMsg);

      // detect missing column name in message (simple heuristic)
      const missingCols = [];
      const m = errMsg.match(/could not find the "?(\w+)"? column/gi) || errMsg.match(/column \"(\w+)\" of relation/gi);
      if (m) {
        // extract words that look like column names
        const colMatches = errMsg.match(/\"?(\w+)\"?/g) || [];
        colMatches.forEach(c => {
          const clean = c.replace(/\"/g, '');
          if (clean && baseObj.hasOwnProperty(clean)) missingCols.push(clean);
        });
      }

      if (missingCols.length > 0) {
        // remove missing columns and retry
        missingCols.forEach(c => delete baseObj[c]);
        const retry = await supabase.from('tasks').insert([baseObj]).select();
        if (retry.error) {
          console.error('Retry insert failed:', retry.error);
          return res.status(500).json({ error: retry.error.message || retry.error });
        }
        resp = retry;
      } else {
        // no missing column detected - return the original error
        return res.status(500).json({ error: resp.error.message || resp.error });
      }
    }

    const data = resp.data || [];
    return res.json({
      id: data[0]?.id || null,
      focusScore: status === 'success' ? 100 : 0
    });
  } catch (error) {
    console.error('Error saving task:', error);
    // surface the underlying error to caller for easier debugging
    return res.status(500).json({ error: String(error.message || error) });
  }
}

async function handleUpdateTask(req, res) {
  const { taskId, distractioncount, status, distractiontype } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: 'Missing taskId' });
  }

  try {
    const updateData = {};
    if (distractioncount !== undefined) updateData.distractioncount = distractioncount;
    if (status !== undefined) updateData.status = status;
    if (distractiontype !== undefined) updateData.distractiontype = distractiontype;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select();

    if (error) throw error;
    return res.json({ success: true, task: data[0] });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({ error: 'Unable to update task' });
  }
}
