import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import jwtDecode from 'jwt-decode';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const STORAGE_KEY = 'timerapp_tasks_cache';
const SYNC_QUEUE_KEY = 'timerapp_sync_queue';

export default function App() {
  const [user, setUser] = useState(null);
  const [taskName, setTaskName] = useState('Write app flow');
  const [taskMinutes, setTaskMinutes] = useState(25);
  const [taskCategory, setTaskCategory] = useState('General');
  const [activeTask, setActiveTask] = useState(null);
  const [timerSec, setTimerSec] = useState(0);
  const [status, setStatus] = useState('idle');
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ success: 0, stopped: 0, focusScore: 0, streak: 0, totalFocusTime: 0 });
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [clockTime, setClockTime] = useState(new Date());
  const [distractionCount, setDistractionCount] = useState(0);
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'weekly', 'heatmap'
  const intervalRef = useRef(null);

  useEffect(() => {
    // Handle online/offline
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (window.google && !user) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('google-button'),
        {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with'
        }
      );
    }

    if (user) {
      loadFromCache();
      syncQueue();
      fetchTasks();
      fetchStats();
      fetchWeeklyStats();
      fetchHeatmapData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  useEffect(() => {
    if (status === 'running' && timerSec > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimerSec((current) => {
          if (current <= 1) {
            clearInterval(intervalRef.current);
            // Check for Pomodoro break (25 min = 1500 sec)
            if (activeTask.duration === 1500) {
              setShowBreakSuggestion(true);
            }
            endTask('success');
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    }
    return () => window.clearInterval(intervalRef.current);
  }, [status, timerSec, activeTask]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setClockTime(new Date()), 1000);
    return () => window.clearInterval(clockInterval);
  }, []);

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setTasks(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Cache load error:', error);
    }
  };

  const syncQueue = async () => {
    try {
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
      if (queue.length === 0) return;

      for (const item of queue) {
        try {
          await fetch('/api/tasks', {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.body),
          });
        } catch (error) {
          console.error('Sync error:', error);
          break;
        }
      }
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Queue sync error:', error);
    }
  };

  const fetchTasks = async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(`/api/tasks?userEmail=${user.email}`);
      const json = await res.json();
      const taskData = Array.isArray(json) ? json : [];
      setTasks(taskData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(taskData));
    } catch (error) {
      console.error('Fetch tasks error:', error);
      if (isOffline) {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) setTasks(JSON.parse(cached));
      }
    }
  };

  const fetchStats = async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(`/api/stats?userEmail=${user.email}`);
      const json = await res.json();
      setStats(json);
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const fetchWeeklyStats = async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(`/api/weekly?userEmail=${user.email}`);
      const json = await res.json();
      setWeeklyStats(json);
    } catch (error) {
      console.error('Fetch weekly error:', error);
    }
  };

  const fetchHeatmapData = async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(`/api/heatmap?userEmail=${user.email}&days=30`);
      const json = await res.json();
      setHeatmapData(json);
    } catch (error) {
      console.error('Fetch heatmap error:', error);
    }
  };

  const handleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    const decoded = jwtDecode(response.credential);
    const signedInUser = {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
      given_name: decoded.given_name,
      family_name: decoded.family_name,
      locale: decoded.locale,
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
    setShowBreakSuggestion(false);
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
      category: activeTask.category || 'General',
      distractioncount: distractionCount,
      completedAt: new Date().toISOString(),
      userEmail: user?.email,
    };

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      // Update cache
      const newTask = { ...payload, id: Date.now() };
      const updated = [...tasks, newTask];
      setTasks(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      await fetchTasks();
      await fetchStats();
      await fetchWeeklyStats();
      await fetchHeatmapData();
    } catch (error) {
      console.error('Error saving task:', error);
      // Queue for sync
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
      queue.push({ method: 'POST', body: payload });
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
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

  const recordDistraction = () => {
    setDistractionCount(prev => prev + 1);
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
      data: [stats.success || 0, stats.stopped || 0],
      backgroundColor: ['#6ac47f', '#ff6b6b'],
      borderRadius: 16,
      barThickness: 28,
    }],
  };

  const weeklyChartData = weeklyStats ? {
    labels: weeklyStats.daily.map(d => d.day),
    datasets: [{
      label: 'Daily Success Tasks',
      data: weeklyStats.daily.map(d => d.success),
      borderColor: '#6ac47f',
      backgroundColor: 'rgba(106, 196, 127, 0.1)',
      borderWidth: 2,
      fill: true,
    }]
  } : null;

  const categoryStats = stats.categoryStats || [];
  const categories = [
    { name: 'General', icon: '📋' },
    { name: 'Work', icon: '💼' },
    { name: 'Learning', icon: '📚' },
    { name: 'Exercise', icon: '🏃' },
    { name: 'Personal', icon: '👤' },
  ];

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <div>
            <h1>⏱️ Timer Manager</h1>
            <p className="subtitle">{`->`} Track, analyze, and master your focus time.</p>
            {isOffline && <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '4px' }}>📡 Offline Mode (will sync when online)</div>}
          </div>
        </div>
        <div className="sign-in-box">
          {user ? (
            <div className="profile-pill">
              <img src={user.picture} alt="profile" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              <div>
                <strong>{user.name}</strong>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{user.given_name}</div>
              </div>
            </div>
          ) : (
            <div id="google-button"></div>
          )}
        </div>
      </div>

      {user && (
        <div style={{ display: 'flex', gap: '10px', padding: '10px 20px', borderBottom: '1px solid #eee' }}>
          <button 
            onClick={() => setViewMode('dashboard')} 
            style={{ padding: '8px 16px', background: viewMode === 'dashboard' ? '#6ac47f' : '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            📊 Dashboard
          </button>
          <button 
            onClick={() => setViewMode('weekly')} 
            style={{ padding: '8px 16px', background: viewMode === 'weekly' ? '#6ac47f' : '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            📈 Weekly
          </button>
          <button 
            onClick={() => setViewMode('heatmap')} 
            style={{ padding: '8px 16px', background: viewMode === 'heatmap' ? '#6ac47f' : '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            🔥 Heatmap
          </button>
        </div>
      )}

      {viewMode === 'dashboard' && (
        <div className="card-grid">
          <section className="card main-card">
            <h2 className="section-title">Task + Timer Builder</h2>
            <div className="control-row">
              <input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Describe your next task"
              />
              <select 
                value={taskCategory} 
                onChange={(e) => setTaskCategory(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                max="240"
                value={taskMinutes}
                onChange={(e) => setTaskMinutes(Number(e.target.value))}
              />
            </div>
            <div className="control-row">
              <button onClick={startTask}>Start Timer</button>
              <button className="small-button" onClick={() => setTaskMinutes(25)}>Reset 25m</button>
            </div>

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
                    <dt>State</dt>
                    <dd>{status === 'running' ? 'Running' : status === 'paused' ? 'Paused' : status === 'finished' ? 'Finished' : 'Idle'}</dd>
                    <dt>Distractions</dt>
                    <dd>{distractionCount}</dd>
                  </dl>
                </div>
                <div className="timer-progress">
                  <div className="progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="control-row" style={{ marginTop: '20px', gap: '8px' }}>
                  <button onClick={pauseOrResume} disabled={!activeTask} style={{ flex: 1 }}>{status === 'paused' ? 'Resume' : 'Pause'}</button>
                  <button className="small-button" onClick={recordDistraction} disabled={!activeTask} style={{ padding: '8px 12px' }}>😵 +1 Dist</button>
                  <button className="small-button" onClick={stopTask} disabled={!activeTask}>Stop</button>
                </div>
              </div>
            </div>

            {showBreakSuggestion && (
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px', marginTop: '16px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>💡 Time for a break!</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>You've completed a 25-minute Pomodoro. Take a 5-minute break.</p>
                <button onClick={() => setShowBreakSuggestion(false)} style={{ marginTop: '8px', padding: '4px 12px', fontSize: '12px' }}>Got it</button>
              </div>
            )}
          </section>

          <section className="card chart-card">
            <h2 className="section-title">Overview</h2>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6ac47f' }}>{stats.focusScore}%</div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>Focus Score</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>🔥 {stats.streak || 0}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Day Streak</div>
              </div>
              <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.focusTimeMinutes || 0}m</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Total Focus</div>
              </div>
            </div>
            <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            <div className="stats-row">
              <div className="stat-box">
                <strong>{stats.success || 0}</strong>
                Completed
              </div>
              <div className="stat-box">
                <strong>{stats.stopped || 0}</strong>
                Stopped
              </div>
            </div>
          </section>

          <section className="card task-card">
            <h2 className="section-title">Recent Tasks</h2>
            <div className="task-list">
              {!Array.isArray(tasks) || tasks.length === 0 ? (
                <p className="feedback">No tasks saved yet — create one and complete a session.</p>
              ) : (
                tasks.slice(0, 8).map((task) => (
                  <div key={task.id} className={`task-item ${task.status === 'success' ? 'success' : task.status === 'stopped' ? 'stopped' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{task.name}</strong>
                      <span style={{ fontSize: '12px', opacity: 0.6 }}>{task.category || 'General'}</span>
                    </div>
                    <div className="task-meta">
                      <span>{formatTime(task.duration)}</span>
                      <span>{task.distractioncount > 0 ? `${task.distractioncount} 😵` : ''}</span>
                      <span>{task.status === 'success' ? 'Success' : task.status === 'stopped' ? 'Stopped' : 'Pending'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {categoryStats.length > 0 && (
            <section className="card">
              <h2 className="section-title">Category Breakdown</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                {categoryStats.map(cat => (
                  <div key={cat.name} style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{cat.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>{cat.success} / {cat.success + cat.stopped}</div>
                    <div style={{ fontSize: '12px', color: '#6ac47f', fontWeight: 'bold', marginTop: '4px' }}>{cat.focusScore}%</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {viewMode === 'weekly' && weeklyStats && (
        <div className="card-grid">
          <section className="card">
            <h2 className="section-title">Weekly Report</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6ac47f' }}>{weeklyStats.summary.totalTasks}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Tasks</div>
              </div>
              <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{weeklyStats.summary.focusScore}%</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Success Rate</div>
              </div>
              <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{weeklyStats.summary.totalFocusTimeMinutes}m</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Focus Time</div>
              </div>
              <div style={{ background: '#f3e5f5', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9c27b0' }}>{weeklyStats.summary.avgFocusScore}%</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Avg Score</div>
              </div>
            </div>
            {weeklyChartData && <Line data={weeklyChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />}
          </section>

          <section className="card">
            <h2 className="section-title">Daily Breakdown</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
              {weeklyStats.daily.map(day => (
                <div key={day.date} style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{day.day}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>{day.date}</div>
                  <div style={{ fontSize: '12px', margin: '8px 0 4px 0' }}>✅ {day.success}</div>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>❌ {day.stopped}</div>
                  <div style={{ fontSize: '12px', color: '#6ac47f', fontWeight: 'bold' }}>{day.focusScore}%</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {viewMode === 'heatmap' && heatmapData && (
        <div className="card-grid">
          <section className="card">
            <h2 className="section-title">Activity Heatmap (30 days)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '16px' }}>
              {Object.values(heatmapData.calendar).map((day, idx) => (
                <div
                  key={idx}
                  style={{
                    aspectRatio: '1',
                    background: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'][day.intensity],
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: day.intensity > 2 ? 'white' : 'black',
                    title: `${day.date}: ${day.count} tasks`
                  }}
                >
                  {day.count > 0 ? day.count : ''}
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="section-title">Peak Hours</h2>
            <div style={{ marginBottom: '16px' }}>
              <p><strong>Your peak hour:</strong> {heatmapData.insights.peakHour}:00 ({heatmapData.insights.peakHourActivity} tasks)</p>
              <p><strong>Active days (30d):</strong> {heatmapData.insights.totalDaysActive}</p>
              <p><strong>Avg tasks/day:</strong> {heatmapData.insights.avgTasksPerDay}</p>
            </div>
            <h3 style={{ marginBottom: '12px' }}>Hourly Success Rate</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '8px' }}>
              {heatmapData.hourly.filter((_, idx) => idx % 2 === 0).map(hour => (
                <div key={hour.hour} style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }}>
                  <div style={{ fontWeight: 'bold' }}>{hour.hour}:00</div>
                  <div style={{ color: '#6ac47f', fontWeight: 'bold' }}>{hour.successRate}%</div>
                  <div style={{ opacity: 0.7, fontSize: '11px' }}>{hour.taskCount} tasks</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
