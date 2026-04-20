import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import jwtDecode from 'jwt-decode';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const CACHE_KEY = 'timerAppCache';
const SYNC_QUEUE_KEY = 'timerAppSyncQueue';
const CATEGORIES = ['General', 'Work', 'Study', 'Exercise', 'Creative', 'Personal'];

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

export default function App() {
  const [user, setUser] = useState(null);
  const [taskName, setTaskName] = useState('Write app flow');
  const [taskMinutes, setTaskMinutes] = useState(25);
  const [taskCategory, setTaskCategory] = useState('General');
  const [activeTask, setActiveTask] = useState(null);
  const [timerSec, setTimerSec] = useState(0);
  const [status, setStatus] = useState('idle');
  const [distractionCount, setDistractionCount] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ success: 0, stopped: 0, focusScore: 0, streak: 0, categoryBreakdown: {} });
  const [clockTime, setClockTime] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [pomodoroAlert, setPomodoroAlert] = useState('');
  const [syncQueue, setSyncQueue] = useLocalStorage(SYNC_QUEUE_KEY, []);
  const [offlineMode, setOfflineMode] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (window.google && !user) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-button'),
        { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with' }
      );
    }

    if (user) {
      fetchTasks();
      fetchStats();
      syncOfflineQueue();
    }
  }, [user]);

  useEffect(() => {
    if (status === 'running' && timerSec > 0) {
      const baseTime = taskMinutes * 60;
      const remaining = timerSec;

      // Pomodoro: alert when last 60 sec of a 25-min session
      if (taskMinutes === 25 && remaining < 60 && remaining > 0) {
        setPomodoroAlert('🎯 Pomodoro done! Take a 5-min break.');
      } else if (remaining >= baseTime - 1) {
        setPomodoroAlert('');
      }

      intervalRef.current = window.setInterval(() => {
        setTimerSec((current) => {
          if (current <= 1) {
            clearInterval(intervalRef.current);
            endTask('success');
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    }
    return () => window.clearInterval(intervalRef.current);
  }, [status, timerSec, taskMinutes]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setClockTime(new Date()), 1000);
    return () => window.clearInterval(clockInterval);
  }, []);

const fetchTasks = async () => {
  if (!user?.email) return;

  try {
    const res = await fetch(`/api/tasks?userEmail=${user.email}&category=${selectedCategory === 'All' ? '' : selectedCategory}`);
    const json = await res.json();
    setTasks(Array.isArray(json) ? json : []);
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(json));
  } catch (error) {
    console.warn('Offline mode: loading from cache', error);
    const cached = window.localStorage.getItem(CACHE_KEY);
    setTasks(cached ? JSON.parse(cached) : []);
    setOfflineMode(true);
  }
};

const fetchStats = async () => {
  if (!user?.email) return;

  try {
    const res = await fetch(`/api/stats?userEmail=${user.email}&category=${selectedCategory === 'All' ? '' : selectedCategory}`);
    const json = await res.json();
    setStats(json);
  } catch (error) {
    console.warn('Unable to fetch stats:', error);
  }
};

const syncOfflineQueue = async () => {
  if (syncQueue.length === 0) return;

  for (const task of syncQueue) {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
    } catch (error) {
      console.error('Sync failed for task:', task, error);
      return; // stop if sync fails
    }
  }
  setSyncQueue([]);
  setOfflineMode(false);
  fetchTasks();
  fetchStats();
};

  const handleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    const decoded = jwtDecode(response.credential);
    const signedInUser = {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
    };
    setUser(signedInUser);
    try {
      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
    } catch (error) {
      console.warn('Backend auth failed', error);
    }
  };

  const startTask = () => {
    if (!taskName.trim()) return;
    const duration = taskMinutes * 60;
    setActiveTask({ name: taskName.trim(), duration, status: 'running', category: taskCategory });
    setTimerSec(duration);
    setStatus('running');
    setDistractionCount(0);
    setTaskName('');
    setTaskMinutes(25);
  };

  const endTask = async (result) => {
    setStatus(result === 'success' ? 'finished' : 'stopped');
    if (!activeTask) return;

    const payload = {
      name: activeTask.name,
      duration: activeTask.duration,
      status: result,
      completedAt: new Date().toISOString(),
      userEmail: user?.email,
      category: activeTask.category,
      distractionCount
    };

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.warn('Saving to offline queue', error);
      setSyncQueue([...syncQueue, payload]);
    }
    setActiveTask(null);
  };

  const pauseOrResume = () => {
    if (status === 'running') {
      setStatus('paused');
      window.clearInterval(intervalRef.current);
    } else if (status === 'paused') {
      setStatus('running');
    }
  };

  const stopTask = () => {
    window.clearInterval(intervalRef.current);
    setTimerSec(0);
    endTask('stopped');
  };

  const progress = useMemo(() => {
    if (!activeTask) return 0;
    return Math.min(100, Math.round(((activeTask.duration - timerSec) / activeTask.duration) * 100));
  }, [activeTask, timerSec]);

  const seconds = clockTime.getSeconds();
  const minutes = clockTime.getMinutes();
  const hours = clockTime.getHours() % 12;

  const chartData = {
    labels: ['Success', 'Stopped'],
    datasets: [{
      label: 'Task outcomes',
      data: [stats.success, stats.stopped],
      backgroundColor: ['#6ac47f', '#ff6b6b'],
      borderRadius: 16,
      barThickness: 28,
    }],
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <div>
            <h1>Timer Manager</h1>
            <p className="subtitle">{`->`} Add tasks, run timers, pause, resume, and watch success rate rise.</p>
          </div>
        </div>
        <div className="sign-in-box">
          {user ? (
            <div className="profile-pill">
              <img src={user.picture} alt="profile" />
              <div>
                <strong>{user.name}</strong>
                <div>{user.email}</div>
              </div>
            </div>
          ) : (
            <div id="google-button"></div>
          )}
        </div>
      </div>

      <div className="card-grid">
        <section className="card main-card">
          <h2 className="section-title">Task + Timer Builder</h2>
          <div className="control-row">
            <input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Describe your next task"
            />
            <select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)}>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="control-row">
            <input
              type="number"
              min="1"
              max="240"
              value={taskMinutes}
              onChange={(e) => setTaskMinutes(Number(e.target.value))}
            />
            <button onClick={startTask}>Start Timer</button>
          </div>

          {pomodoroAlert && <div style={{ padding: '12px', background: '#ffd700', borderRadius: '12px', marginBottom: '12px', color: '#000' }}>{pomodoroAlert}</div>}
          {offlineMode && <div style={{ padding: '12px', background: '#ff9800', borderRadius: '12px', marginBottom: '12px', color: '#fff' }}>📡 Offline mode - changes will sync when online</div>}

          <div className="clock-panel">
            <div className="clock-card card">
              <div className="clock-frame">
                <div className="clock-center">
                  <div className="hour-hand" style={{ transform: `translateX(-50%) translateY(-100%) rotate(${hours * 30 + minutes * 0.5}deg)` }} />
                  <div className="minute-hand" style={{ transform: `translateX(-50%) translateY(-100%) rotate(${minutes * 6 + seconds * 0.1}deg)` }} />
                  <div className="second-hand" style={{ transform: `translateX(-50%) translateY(-100%) rotate(${seconds * 6}deg)` }} />
                  <div className="clock-dot" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="greeting">
                <h3>{activeTask ? activeTask.name : 'Ready to run your next timer'}</h3>
                <p className="feedback">{status === 'running' ? 'Timer is live. Keep focus and let the clock move.' : 'Add a task and start the countdown.'}</p>
              </div>
              <div className="timer-summary">
                <dl>
                  <dt>Remaining</dt>
                  <dd>{activeTask ? formatTime(timerSec) : '00:00'}</dd>
                  <dt>Distractions</dt>
                  <dd>{distractionCount}</dd>
                </dl>
              </div>
              <div className="timer-progress">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="control-row" style={{ marginTop: '20px' }}>
                <button onClick={pauseOrResume} disabled={!activeTask}>{status === 'paused' ? 'Resume' : 'Pause'}</button>
                <button className="small-button" onClick={() => { if (activeTask) setDistractionCount(d => d + 1); }}>😵 Distraction</button>
                <button className="small-button" onClick={stopTask} disabled={!activeTask}>Stop</button>
              </div>
            </div>
          </div>
        </section>

        <section className="card chart-card">
          <h2 className="section-title">Analytics</h2>
          <div style={{ marginBottom: '16px' }}>
            <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); fetchStats(); }}>
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          <div className="stats-row">
            <div className="stat-box">
              <strong>{stats.focusScore}%</strong>
              Focus Score
            </div>
            <div className="stat-box">
              <strong>{stats.streak}</strong>
              Day Streak
            </div>
          </div>
        </section>

        <section className="card task-card">
          <h2 className="section-title">Recent Tasks</h2>
          <div className="task-list">
            {!Array.isArray(tasks) || tasks.length === 0 ? (
              <p className="feedback">No tasks saved yet — create one and complete a session.</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className={`task-item ${task.status === 'success' ? 'success' : task.status === 'stopped' ? 'stopped' : ''}`}>
                  <strong>{task.name}</strong>
                  <div className="task-meta">
                    <span>{task.category}</span>
                    <span>{formatTime(task.duration)}</span>
                    <span>{task.status === 'success' ? '✓' : task.status === 'stopped' ? '✗' : '◯'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
