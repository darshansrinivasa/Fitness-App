import { useEffect, useState } from 'react';

import { navigate } from '../components/Shell';
import { Stat } from '../components/ui';
import { loadToday, logWater, type TodaySnapshot } from '../lib/api';
import { useAuth } from '../lib/auth';

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

  useEffect(() => { void reload(); }, [user]);

  const name = profile?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const waterPct = data ? Math.min(100, Math.round((data.waterMl / data.waterGoal) * 100)) : 0;
  const kcalPct = data ? Math.min(100, Math.round((data.calories / data.calorieGoal) * 100)) : 0;
  const habitPct = data && data.habitsTotal ? Math.round((data.habitsDone / data.habitsTotal) * 100) : 0;

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{hello}, {name}</h1>
          <p className="muted">{dateLabel} · All systems synced</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <section className="card" style={{ marginBottom: 12 }}>
        <h2>Instant Logging Bar</h2>
        <div className="quick" style={{ marginTop: 12 }}>
          <button disabled={busy} onClick={() => {
            if (!user) return;
            setBusy(true);
            void logWater(user.id, 250).then(reload).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not log water')).finally(() => setBusy(false));
          }}>+ Water<span className="muted"> 250 ml tap</span></button>
          <button onClick={() => navigate('/modules/fitness')}>+ Workout<span className="muted"> Strength</span></button>
          <button onClick={() => navigate('/modules/nutrition')}>+ Meal<span className="muted"> Manual</span></button>
          <button onClick={() => navigate('/modules/body')}>+ Weight<span className="muted"> Scale</span></button>
          <button onClick={() => navigate('/modules/sleep')}>+ Sleep<span className="muted"> Nap or wake</span></button>
          <button onClick={() => navigate('/modules/supplements')}>+ Stacks<span className="muted"> Dose</span></button>
        </div>
      </section>
      <h2 style={{ margin: '8px 0' }}>Today at a Glance</h2>
      <div className="grid grid-4">
        <Stat label="Nutrition" value={`${data?.calories ?? '—'} / ${data?.calorieGoal ?? '—'}`} detail={`P ${data?.protein ?? 0}/${data?.proteinGoal ?? 0} · C ${data?.carbs ?? 0}/${data?.carbGoal ?? 0} · F ${data?.fat ?? 0}/${data?.fatGoal ?? 0} · ${kcalPct}%`} />
        <Stat label="Hydration" value={data ? `${(data.waterMl / 1000).toFixed(1)} / ${(data.waterGoal / 1000).toFixed(1)} L` : '—'} detail={`${waterPct}% · ${data ? Math.max(0, data.waterGoal - data.waterMl) : 0} ml to goal`} />
        <Stat label="Sleep" value={data?.sleepLabel ?? '—'} detail={`${data?.workoutCount ?? 0} workouts today`} />
        <Stat label="Habit velocity" value={data ? `${data.habitsDone} of ${data.habitsTotal}` : '—'} detail={`${habitPct}% done`} />
      </div>
      <div className="split" style={{ marginTop: 12 }}>
        <div className="stack">
          <article className="card">
            <div className="page-title">
              <div>
                <h2>Daily Routines & Habits</h2>
                <p className="muted">{data ? `${data.habitsDone}/${data.habitsTotal} completed` : 'Stay consistent'}</p>
              </div>
              <button className="ghost" onClick={() => navigate('/modules/habits')}>Add Habit</button>
            </div>
            {(data?.habits ?? []).length === 0 ? <p className="muted">No habits yet.</p> : data?.habits.map((habit) => (
              <div className="list-row" key={habit.id}>
                <span>{habit.name}</span>
                <span className="muted">{habit.done ? 'Done' : 'Open'}</span>
              </div>
            ))}
          </article>
          <article className="card">
            <div className="page-title">
              <div>
                <h2>Active Milestones & Goals</h2>
                <p className="muted">Progression towards the targets you saved</p>
              </div>
              <button className="ghost" onClick={() => navigate('/modules/goals')}>View All</button>
            </div>
            {(data?.goals ?? []).length === 0 ? <p className="muted">No active goals.</p> : data?.goals.map((goal) => (
              <div key={goal.id} style={{ marginBottom: 12 }}>
                <div className="list-row"><span>{goal.title}</span><span>{goal.pct}%</span></div>
                <div className="progress"><span style={{ width: `${goal.pct}%` }} /></div>
              </div>
            ))}
          </article>
        </div>
        <div className="stack">
          <article className="card">
            <h2>Modules Status</h2>
            {data?.moduleStatus.map((item) => (
              <button key={item.id} className="list-row" onClick={() => navigate(`/modules/${item.id}`)} style={{ width: '100%', border: 0, background: 'transparent' }}>
                <span>{item.detail}</span>
                <span className="muted">{item.state}</span>
              </button>
            ))}
            <button className="ghost" onClick={() => navigate('/modules')}>Explore All 12 Modules</button>
          </article>
          <article className="card">
            <h2>Biometric Vitals</h2>
            <div className="stat-value">{data?.heartRate ?? '—'} <span className="muted">bpm</span></div>
            <p className="muted">Blood pressure {data?.bloodPressure ?? '—'}</p>
            <button className="ghost" onClick={() => navigate('/modules/health')}>Log vitals</button>
          </article>
        </div>
      </div>
    </>
  );
}
