import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;
const allowedOrigins = [
  'http://localhost:3000',
  'https://timmer-productive-app.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID || 'default_client_id');

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'
    });
    const payload = ticket.getPayload();
    return res.json({ user: { email: payload.email, name: payload.name, picture: payload.picture } });
  } catch (error) {
    return res.status(401).json({ error: 'Unable to verify Google sign-in' });
  }
});

app.get('/api/tasks', async (req, res) => {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'Missing userEmail' });
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
       .eq('useremail', userEmail)  // lowercase
  .order('createdat', { ascending: false });  // lowercase

    if (error) throw error;

    console.log('Data found:', data);
    console.log('Number of tasks:', data?.length || 0);

    res.json(data);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Unable to fetch tasks' });
  }
});

app.get('/api/stats', async (req, res) => {
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
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Unable to fetch stats' });
  }
});

app.post('/api/tasks', async (req, res) => {
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
           completedat: completedAt || null,  // lowercase
      createdat: new Date().toISOString(),  // lowercase
      useremail: userEmail  // lowercase
        }
      ])
      .select();

    if (error) throw error;
    res.json({ id: data[0].id });
  } catch (error) {
    console.error('Error saving task:', error);
    res.status(500).json({ error: 'Unable to save task' });
  }
});

app.listen(port, () => {
  console.log(`Timer Manager backend listening at http://localhost:${port}`);
});