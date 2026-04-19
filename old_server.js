import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Backend is running new 🚀');
});
const db = new sqlite3.Database('./data/timers.db', (err) => {
  if (err) {
    console.error('Unable to open database:', err);
    process.exit(1);
  }
});

const runDb = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve({ id: this.lastID, changes: this.changes });
  });
});

const allDb = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

runDb(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL,
    completedAt TEXT,
    createdAt TEXT NOT NULL
  )
`)
.catch((err) => {
  console.error('Failed to create tasks table:', err);
  process.exit(1);
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
    const rows = await allDb(
      'SELECT * FROM tasks WHERE userEmail = ? ORDER BY createdAt DESC',
      [userEmail]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch tasks' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const rows = await allDb(
  'SELECT status, COUNT(*) AS count FROM tasks WHERE userEmail = ? GROUP BY status',
  [userEmail]
);
    const stats = { success: 0, stopped: 0 };
    rows.forEach((row) => {
      if (row.status === 'success') stats.success = row.count;
      if (row.status === 'stopped') stats.stopped = row.count;
    });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch stats' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { name, duration, status, completedAt, userEmail } = req.body;

if (!name || !duration || !status || !userEmail) {
  return res.status(400).json({ error: 'Missing task payload' });
}


  try {
    const result = await runDb(
    `INSERT INTO tasks (name, duration, status, completedAt, createdAt, userEmail)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [name, duration, status, completedAt || null, new Date().toISOString(), userEmail]
  );
    res.json({ id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Unable to save task' });
  }
});

app.listen(port, () => {
  console.log(`Timer Manager backend listening at http://localhost:${port}`);
});
