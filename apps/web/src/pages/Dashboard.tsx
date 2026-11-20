import { useEffect, useState } from 'react';

import { loadToday, logWater, type TodaySnapshot } from '../lib/api';
import { useAuth } from '../lib/auth';
import { navigate } from '../components/Shell';

export function Dashboard() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<TodaySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!user) return;
    try {
      setData(await loadToday(user.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load today');
    }
  };

  useEffect(() => {
    void reload();
  }, [user]);

  const quickWater = async (amount: number) => {
    if (!user) return;
    setBusy(true);
    try {
      await logWater(user.id, amount);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log water');
    } finally {
      setBusy(false);
    }
  };

  const name = profile?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{hello}, {name}</h1>
          <p className="muted">{dateLabel} · All systems synced</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="quick">
        <button disabled={busy} onClick={() => void quickWater(250)}>+ Water 250 ml</button>
        <button onClick={() => navigate('/modules/fitness')}>+ Workout</button>
        <button onClick={() => navigate('/modules/nutrition')}>+ Meal</button>
        <button onClick={() => navigate('/modules/body')}>+ Weight</button>
        <button onClick={() => navigate('/modules/sleep')}>+ Sleep</button>
        <button onClick={() => navigate('/modules/supplements')}>+ Supplements</button>
      </div>
      <div className="grid grid-4">
        <article className="card">
          <div className="muted">Nutrition</div>
          <div className="stat-value">{data?.calories ?? '—'}</div>
          <div className="muted">/ {data?.calorieGoal ?? 2200} kcal</div>
          <p className="muted">P {data?.protein ?? 0}/{data?.proteinGoal ?? 0} · C {data?.carbs ?? 0}/{data?.carbGoal ?? 0} · F {data?.fat ?? 0}/{data?.fatGoal ?? 0}</p>
        </article>
        <article className="card">
          <div className="muted">Hydration</div>
          <div className="stat-value">{data ? (data.waterMl / 1000).toFixed(1) : '—'}</div>
          <div className="muted">/ {data ? (data.waterGoal / 1000).toFixed(1) : '3.0'} L</div>
          <div className="progress"><span style={{ width: `${Math.min(100, data ? (data.waterMl / data.waterGoal) * 100 : 0)}%` }} /></div>
        </article>
        <article className="card">
          <div className="muted">Sleep</div>
          <div className="stat-value">{data?.sleepLabel ?? '—'}</div>
          <div className="muted">{data?.workoutCount ?? 0} workouts today</div>
        </article>
        <article className="card">
          <div className="muted">Habits</div>
          <div className="stat-value">{data ? `${data.habitsDone}/${data.habitsTotal}` : '—'}</div>
          <div className="muted">Supplements {data?.supplementsDone ?? 0}/{data?.supplementsTotal ?? 0}</div>
        </article>
      </div>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <article className="card">
          <h2>Daily routines</h2>
          {(data?.habits ?? []).length === 0 ? <p className="muted">No habits yet.</p> : data?.habits.map((habit) => (
            <div className="list-row" key={habit.id}>
              <span>{habit.name}</span>
              <span className="muted">{habit.done ? 'Done' : 'Open'}</span>
            </div>
          ))}
          <button className="ghost" onClick={() => navigate('/modules/habits')}>Manage habits</button>
        </article>
        <article className="card">
          <h2>Active goals</h2>
          {(data?.goals ?? []).length === 0 ? <p className="muted">No active goals.</p> : data?.goals.map((goal) => (
            <div key={goal.id} style={{ marginBottom: 12 }}>
              <div className="list-row"><span>{goal.title}</span><span>{goal.pct}%</span></div>
              <div className="progress"><span style={{ width: `${goal.pct}%` }} /></div>
            </div>
          ))}
          <button className="ghost" onClick={() => navigate('/modules/goals')}>View all</button>
        </article>
      </div>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <article className="card">
          <h2>Modules status</h2>
          {data?.moduleStatus.map((item) => (
            <button key={item.id} className="list-row" onClick={() => navigate(`/modules/${item.id}`)} style={{ width: '100%' }}>
              <span>{item.detail}</span>
              <span className="muted">{item.state}</span>
            </button>
          ))}
        </article>
        <article className="card">
          <h2>Biometric vitals</h2>
          <div className="stat-value">{data?.heartRate ?? '—'} <span className="muted">bpm</span></div>
          <p className="muted">Blood pressure {data?.bloodPressure ?? '—'}</p>
          <button className="ghost" onClick={() => navigate('/modules/health')}>Log vitals</button>
        </article>
      </div>
    </>
  );
}
