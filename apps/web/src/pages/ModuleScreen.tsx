import { useEffect, useState } from 'react';
import type { Food, Goal, WorkoutTemplate } from '@lifestyle-os/shared/sync';

import {
  listFoods,
  listGoals,
  listHabits,
  listRecords,
  listSupplements,
  listTable,
  listTemplates,
  MODULES,
  signedPhotoUrl,
  type ModuleId,
} from '../lib/api';
import { navigate } from '../components/Shell';
import { Crumb, PageTitle, Tabs } from '../components/ui';
import { useAuth } from '../lib/auth';
import { ModuleBody, type ModuleData } from './moduleViews';

const SCREENS: Record<ModuleId, { group: string; title: string; copy: string; tabs: string[] }> = {
  fitness: { group: 'Physical Health', title: 'Fitness & Workouts', copy: 'Manage resistance training, cardio sessions, personal records, and volume.', tabs: ["Today's Workout", 'History', 'Templates', 'Personal Records'] },
  nutrition: { group: 'Nutrition & Hydration', title: 'Nutrition & Macro Tracker', copy: 'Track daily calories, macros, and meal distribution.', tabs: ["Today's Meals", 'History', 'Food Database'] },
  water: { group: 'Nutrition & Hydration', title: 'Hydration & Fluid Balance', copy: 'Monitor daily water consumption and timing.', tabs: ["Today's Logs", 'Weekly Trends'] },
  sleep: { group: 'Recovery & Rest', title: 'Sleep Architecture & Recovery', copy: 'Log sleep duration, quality, and recent nights.', tabs: ['Night Architecture', 'History'] },
  habits: { group: 'Routines & Habits', title: 'Daily Habits & Streaks', copy: 'Build daily routines and mark what you finished.', tabs: ["Today's Checklist"] },
  body: { group: 'Physical Health', title: 'Anthropometrics & Body Composition', copy: 'Track weight and circumference measurements.', tabs: ['Weight & Vitals', 'Circumference'] },
  photos: { group: 'Physical Health', title: 'Progress Photos & Visual Composition', copy: 'Visual archives and side-by-side progress.', tabs: ['Timeline Gallery', 'Comparison'] },
  haircare: { group: 'Self-Care & Vitals', title: 'Haircare & Trichological Health', copy: 'Wash day, treatments, and products.', tabs: ['Routine Cadence', 'Products'] },
  skincare: { group: 'Self-Care & Vitals', title: 'Skincare Protocols & Barrier Health', copy: 'Morning and evening routines, plus breakouts.', tabs: ['Daily Rituals', 'Dermatology Log'] },
  supplements: { group: 'Self-Care & Vitals', title: 'Supplements & Protocols', copy: 'Dose timing, stacks, and stock.', tabs: ["Today's Schedule", 'Inventory'] },
  goals: { group: 'Strategy & Vision', title: 'Goals & Milestone Progression', copy: 'Targets, check-ins, and progress.', tabs: ['Active Goals'] },
  health: { group: 'Clinical & Diagnostics', title: 'Health Records & Clinical Biomarkers', copy: 'Vitals, symptoms, and visit records.', tabs: ['Vitals', 'Documents'] },
};

const FILTERS = ['All Modules (12)', 'Physical Health', 'Nutrition & Hydration', 'Recovery & Rest', 'Routines & Habits', 'Self-Care & Vitals', 'Strategy & Vision', 'Clinical & Diagnostics'] as const;

export function ModuleScreen({ moduleId }: { moduleId: ModuleId }) {
  const { user } = useAuth();
  const meta = MODULES.find((item) => item.id === moduleId)!;
  const screen = SCREENS[moduleId];
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ModuleData['rows']>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [habits, setHabits] = useState<ModuleData['habits']>([]);
  const [supplements, setSupplements] = useState<ModuleData['supplements']>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [records, setRecords] = useState<ModuleData['records']>([]);
  const [photos, setPhotos] = useState<ModuleData['photos']>([]);
  const [more, setMore] = useState<ModuleData['more']>([]);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState(screen.tabs[0]);
  useEffect(() => { setTab(SCREENS[moduleId].tabs[0]); }, [moduleId]);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      try {
        if (moduleId === 'nutrition') setFoods(await listFoods(user.id));
        if (moduleId === 'habits') setHabits(await listHabits(user.id));
        if (moduleId === 'supplements') setSupplements(await listSupplements(user.id) as ModuleData['supplements']);
        if (moduleId === 'goals') setGoals(await listGoals(user.id));
        if (moduleId === 'fitness') {
          setTemplates(await listTemplates(user.id));
          setRecords(await listRecords(user.id) as unknown as ModuleData['records']);
          setRows(await listTable('workouts', user.id));
        }
        if (moduleId === 'photos') {
          const items = await listTable('progress_photos', user.id);
          const withUrls = await Promise.all(items.map(async (item) => ({
            url: (await signedPhotoUrl(String(item.storage_path))) ?? '',
            date: String(item.taken_date ?? ''),
            angle: String(item.angle ?? ''),
          })));
          setPhotos(withUrls.filter((item) => item.url));
        }
        if (moduleId === 'body') setMore(await listTable('body_measurements', user.id));
        if (moduleId === 'haircare') setMore(await listTable('haircare_products', user.id));
        if (moduleId === 'skincare') setMore(await listTable('breakout_logs', user.id));
        if (moduleId === 'health') setMore(await listTable('medical_records', user.id));
        const table = {
          water: 'water_logs',
          sleep: 'sleep_logs',
          body: 'weight_logs',
          haircare: 'haircare_logs',
          skincare: 'skincare_logs',
          health: 'vitals_logs',
          nutrition: 'meal_logs',
        }[moduleId as string];
        if (table) setRows(await listTable(table, user.id));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load module');
      }
    };
    void run();
  }, [moduleId, tick, user]);

  const act: ModuleData['act'] = async (work) => {
    try {
      await work();
      setTick((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (!user) return null;
  return (
    <>
      <Crumb parts={['Modules', screen.group, meta.title]} />
      <PageTitle kicker={screen.group} title={screen.title} copy={screen.copy} />
      <Tabs tabs={screen.tabs} value={tab} onChange={setTab} />
      {error ? <p className="error">{error}</p> : null}
      <ModuleBody id={moduleId} data={{ userId: user.id, act, tab, rows, foods, habits, supplements, goals, templates, records, photos, more }} />
    </>
  );
}

export function ModulesHub() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All Modules (12)');
  const visible = MODULES.filter((item) => filter === 'All Modules (12)' || SCREENS[item.id].group === filter);
  return (
    <>
      <PageTitle kicker="Ecosystem Overview · 12 Active Tracks" title="Modules Hub" copy="Explore, calibrate, and sync your 12 holistic lifestyle dimensions." />
      <div className="chips">
        {FILTERS.map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      {visible.length === 0 ? <p className="muted">No modules found.</p> : (
        <div className="grid grid-3">
          {visible.map((item) => (
            <button key={item.id} className="card" onClick={() => navigate(`/modules/${item.id}`)}>
              <div className="muted">{SCREENS[item.id].group}</div>
              <h2>{item.title}</h2>
              <p className="muted">{item.blurb}</p>
              <p className="muted">Open Module</p>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
