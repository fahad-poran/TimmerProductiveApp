import sqlite3 from 'sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Open SQLite database
const dbPath = join(__dirname, 'data', 'timers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Get all tasks from SQLite
db.all('SELECT * FROM tasks', [], async (err, rows) => {
  if (err) {
    console.error('Error reading from SQLite:', err);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('No data found in SQLite database');
    process.exit(0);
  }

  console.log(`Found ${rows.length} tasks to migrate`);
  console.log('Sample SQLite task:', rows[0]);

  let successCount = 0;
  let errorCount = 0;

  // Migrate each task
  for (const task of rows) {
    // Map SQLite to Supabase - using LOWERCASE column names
    const supabaseTask = {
      name: task.name,
      duration: task.duration,
      status: task.status,
      useremail: task.userEmail,  // SQLite has userEmail, Supabase needs useremail
      completedat: task.completedAt,  // SQLite has completedAt, Supabase needs completedat
      createdat: task.createdAt  // SQLite has createdAt, Supabase needs createdat
    };

    console.log(`Migrating task ${task.id}:`, supabaseTask);

    const { error } = await supabase
      .from('tasks')
      .insert([supabaseTask]);

    if (error) {
      console.error(`Error migrating task ${task.id}:`, error.message);
      errorCount++;
    } else {
      console.log(`✓ Migrated task ${task.id}`);
      successCount++;
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  
  db.close();
  process.exit(0);
});