import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { goalProgressPct, type Food, type Goal, type WorkoutTemplate } from '@lifestyle-os/shared/sync';

import { Split, Stat } from '../components/ui';
import {
  addFood,
  addGoal,
  addHabit,
  addHairProduct,
  addRecord,
  addSupplement,
  checkInGoal,
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
  saveTemplate,
  takeSupplement,
  toggleHabit,
  uploadPhoto,
} from '../lib/api';

type Row = Record<string, unknown>;
type Act = (work: () => Promise<void>) => Promise<void>;

export interface ModuleData {
  userId: string;
  act: Act;
  tab: string;
  rows: Row[];
  foods: Food[];
  habits: Array<{ id: string; name: string; done: boolean }>;
  supplements: Array<Row & { taken: boolean }>;
  goals: Goal[];
  templates: WorkoutTemplate[];
  records: Row[];
  photos: Array<{ url: string; date: string; angle: string }>;
  more: Row[];
}

function text(row: Row, key: string): string {
  const value = row[key];
  return value == null ? '' : String(value);
}

function when(row: Row): string {
  return text(row, 'logged_date') || text(row, 'started_at').slice(0, 16) || text(row, 'logged_at').slice(0, 16) || text(row, 'created_at').slice(0, 16);
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

export function ModuleBody({ id, data }: { id: string; data: ModuleData }) {
  if (id === 'fitness') return <Fitness data={data} />;
  if (id === 'nutrition') return <Nutrition data={data} />;
  if (id === 'water') return <Water data={data} />;
  if (id === 'sleep') return <Sleep data={data} />;
  if (id === 'habits') return <Habits data={data} />;
  if (id === 'body') return <Body data={data} />;
  if (id === 'photos') return <Photos data={data} />;
  if (id === 'haircare') return <Hair data={data} />;
  if (id === 'skincare') return <Skin data={data} />;
  if (id === 'supplements') return <Supplements data={data} />;
  if (id === 'goals') return <Goals data={data} />;
  return <Health data={data} />;
}

function Fitness({ data }: { data: ModuleData }) {
  const { userId, act, templates, records, rows, tab } = data;
  const [name, setName] = useState('Push Day');
  const [exercise, setExercise] = useState('Bench Press');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8');
  const [weight, setWeight] = useState('60');
  const draft = () => [{ exercise_name: exercise, sets: Number(sets), reps: Number(reps), weight_kg: Number(weight) }];
  const showLog = tab.startsWith('Today');
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Sessions" value={rows.length} detail="Saved workouts" />
        <Stat label="Templates" value={templates.length} detail="Ready to start" />
        <Stat label="Personal records" value={records.length} detail="Best logged sets" />
        <Stat label="Latest" value={text(rows[0] ?? {}, 'name') || '—'} detail={when(rows[0] ?? {}) || 'No session yet'} />
      </div>
      <Split
        left={showLog || tab === 'History' ? <article className="card">
          <div className="head-row"><div><h2>{showLog ? 'Exercise Breakdown & Sets' : 'History'}</h2><p className="muted">{rows.length} sessions</p></div></div>
          {showLog ? <div className="soft" style={{ marginBottom: 12 }}>
            <div className="field"><label>Workout</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="row">
              <input value={exercise} onChange={(event) => setExercise(event.target.value)} placeholder="Exercise" />
              <input value={sets} onChange={(event) => setSets(event.target.value)} placeholder="Sets" />
              <input value={reps} onChange={(event) => setReps(event.target.value)} placeholder="Reps" />
              <input value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="kg" />
            </div>
            <div className="quick" style={{ marginTop: 12 }}>
              <button className="primary" onClick={() => void act(() => logWorkout(userId, name, draft()))}>Finish Session</button>
              <button onClick={() => void act(() => saveTemplate(userId, name, draft()))}>Save template</button>
            </div>
          </div> : null}
          {rows.length === 0 ? <Empty>No workouts yet.</Empty> : rows.map((row) => (
            <div className="list-row" key={text(row, 'id')}><strong>{text(row, 'name')}</strong><span className="muted">{when(row)}</span></div>
          ))}
        </article> : <article className="card"><h2>{tab}</h2><Empty>Switch back to Today's Workout to log a session.</Empty></article>}
        right={<div className="stack">
          <article className="card">
            <div className="head-row"><h3>Personal Records</h3><span className="pill">1RM log</span></div>
            {records.length === 0 ? <Empty>No records yet.</Empty> : records.map((row) => (
              <div className="list-row" key={text(row, 'id')}><span>{text(row, 'exercise_name')}</span><strong>{text(row, 'weight_kg')} kg</strong></div>
            ))}
          </article>
          <article className="card">
            <div className="head-row"><h3>Workout Templates</h3><span className="muted">{templates.length}</span></div>
            {templates.length === 0 ? <Empty>Save a workout as a template.</Empty> : templates.map((template) => (
              <div className="list-row" key={template.id}>
                <span>{template.name}<div className="muted">{template.exercises.length} exercises</div></span>
                <button onClick={() => { setName(template.name); const first = template.exercises[0]; if (first) { setExercise(first.exercise_name); setSets(String(first.sets)); setReps(String(first.reps)); setWeight(String(first.weight_kg)); } }}>Start</button>
              </div>
            ))}
          </article>
        </div>}
      />
    </>
  );
}

function Nutrition({ data }: { data: ModuleData }) {
  const { userId, act, foods, rows } = data;
  const [foodId, setFoodId] = useState(foods[0]?.id ?? '');
  const [qty, setQty] = useState('100');
  const [meal, setMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('100');
  useEffect(() => { if (!foodId && foods[0]) setFoodId(foods[0].id); }, [foodId, foods]);
  const sum = (key: string) => Math.round(rows.reduce((total, row) => total + Number(row[key] ?? 0), 0));
  const groups = ['breakfast', 'lunch', 'snack', 'dinner'];
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Daily budget" value={`${sum('calories')} kcal`} detail="Consumed in the loaded meals" />
        <Stat label="Protein" value={`${sum('protein_g')} g`} />
        <Stat label="Carbohydrates" value={`${sum('carbs_g')} g`} />
        <Stat label="Fats" value={`${sum('fat_g')} g`} />
      </div>
      <Split
        left={<article className="card">
          <div className="head-row"><h2>Meal Timeline</h2><span className="muted">{rows.length} logged</span></div>
          {groups.map((group) => {
            const items = rows.filter((row) => text(row, 'meal_type') === group);
            return (
              <section key={group} style={{ marginBottom: 12 }}>
                <h3 style={{ textTransform: 'capitalize' }}>{group}</h3>
                {items.length === 0 ? <Empty>Nothing in {group}.</Empty> : items.map((row) => (
                  <div className="list-row" key={text(row, 'id')}><span>{text(row, 'food_name')}</span><span className="muted">{text(row, 'calories')} kcal</span></div>
                ))}
              </section>
            );
          })}
        </article>}
        right={<div className="stack">
          <article className="card">
            <h3>Macro Ratio</h3>
            <p className="muted">Protein {sum('protein_g')} g · Carbs {sum('carbs_g')} g · Fat {sum('fat_g')} g</p>
          </article>
          <article className="card">
            <h3>+ Log Meal</h3>
            <div className="field"><select value={foodId} onChange={(event) => setFoodId(event.target.value)}>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select></div>
            <div className="row">
              <input value={qty} onChange={(event) => setQty(event.target.value)} placeholder="grams" />
              <select value={meal} onChange={(event) => setMeal(event.target.value as typeof meal)}>
                <option>breakfast</option><option>lunch</option><option>dinner</option><option>snack</option>
              </select>
            </div>
            <button className="primary" onClick={() => { const food = foods.find((item) => item.id === foodId); if (food) void act(() => logMeal(userId, food, Number(qty), meal)); }}>Add meal</button>
          </article>
          <article className="card">
            <h3>Food Database</h3>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
            <input value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="kcal / serving" />
            <button onClick={() => void act(() => addFood(userId, { name, calories: Number(calories), protein: 0, carbs: 0, fat: 0 }))}>Save food</button>
            {foods.slice(0, 6).map((food) => <div className="list-row" key={food.id}><span>{food.name}</span><span className="muted">{food.calories_per_serving ?? 0} kcal</span></div>)}
          </article>
        </div>}
      />
    </>
  );
}

function Water({ data }: { data: ModuleData }) {
  const { userId, act, rows } = data;
  const [amount, setAmount] = useState('250');
  const total = rows.reduce((sum, row) => sum + Number(row.amount_ml ?? 0), 0);
  const goal = 3000;
  const pct = Math.min(100, Math.round((total / goal) * 100));
  return (
    <>
      <article className="card banner" style={{ marginBottom: 12 }}>
        <div><div className="pill">{pct}% achieved</div><h2>Volume recorded</h2><div className="stat-value">{total} / {goal} ml</div></div>
        <div className="quick">
          {[200, 350, 500, 750].map((ml) => <button key={ml} onClick={() => void act(() => logWater(userId, ml))}>+{ml} ml</button>)}
        </div>
      </article>
      <Split
        left={<article className="card">
          <div className="head-row"><h2>Hourly Intake Timeline</h2><span className="muted">{rows.length} logs</span></div>
          {rows.length === 0 ? <Empty>No drinks logged yet.</Empty> : rows.map((row) => (
            <div className="list-row" key={text(row, 'id')}><strong>{text(row, 'amount_ml')} ml</strong><span className="muted">{when(row)}</span></div>
          ))}
        </article>}
        right={<article className="card">
          <h3>Log Custom Fluid</h3>
          <form onSubmit={(event) => { event.preventDefault(); void act(() => logWater(userId, Number(amount))); }}>
            <div className="field"><label>Volume (ml)</label><input value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
            <button className="primary" type="submit">Record Fluid</button>
          </form>
          <div className="progress" style={{ marginTop: 16 }}><span style={{ width: `${pct}%` }} /></div>
        </article>}
      />
    </>
  );
}

function Sleep({ data }: { data: ModuleData }) {
  const { userId, act, rows } = data;
  const [bed, setBed] = useState('23:00');
  const [wake, setWake] = useState('07:00');
  const [quality, setQuality] = useState('4');
  const latest = rows[0];
  const minutes = Number(latest?.duration_minutes ?? 0);
  const label = minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—';
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Sleep duration" value={label} detail="Latest night" />
        <Stat label="Sleep quality" value={text(latest ?? {}, 'quality_rating') || '—'} detail="1–5" />
        <Stat label="Nights logged" value={rows.length} />
        <Stat label="Last night" value={text(latest ?? {}, 'sleep_date') || '—'} />
      </div>
      <Split
        left={<article className="card">
          <div className="head-row"><h2>Recent Sleep History</h2><button className="primary" onClick={() => void act(() => logSleep(userId, bed, wake, Number(quality)))}>+ Log Sleep</button></div>
          <div className="row" style={{ marginBottom: 12 }}>
            <input type="time" value={bed} onChange={(event) => setBed(event.target.value)} />
            <input type="time" value={wake} onChange={(event) => setWake(event.target.value)} />
            <input value={quality} onChange={(event) => setQuality(event.target.value)} placeholder="Quality 1-5" />
          </div>
          {rows.length === 0 ? <Empty>No sleep logs yet.</Empty> : rows.map((row) => (
            <div className="list-row" key={text(row, 'id')}><span>{text(row, 'sleep_date')}</span><span>{text(row, 'duration_minutes')} min · {text(row, 'quality_rating') || '—'}</span></div>
          ))}
        </article>}
        right={<article className="card"><h3>Evening note</h3><p className="muted">Duration is calculated from the bed and wake times you save. Stage charts appear when a device writes them. This log is manual.</p></article>}
      />
    </>
  );
}

function Habits({ data }: { data: ModuleData }) {
  const { userId, act, habits } = data;
  const [name, setName] = useState('');
  const done = habits.filter((habit) => habit.done).length;
  const pct = habits.length ? Math.round((done / habits.length) * 100) : 0;
  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: 12 }}>
        <Stat label="Daily completion" value={`${pct}%`} detail={`${done} of ${habits.length} habits`} />
        <Stat label="Open tonight" value={Math.max(0, habits.length - done)} />
        <article className="card"><p className="muted">Build the list, then mark each one done for today.</p></article>
      </div>
      <Split
        left={<article className="card">
          <div className="head-row"><h2>Today's Checklist</h2><span className="pill">{done} / {habits.length}</span></div>
          {habits.length === 0 ? <Empty>No habits yet.</Empty> : habits.map((habit) => (
            <div className="list-row" key={habit.id}><span>{habit.name}</span><button onClick={() => void act(() => toggleHabit(userId, habit.id, !habit.done))}>{habit.done ? 'Done' : 'Mark done'}</button></div>
          ))}
        </article>}
        right={<article className="card">
          <h3>+ Create New Habit</h3>
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); void act(async () => { await addHabit(userId, name); setName(''); }); }}>
            <div className="field"><label>Habit</label><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Habit name" /></div>
            <button className="primary" type="submit">Add habit</button>
          </form>
        </article>}
      />
    </>
  );
}

function Body({ data }: { data: ModuleData }) {
  const { userId, act, rows, more } = data;
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [hips, setHips] = useState('');
  const latest = rows[0];
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Current weight" value={text(latest ?? {}, 'weight_kg') || '—'} detail="Latest weigh-in" />
        <Stat label="Weigh-ins" value={rows.length} />
        <Stat label="Waist" value={text(more[0] ?? {}, 'waist_cm') || '—'} detail="Latest tape" />
        <Stat label="Chest" value={text(more[0] ?? {}, 'chest_cm') || '—'} />
      </div>
      <Split
        left={<article className="card">
          <h2>Recent Weigh-In Registry</h2>
          {rows.length === 0 ? <Empty>No weigh-ins yet.</Empty> : rows.map((row) => (
            <div className="list-row" key={text(row, 'id')}><span>{text(row, 'logged_date')}</span><strong>{text(row, 'weight_kg')} kg</strong></div>
          ))}
        </article>}
        right={<article className="card">
          <h3>Record New Measurement</h3>
          <div className="field"><label>Weight (kg)</label><input value={weight} onChange={(event) => setWeight(event.target.value)} /></div>
          <div className="field"><label>Waist (cm)</label><input value={waist} onChange={(event) => setWaist(event.target.value)} /></div>
          <div className="field"><label>Chest (cm)</label><input value={chest} onChange={(event) => setChest(event.target.value)} /></div>
          <div className="field"><label>Hips (cm)</label><input value={hips} onChange={(event) => setHips(event.target.value)} /></div>
          <div className="quick">
            <button className="primary" onClick={() => weight && void act(() => logWeight(userId, Number(weight)))}>Save weight</button>
            <button onClick={() => void act(() => logMeasurements(userId, { ...(waist ? { waist_cm: Number(waist) } : {}), ...(chest ? { chest_cm: Number(chest) } : {}), ...(hips ? { hips_cm: Number(hips) } : {}) }))}>Save tape</button>
          </div>
        </article>}
      />
    </>
  );
}

function Photos({ data }: { data: ModuleData }) {
  const { userId, act, photos } = data;
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<'front' | 'side' | 'back' | 'custom'>('front');
  const angles = ['front', 'side', 'back', 'custom'] as const;
  const visible = data.tab === 'Comparison' ? photos.slice(0, 2) : photos;
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Captured sets" value={photos.length} />
        <Stat label="Latest" value={photos[0]?.date || '—'} />
        <Stat label="Angles" value={new Set(photos.map((photo) => photo.angle)).size} />
        <Stat label="Vault" value="Private" detail="Signed links, one hour" />
      </div>
      <article className="card" style={{ marginBottom: 12 }}>
        <div className="head-row"><h2>{data.tab === 'Comparison' ? 'Side-by-Side' : 'Timeline Gallery'}</h2>
          <div className="row">
            <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <select value={angle} onChange={(event) => setAngle(event.target.value as typeof angle)}>{angles.map((item) => <option key={item}>{item}</option>)}</select>
            <button className="primary" disabled={!file} onClick={() => file && void act(() => uploadPhoto(userId, file, angle))}>Upload</button>
          </div>
        </div>
        {visible.length === 0 ? <Empty>No photos yet.</Empty> : <div className="photo-grid">{visible.map((photo) => <img key={photo.url} src={photo.url} alt={`${photo.angle} ${photo.date}`} />)}</div>}
      </article>
    </>
  );
}

function Hair({ data }: { data: ModuleData }) {
  const { userId, act, rows, more } = data;
  const [kind, setKind] = useState<'oil' | 'wash' | 'treatment' | 'trim' | 'note'>('wash');
  const [notes, setNotes] = useState('');
  const [product, setProduct] = useState('');
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Logs" value={rows.length} />
        <Stat label="Latest" value={text(rows[0] ?? {}, 'log_type') || '—'} />
        <Stat label="Products" value={more.length} />
        <Stat label="Last note" value={text(rows[0] ?? {}, 'notes') || '—'} />
      </div>
      <Split
        left={<article className="card">
          <h2>Routine Cadence</h2>
          <div className="row">
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
              <option>oil</option><option>wash</option><option>treatment</option><option>trim</option><option>note</option>
            </select>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
          </div>
          <button className="primary" onClick={() => void act(() => logHair(userId, kind, notes))}>Log Haircare Protocol</button>
          {rows.map((row) => <div className="list-row" key={text(row, 'id')}><span>{text(row, 'log_type')}</span><span className="muted">{text(row, 'notes')}</span></div>)}
        </article>}
        right={<article className="card">
          <h3>Product Rotation</h3>
          <div className="row"><input value={product} onChange={(event) => setProduct(event.target.value)} placeholder="Product" /><button onClick={() => void act(() => addHairProduct(userId, product))}>Save</button></div>
          {more.length === 0 ? <Empty>No products yet.</Empty> : more.map((row) => <div className="list-row" key={text(row, 'id')}><span>{text(row, 'name')}</span></div>)}
        </article>}
      />
    </>
  );
}

function Skin({ data }: { data: ModuleData }) {
  const { userId, act, rows, more } = data;
  const [location, setLocation] = useState('');
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Routine logs" value={rows.length} />
        <Stat label="Morning" value={rows.filter((row) => text(row, 'routine_type') === 'morning').length} />
        <Stat label="Night" value={rows.filter((row) => text(row, 'routine_type') === 'night').length} />
        <Stat label="Breakouts" value={more.length} />
      </div>
      <Split
        left={<div className="stack">
          <article className="card"><div className="head-row"><h2>Morning Barrier Defense</h2><button className="primary" onClick={() => void act(() => logSkin(userId, 'morning', ''))}>Log morning</button></div>{rows.filter((row) => text(row, 'routine_type') === 'morning').map((row) => <div className="list-row" key={text(row, 'id')}><span>{when(row)}</span></div>)}</article>
          <article className="card"><div className="head-row"><h2>Evening Cellular Renewal</h2><button onClick={() => void act(() => logSkin(userId, 'night', ''))}>Log evening</button></div>{rows.filter((row) => text(row, 'routine_type') === 'night').map((row) => <div className="list-row" key={text(row, 'id')}><span>{when(row)}</span></div>)}</article>
        </div>}
        right={<article className="card">
          <h3>Dermatology Log</h3>
          <div className="row"><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Breakout location" /><button onClick={() => location && void act(() => logBreakout(userId, location, 3))}>Log breakout</button></div>
          {more.map((row) => <div className="list-row" key={text(row, 'id')}><span>{text(row, 'location')}</span><span className="muted">{text(row, 'logged_date')}</span></div>)}
        </article>}
      />
    </>
  );
}

function Supplements({ data }: { data: ModuleData }) {
  const { userId, act, supplements } = data;
  const [name, setName] = useState('');
  const [dose, setDose] = useState('500');
  const [unit, setUnit] = useState('mg');
  const [stock, setStock] = useState('');
  const taken = supplements.filter((item) => item.taken).length;
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Daily protocol" value={`${taken} of ${supplements.length}`} detail="Taken today" />
        <Stat label="Active stacks" value={supplements.length} />
        <Stat label="Low stock" value={supplements.filter((item) => item.stock_quantity != null && Number(item.stock_quantity) < 10).length} />
        <Stat label="Remaining" value={Math.max(0, supplements.length - taken)} />
      </div>
      <Split
        left={<article className="card">
          <h2>Today's Schedule</h2>
          {supplements.length === 0 ? <Empty>No supplements yet.</Empty> : supplements.map((item) => (
            <div className="list-row" key={text(item, 'id')}>
              <span>{text(item, 'name')}<div className="muted">{text(item, 'dose_amount')} {text(item, 'dose_unit')}</div></span>
              <button disabled={item.taken} onClick={() => void act(() => takeSupplement(userId, { id: text(item, 'id'), dose_amount: Number(item.dose_amount), stock_quantity: item.stock_quantity == null ? null : Number(item.stock_quantity), sync_version: Number(item.sync_version ?? 1) }))}>{item.taken ? 'Taken' : 'Mark Taken'}</button>
            </div>
          ))}
        </article>}
        right={<article className="card">
          <h3>Inventory</h3>
          {supplements.map((item) => <div className="list-row" key={`${text(item, 'id')}-stock`}><span>{text(item, 'name')}</span><span className="muted">{item.stock_quantity == null ? '—' : `${item.stock_quantity} left`}</span></div>)}
          <div className="row">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
            <input value={dose} onChange={(event) => setDose(event.target.value)} placeholder="Dose" />
            <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Unit" />
            <input value={stock} onChange={(event) => setStock(event.target.value)} placeholder="Stock" />
          </div>
          <button className="primary" onClick={() => void act(() => addSupplement(userId, { name, dose: Number(dose), unit, stock: stock ? Number(stock) : null }))}>Add Supplement</button>
        </article>}
      />
    </>
  );
}

function Goals({ data }: { data: ModuleData }) {
  const { userId, act, goals } = data;
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('10');
  const [check, setCheck] = useState<Record<string, string>>({});
  const pct = (goal: Goal) => goalProgressPct({
    ...goal,
    start_value: goal.start_value == null ? null : Number(goal.start_value),
    target_value: goal.target_value == null ? null : Number(goal.target_value),
    current_value: goal.current_value == null ? null : Number(goal.current_value),
  });
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Active objectives" value={goals.length} />
        <Stat label="Average progress" value={goals.length ? `${Math.round(goals.reduce((sum, goal) => sum + pct(goal), 0) / goals.length)}%` : '—'} />
        <Stat label="Categories" value={new Set(goals.map((goal) => goal.category)).size} />
        <Stat label="Check-ins" value="Live" detail="Saved on the goal" />
      </div>
      <Split
        left={<article className="card">
          <h2>Active Strategic Objectives</h2>
          {goals.length === 0 ? <Empty>No active goals.</Empty> : goals.map((goal) => (
            <section key={goal.id} style={{ marginTop: 12 }}>
              <div className="head-row"><div><h3>{goal.title}</h3><p className="muted">{goal.category}</p></div><span className="pill">{pct(goal)}%</span></div>
              <div className="progress"><span style={{ width: `${pct(goal)}%` }} /></div>
              <div className="row" style={{ marginTop: 8 }}>
                <input value={check[goal.id] ?? ''} onChange={(event) => setCheck({ ...check, [goal.id]: event.target.value })} placeholder="Check-in value" />
                <button onClick={() => void act(() => checkInGoal(userId, goal, Number(check[goal.id])))}>Check in</button>
              </div>
            </section>
          ))}
        </article>}
        right={<article className="card">
          <h3>+ Create New Goal</h3>
          <div className="field"><label>Goal</label><input value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="field"><label>Target</label><input value={target} onChange={(event) => setTarget(event.target.value)} /></div>
          <button className="primary" onClick={() => void act(() => addGoal(userId, { title, category: 'fitness', start: 0, target: Number(target), unit: '' }))}>Create goal</button>
        </article>}
      />
    </>
  );
}

function Health({ data }: { data: ModuleData }) {
  const { userId, act, rows, more } = data;
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heart, setHeart] = useState('');
  const [symptom, setSymptom] = useState('');
  const [title, setTitle] = useState('');
  const latest = rows[0];
  const num = (value: string) => { const parsed = Number(value); return Number.isFinite(parsed) && value ? parsed : undefined; };
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 12 }}>
        <Stat label="Blood pressure" value={latest?.systolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp ?? '—'}` : '—'} />
        <Stat label="Heart rate" value={text(latest ?? {}, 'heart_rate_bpm') || '—'} detail="bpm" />
        <Stat label="Vitals logs" value={rows.length} />
        <Stat label="Records" value={more.length} />
      </div>
      <Split
        left={<article className="card">
          <h2>Vitals</h2>
          <div className="row">
            <input value={systolic} onChange={(event) => setSystolic(event.target.value)} placeholder="Systolic" />
            <input value={diastolic} onChange={(event) => setDiastolic(event.target.value)} placeholder="Diastolic" />
            <input value={heart} onChange={(event) => setHeart(event.target.value)} placeholder="Heart rate" />
          </div>
          <button className="primary" onClick={() => void act(() => logVitals(userId, { systolic: num(systolic), diastolic: num(diastolic), heart: num(heart) }))}>Save vitals</button>
          {rows.map((row) => <div className="list-row" key={text(row, 'id')}><span>{text(row, 'systolic_bp')}/{text(row, 'diastolic_bp')} · {text(row, 'heart_rate_bpm')} bpm</span><span className="muted">{when(row)}</span></div>)}
          <h3 style={{ marginTop: 16 }}>Symptoms</h3>
          <div className="row"><input value={symptom} onChange={(event) => setSymptom(event.target.value)} placeholder="Symptom" /><button onClick={() => symptom && void act(() => logSymptom(userId, symptom, 3))}>Log symptom</button></div>
        </article>}
        right={<article className="card">
          <h3>Clinical Documents</h3>
          <div className="row"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Visit or lab title" /><button onClick={() => title && void act(() => addRecord(userId, title, 'visit'))}>Save record</button></div>
          {more.length === 0 ? <Empty>No records yet.</Empty> : more.map((row) => <div className="list-row" key={text(row, 'id')}><span>{text(row, 'title') || text(row, 'symptom')}</span><span className="muted">{when(row)}</span></div>)}
        </article>}
      />
    </>
  );
}
