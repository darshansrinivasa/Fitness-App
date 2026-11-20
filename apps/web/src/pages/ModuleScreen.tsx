import { useEffect, useState, type FormEvent } from 'react';
import type { Food, Goal, WorkoutTemplate } from '@lifestyle-os/shared/sync';

import {
  addFood,
  addGoal,
  addHabit,
  addHairProduct,
  addRecord,
  addSupplement,
  checkInGoal,
  listFoods,
  listGoals,
  listHabits,
  listRecords,
  listSupplements,
  listTable,
  listTemplates,
  logBreakout,
  logHair,
  logMeal,
  logMeasurements,
  logSkin,
  logSleep,
  logSymptom,
  logVitals,
  logWater,
  logWeight,
  logWorkout,
  MODULES,
  saveTemplate,
  signedPhotoUrl,
  takeSupplement,
  toggleHabit,
  uploadPhoto,
  type ModuleId,
} from '../lib/api';
import { navigate } from '../components/Shell';
import { Crumb, PageTitle, Split, Stat, Tabs } from '../components/ui';
import { useAuth } from '../lib/auth';

const SCREENS: Record<ModuleId, { group: string; title: string; copy: string; tabs: string[] }> = {
  fitness: { group: 'Physical Health', title: 'Fitness & Workouts', copy: 'Manage resistance training, cardio sessions, personal records, and volume.', tabs: ["Today's Workout", 'History', 'Templates', 'Personal Records'] },
  nutrition: { group: 'Nutrition & Hydration', title: 'Nutrition & Macro Tracker', copy: 'Track daily calories, macros, and meal distribution.', tabs: ["Today's Meals", 'History', 'Food Database'] },
  water: { group: 'Nutrition & Hydration', title: 'Hydration & Fluid Balance', copy: 'Monitor daily water consumption and timing.', tabs: ["Today's Logs", 'Weekly Trends'] },
  sleep: { group: 'Recovery & Rest', title: 'Sleep Architecture & Recovery', copy: 'Log sleep duration, quality, and recent nights.', tabs: ['Night Architecture', 'History'] },
  habits: { group: 'Routines & Habits', title: 'Daily Habits & Streaks', copy: 'Build daily routines and mark what you finished.', tabs: ["Today's Checklist", 'History'] },
  body: { group: 'Physical Health', title: 'Anthropometrics & Body Composition', copy: 'Track weight and circumference measurements.', tabs: ['Weight & Vitals', 'Circumference'] },
  photos: { group: 'Physical Health', title: 'Progress Photos & Visual Composition', copy: 'Visual archives and side-by-side progress.', tabs: ['Timeline Gallery', 'Comparison'] },
  haircare: { group: 'Self-Care & Vitals', title: 'Haircare & Trichological Health', copy: 'Wash day, treatments, and products.', tabs: ['Routine Cadence', 'Products'] },
  skincare: { group: 'Self-Care & Vitals', title: 'Skincare Protocols & Barrier Health', copy: 'Morning and evening routines, plus breakouts.', tabs: ['Daily Rituals', 'Dermatology Log'] },
  supplements: { group: 'Self-Care & Vitals', title: 'Supplements & Protocols', copy: 'Dose timing, stacks, and stock.', tabs: ["Today's Schedule", 'Inventory'] },
  goals: { group: 'Strategy & Vision', title: 'Goals & Milestone Progression', copy: 'Targets, check-ins, and progress.', tabs: ['Active Goals', 'Check-in'] },
  health: { group: 'Clinical & Diagnostics', title: 'Health Records & Clinical Biomarkers', copy: 'Vitals, symptoms, and visit records.', tabs: ['Vitals', 'Documents'] },
};

export function ModuleScreen({ moduleId }: { moduleId: ModuleId }) {
  const { user } = useAuth();
  const meta = MODULES.find((item) => item.id === moduleId)!;
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [habits, setHabits] = useState<Array<{ id: string; name: string; done: boolean }>>([]);
  const [supplements, setSupplements] = useState<Array<Record<string, unknown> & { taken: boolean }>>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [photos, setPhotos] = useState<Array<{ url: string; date: string }>>([]);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState(SCREENS[moduleId].tabs[0]);
  useEffect(() => { setTab(SCREENS[moduleId].tabs[0]); }, [moduleId]);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      try {
        if (moduleId === 'nutrition') setFoods(await listFoods(user.id));
        if (moduleId === 'habits') setHabits(await listHabits(user.id));
        if (moduleId === 'supplements') setSupplements(await listSupplements(user.id) as Array<Record<string, unknown> & { taken: boolean }>);
        if (moduleId === 'goals') setGoals(await listGoals(user.id));
        if (moduleId === 'fitness') {
          setTemplates(await listTemplates(user.id));
          setRecords(await listRecords(user.id) as unknown as Record<string, unknown>[]);
          setRows(await listTable('workouts', user.id));
        }
        if (moduleId === 'photos') {
          const items = await listTable('progress_photos', user.id);
          const withUrls = await Promise.all(items.map(async (item) => ({
            url: (await signedPhotoUrl(String(item.storage_path))) ?? '',
            date: String(item.taken_date),
          })));
          setPhotos(withUrls.filter((item) => item.url));
        }
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

  const refresh = () => setTick((value) => value + 1);
  const act = async (work: () => Promise<void>) => {
    try {
      await work();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const screen = SCREENS[moduleId];
  const showLog = tab === screen.tabs[0] || tab === 'Check-in' || tab === 'Circumference' || tab === 'Products' || tab === 'Dermatology Log' || tab === 'Inventory' || tab === 'Documents';

  return (
    <>
      <Crumb parts={['Modules', screen.group, meta.title]} />
      <PageTitle kicker={screen.group} title={screen.title} copy={screen.copy} />
      <Tabs tabs={screen.tabs} value={tab} onChange={setTab} />
      {error ? <p className="error">{error}</p> : null}
      {user && showLog && moduleId === 'water' ? <WaterForm userId={user.id} act={act} rows={rows} /> : null}
      {user && showLog && moduleId === 'fitness' ? <FitnessForm userId={user.id} act={act} templates={templates} /> : null}
      {user && showLog && moduleId === 'nutrition' ? <NutritionForm userId={user.id} act={act} foods={foods} /> : null}
      {user && showLog && moduleId === 'sleep' ? <SleepForm userId={user.id} act={act} /> : null}
      {user && showLog && moduleId === 'habits' ? <HabitsForm userId={user.id} act={act} habits={habits} /> : null}
      {user && showLog && moduleId === 'body' ? <BodyForm userId={user.id} act={act} /> : null}
      {user && showLog && moduleId === 'photos' ? <PhotoForm userId={user.id} act={act} /> : null}
      {user && showLog && moduleId === 'haircare' ? <HairForm userId={user.id} act={act} /> : null}
      {user && showLog && moduleId === 'skincare' ? <SkinForm userId={user.id} act={act} /> : null}
      {user && showLog && moduleId === 'supplements' ? <SupplementForm userId={user.id} act={act} items={supplements} /> : null}
      {user && showLog && moduleId === 'goals' ? <GoalsForm userId={user.id} act={act} goals={goals} /> : null}
      {user && showLog && moduleId === 'health' ? <HealthForm userId={user.id} act={act} /> : null}

      {moduleId === 'fitness' ? (
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <History title="Templates" rows={templates.map((item) => ({ id: item.id, label: item.name, detail: `${item.exercises.length} exercises` }))} />
          <History title="Records" rows={records.map((item) => ({ id: String(item.id), label: String(item.exercise_name), detail: `${item.weight_kg} kg × ${item.reps}` }))} />
        </div>
      ) : null}
      {moduleId === 'photos' ? (
        <div className="photo-grid" style={{ marginTop: 12 }}>
          {photos.map((photo) => <img key={photo.url} src={photo.url} alt={photo.date} />)}
        </div>
      ) : null}
      {rows.length > 0 && moduleId !== 'water' ? (
        <article className="card" style={{ marginTop: 12 }}>
          <h2>Recent</h2>
          {rows.map((row) => (
            <div className="list-row" key={String(row.id)}>
              <span>{String(row.name ?? row.food_name ?? row.symptom ?? row.title ?? row.log_type ?? row.routine_type ?? row.amount_ml ?? row.weight_kg ?? row.sleep_date ?? 'Entry')}</span>
              <span className="muted">{String(row.logged_date ?? row.started_at ?? row.logged_at ?? row.created_at ?? '').slice(0, 16)}</span>
            </div>
          ))}
        </article>
      ) : null}
    </>
  );
}

function History({ title, rows }: { title: string; rows: Array<{ id: string; label: string; detail: string }> }) {
  return (
    <article className="card">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="muted">Nothing saved yet.</p> : rows.map((row) => (
        <div className="list-row" key={row.id}><span>{row.label}</span><span className="muted">{row.detail}</span></div>
      ))}
    </article>
  );
}

function WaterForm({ userId, act, rows }: { userId: string; act: (work: () => Promise<void>) => Promise<void>; rows: Array<Record<string, unknown>> }) {
  const [amount, setAmount] = useState('250');
  const [kind, setKind] = useState('Mineral Water (Still)');
  const total = rows.reduce((sum, row) => sum + Number(row.amount_ml ?? 0), 0);
  return (
    <Split
      left={<article className="card">
        <h2>Hourly Intake Timeline</h2>
        <p className="muted">{rows.length} logs</p>
        {rows.length === 0 ? <p className="muted">No drinks logged yet.</p> : rows.map((row) => (
          <div className="list-row" key={String(row.id)}><span>{String(row.amount_ml)} ml</span><span className="muted">{String(row.logged_at ?? '').slice(0, 16)}</span></div>
        ))}
      </article>}
      right={<article className="card">
        <Stat label="Volume recorded" value={`${total} ml`} detail="Today's logs on this page are the latest saved entries" />
        <h3 style={{ marginTop: 12 }}>Rapid Log Presets</h3>
        <div className="quick">
          {[200, 350, 500, 750].map((ml) => <button key={ml} onClick={() => void act(() => logWater(userId, ml))}>+{ml} ml</button>)}
        </div>
        <h3>Log Custom Fluid</h3>
        <form onSubmit={(event) => { event.preventDefault(); void act(() => logWater(userId, Number(amount))); }}>
          <div className="field"><label>Volume (ml)</label><input value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          <div className="field"><label>Beverage type</label>
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              {['Mineral Water (Still)', 'Sparkling Water', 'Electrolyte Drink', 'Herbal Tea', 'Coconut Water'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <button className="primary" type="submit">Record Fluid</button>
        </form>
      </article>}
    />
  );
}

function FitnessForm({ userId, act, templates }: { userId: string; act: (work: () => Promise<void>) => Promise<void>; templates: WorkoutTemplate[] }) {
  const [name, setName] = useState('Push Day');
  const [exercise, setExercise] = useState('Bench Press');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8');
  const [weight, setWeight] = useState('60');
  const draft = () => [{ exercise_name: exercise, sets: Number(sets), reps: Number(reps), weight_kg: Number(weight) }];
  return (
    <article className="card">
      <div className="field"><label>Workout</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div className="row">
        <input value={exercise} onChange={(event) => setExercise(event.target.value)} placeholder="Exercise" />
        <input value={sets} onChange={(event) => setSets(event.target.value)} placeholder="Sets" />
        <input value={reps} onChange={(event) => setReps(event.target.value)} placeholder="Reps" />
        <input value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="kg" />
      </div>
      <div className="quick" style={{ marginTop: 12 }}>
        <button className="primary" onClick={() => void act(() => logWorkout(userId, name, draft()))}>Finish workout</button>
        <button onClick={() => void act(() => saveTemplate(userId, name, draft()))}>Save template</button>
      </div>
      {templates.map((template) => (
        <button key={template.id} onClick={() => { setName(template.name); const first = template.exercises[0]; if (first) { setExercise(first.exercise_name); setSets(String(first.sets)); setReps(String(first.reps)); setWeight(String(first.weight_kg)); } }}>
          Use {template.name}
        </button>
      ))}
    </article>
  );
}

function NutritionForm({ userId, act, foods }: { userId: string; act: (work: () => Promise<void>) => Promise<void>; foods: Food[] }) {
  const [foodId, setFoodId] = useState(foods[0]?.id ?? '');
  const [qty, setQty] = useState('100');
  const [meal, setMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('100');
  useEffect(() => { if (!foodId && foods[0]) setFoodId(foods[0].id); }, [foodId, foods]);
  return (
    <div className="grid grid-2">
      <article className="card">
        <h2>Log meal</h2>
        <div className="field"><select value={foodId} onChange={(event) => setFoodId(event.target.value)}>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select></div>
        <div className="row">
          <input value={qty} onChange={(event) => setQty(event.target.value)} placeholder="grams" />
          <select value={meal} onChange={(event) => setMeal(event.target.value as typeof meal)}>
            <option>breakfast</option><option>lunch</option><option>dinner</option><option>snack</option>
          </select>
        </div>
        <button className="primary" onClick={() => {
          const food = foods.find((item) => item.id === foodId);
          if (food) void act(() => logMeal(userId, food, Number(qty), meal));
        }}>Add meal</button>
      </article>
      <article className="card">
        <h2>New food</h2>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
        <input value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="kcal / 100g" />
        <button onClick={() => void act(() => addFood(userId, { name, calories: Number(calories), protein: 0, carbs: 0, fat: 0 }))}>Save food</button>
      </article>
    </div>
  );
}

function SleepForm({ userId, act }: { userId: string; act: (work: () => Promise<void>) => Promise<void> }) {
  const [bed, setBed] = useState('23:00');
  const [wake, setWake] = useState('07:00');
  const [quality, setQuality] = useState('4');
  return (
    <article className="card">
      <div className="row">
        <input type="time" value={bed} onChange={(event) => setBed(event.target.value)} />
        <input type="time" value={wake} onChange={(event) => setWake(event.target.value)} />
        <input value={quality} onChange={(event) => setQuality(event.target.value)} placeholder="Quality 1-5" />
      </div>
      <button className="primary" onClick={() => void act(() => logSleep(userId, bed, wake, Number(quality)))}>Save sleep</button>
    </article>
  );
}

function HabitsForm({ userId, act, habits }: { userId: string; act: (work: () => Promise<void>) => Promise<void>; habits: Array<{ id: string; name: string; done: boolean }> }) {
  const [name, setName] = useState('');
  return (
    <article className="card">
      {habits.map((habit) => (
        <div className="list-row" key={habit.id}>
          <span>{habit.name}</span>
          <button onClick={() => void act(() => toggleHabit(userId, habit.id, !habit.done))}>{habit.done ? 'Undo' : 'Done'}</button>
        </div>
      ))}
      <form className="row" onSubmit={(event: FormEvent) => { event.preventDefault(); void act(async () => { await addHabit(userId, name); setName(''); }); }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Habit name" />
        <button className="primary" type="submit">Add habit</button>
      </form>
    </article>
  );
}

function BodyForm({ userId, act }: { userId: string; act: (work: () => Promise<void>) => Promise<void> }) {
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [hips, setHips] = useState('');
  const measure = () => ({
    ...(waist ? { waist_cm: Number(waist) } : {}),
    ...(chest ? { chest_cm: Number(chest) } : {}),
    ...(hips ? { hips_cm: Number(hips) } : {}),
  });
  return (
    <Split
      left={<article className="card"><h2>Recent weigh-ins</h2><p className="muted">Saved weight logs appear below this form.</p></article>}
      right={<article className="card">
        <h3>Record New Measurement</h3>
        <div className="field"><label>Weight (kg)</label><input value={weight} onChange={(event) => setWeight(event.target.value)} /></div>
        <div className="field"><label>Waist (cm)</label><input value={waist} onChange={(event) => setWaist(event.target.value)} /></div>
        <div className="field"><label>Chest (cm)</label><input value={chest} onChange={(event) => setChest(event.target.value)} /></div>
        <div className="field"><label>Hips (cm)</label><input value={hips} onChange={(event) => setHips(event.target.value)} /></div>
        <div className="quick">
          <button className="primary" onClick={() => void act(() => logWeight(userId, Number(weight)))}>Save weight</button>
          <button onClick={() => void act(() => logMeasurements(userId, measure()))}>Save measurements</button>
        </div>
      </article>}
    />
  );
}

function PhotoForm({ userId, act }: { userId: string; act: (work: () => Promise<void>) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<'front' | 'side' | 'back' | 'custom'>('front');
  return (
    <article className="card">
      <div className="row">
        <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <select value={angle} onChange={(event) => setAngle(event.target.value as typeof angle)}>
          <option>front</option><option>side</option><option>back</option><option>custom</option>
        </select>
      </div>
      <button className="primary" disabled={!file} onClick={() => file && void act(() => uploadPhoto(userId, file, angle))}>Upload photo</button>
    </article>
  );
}

function HairForm({ userId, act }: { userId: string; act: (work: () => Promise<void>) => Promise<void> }) {
  const [kind, setKind] = useState<'oil' | 'wash' | 'treatment' | 'trim' | 'note'>('wash');
  const [notes, setNotes] = useState('');
  const [product, setProduct] = useState('');
  return (
    <article className="card">
      <div className="row">
        <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
          <option>oil</option><option>wash</option><option>treatment</option><option>trim</option><option>note</option>
        </select>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
      </div>
      <div className="quick">
        <button className="primary" onClick={() => void act(() => logHair(userId, kind, notes))}>Log haircare</button>
      </div>
      <div className="row">
        <input value={product} onChange={(event) => setProduct(event.target.value)} placeholder="Product" />
        <button onClick={() => void act(() => addHairProduct(userId, product))}>Save product</button>
      </div>
    </article>
  );
}

function SkinForm({ userId, act }: { userId: string; act: (work: () => Promise<void>) => Promise<void> }) {
  const [routine, setRoutine] = useState<'morning' | 'night'>('morning');
  const [location, setLocation] = useState('chin');
  return (
    <article className="card">
      <div className="quick">
        <button className="primary" onClick={() => void act(() => logSkin(userId, routine, ''))}>Log {routine} routine</button>
        <button onClick={() => setRoutine(routine === 'morning' ? 'night' : 'morning')}>Switch to {routine === 'morning' ? 'night' : 'morning'}</button>
      </div>
      <div className="row">
        <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Breakout location" />
        <button onClick={() => void act(() => logBreakout(userId, location, 3))}>Log breakout</button>
      </div>
    </article>
  );
}

function SupplementForm({ userId, act, items }: { userId: string; act: (work: () => Promise<void>) => Promise<void>; items: Array<Record<string, unknown> & { taken: boolean }> }) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('500');
  const [unit, setUnit] = useState('mg');
  const [stock, setStock] = useState('');
  return (
    <article className="card">
      {items.map((item) => (
        <div className="list-row" key={String(item.id)}>
          <span>{String(item.name)} · {String(item.dose_amount)} {String(item.dose_unit)}{item.stock_quantity != null ? ` · ${item.stock_quantity} left` : ''}</span>
          <button disabled={item.taken} onClick={() => void act(() => takeSupplement(userId, { id: String(item.id), dose_amount: Number(item.dose_amount), stock_quantity: item.stock_quantity == null ? null : Number(item.stock_quantity), sync_version: Number(item.sync_version ?? 1) }))}>{item.taken ? 'Taken' : 'Take'}</button>
        </div>
      ))}
      <div className="row">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
        <input value={dose} onChange={(event) => setDose(event.target.value)} placeholder="Dose" />
        <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Unit" />
        <input value={stock} onChange={(event) => setStock(event.target.value)} placeholder="Stock" />
      </div>
      <button className="primary" onClick={() => void act(() => addSupplement(userId, { name, dose: Number(dose), unit, stock: stock ? Number(stock) : null }))}>Add supplement</button>
    </article>
  );
}

function GoalsForm({ userId, act, goals }: { userId: string; act: (work: () => Promise<void>) => Promise<void>; goals: Goal[] }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('10');
  const [check, setCheck] = useState<Record<string, string>>({});
  return (
    <article className="card">
      {goals.map((goal) => (
        <div className="list-row" key={goal.id}>
          <span>{goal.title}</span>
          <input style={{ maxWidth: 100 }} value={check[goal.id] ?? ''} onChange={(event) => setCheck({ ...check, [goal.id]: event.target.value })} placeholder="Value" />
          <button onClick={() => void act(() => checkInGoal(userId, goal, Number(check[goal.id])))}>Check in</button>
        </div>
      ))}
      <div className="row">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Goal" />
        <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Target" />
        <button className="primary" onClick={() => void act(() => addGoal(userId, { title, category: 'fitness', start: 0, target: Number(target), unit: '' }))}>Add goal</button>
      </div>
    </article>
  );
}

function HealthForm({ userId, act }: { userId: string; act: (work: () => Promise<void>) => Promise<void> }) {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heart, setHeart] = useState('');
  const [symptom, setSymptom] = useState('');
  const [title, setTitle] = useState('');
  return (
    <article className="card">
      <div className="row">
        <input value={systolic} onChange={(event) => setSystolic(event.target.value)} placeholder="Systolic" />
        <input value={diastolic} onChange={(event) => setDiastolic(event.target.value)} placeholder="Diastolic" />
        <input value={heart} onChange={(event) => setHeart(event.target.value)} placeholder="Heart rate" />
      </div>
      <button className="primary" onClick={() => void act(() => logVitals(userId, { systolic: num(systolic), diastolic: num(diastolic), heart: num(heart) }))}>Save vitals</button>
      <div className="row" style={{ marginTop: 12 }}>
        <input value={symptom} onChange={(event) => setSymptom(event.target.value)} placeholder="Symptom" />
        <button onClick={() => void act(() => logSymptom(userId, symptom, 3))}>Log symptom</button>
      </div>
      <div className="row">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Visit or lab title" />
        <button onClick={() => void act(() => addRecord(userId, title, 'visit'))}>Save record</button>
      </div>
    </article>
  );
}

function num(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value ? parsed : undefined;
}

const FILTERS = ['All Modules (12)', 'Physical Health', 'Nutrition & Hydration', 'Recovery & Rest', 'Routines & Habits', 'Self-Care & Vitals', 'Strategy & Vision', 'Clinical & Diagnostics'] as const;

export function ModulesHub() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All Modules (12)');
  const visible = MODULES.filter((item) => filter === 'All Modules (12)' || SCREENS[item.id].group === filter.replace(' (12)', ''));
  return (
    <>
      <PageTitle kicker="Ecosystem Overview · 12 Active Tracks" title="Modules Hub" copy="Explore, calibrate, and sync your 12 holistic lifestyle dimensions." />
      <div className="chips">
        {FILTERS.map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      {visible.length === 0 ? <p className="muted">No modules found. Reset the filter.</p> : (
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
