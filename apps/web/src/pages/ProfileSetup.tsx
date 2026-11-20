import { useMemo, useState } from 'react';

import { saveBaseline, addGoal } from '../lib/api';
import { useAuth } from '../lib/auth';
import { updateProfile } from '../lib/supabase';

const SETUP_KEY = (userId: string) => `los-onboarding:${userId}`;

export function onboardingDone(userId: string): boolean {
  return localStorage.getItem(SETUP_KEY(userId)) === '1';
}

export function markOnboardingDone(userId: string): void {
  localStorage.setItem(SETUP_KEY(userId), '1');
}

function ageFrom(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const born = new Date(`${dob}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const month = now.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

function bmr(gender: string, kg: number, cm: number, age: number): number {
  const male = 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age;
  const female = 447.593 + 9.247 * kg + 3.098 * cm - 4.33 * age;
  if (gender === 'female') return Math.round(female);
  if (gender === 'male') return Math.round(male);
  return Math.round((male + female) / 2);
}

export function ProfileSetup({ onDone }: { onDone: () => void }) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const seeded = profile?.full_name || (typeof meta?.full_name === 'string' ? meta.full_name : typeof meta?.name === 'string' ? meta.name : '');
  const picture = typeof meta?.picture === 'string' ? meta.picture : typeof meta?.avatar_url === 'string' ? meta.avatar_url : '';
  const [name, setName] = useState(seeded);
  const [dob, setDob] = useState(profile?.date_of_birth ?? '');
  const [gender, setGender] = useState(profile?.gender ?? 'male');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [height, setHeight] = useState(profile?.height_cm ? String(profile.height_cm) : '');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>((profile?.weight_unit as 'kg' | 'lbs') || 'kg');
  const [weight, setWeight] = useState('');
  const [target, setTarget] = useState('');
  const [water, setWater] = useState('3000');
  const [calories, setCalories] = useState('2100');
  const [sleep, setSleep] = useState('8h 00m');
  const [avatar, setAvatar] = useState(picture);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const heightCm = useMemo(() => {
    const value = Number(height);
    if (!value) return null;
    return heightUnit === 'ft' ? Math.round(value * 30.48 * 10) / 10 : value;
  }, [height, heightUnit]);
  const toKg = (value: string) => {
    const parsed = Number(value);
    if (!parsed) return null;
    return weightUnit === 'lbs' ? Math.round((parsed / 2.20462) * 10) / 10 : parsed;
  };
  const weightKg = toKg(weight);
  const targetKg = toKg(target);
  const age = ageFrom(dob);
  const metabolic = heightCm && weightKg && age ? bmr(gender, weightKg, heightCm, age) : null;
  const deficit = metabolic && Number(calories) ? Number(calories) - Math.round(metabolic * 1.375) : null;

  const finish = async (skip: boolean) => {
    if (!user) return;
    if (!skip && !name.trim()) {
      setError('Enter your name to continue.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (name.trim()) {
        await updateProfile(user.id, {
          full_name: name.trim(),
          date_of_birth: dob || null,
          gender,
          height_cm: heightCm,
          weight_unit: weightUnit,
          ...(avatar.startsWith('http') ? { avatar_url: avatar } : {}),
        });
        await saveBaseline(user.id, { weightKg, waterMl: Number(water), calories: Number(calories) });
        if (targetKg) {
          await addGoal(user.id, { title: 'Target weight', category: 'body', start: weightKg ?? 0, target: targetKg, unit: 'kg' });
        }
      }
      if (sleep) localStorage.setItem('los-sleep-goal', sleep);
      markOnboardingDone(user.id);
      await refreshProfile();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
      setSaving(false);
    }
  };

  return (
    <div className="center-screen" style={{ display: 'block' }}>
      <div className="setup">
        <header className="setup-head">
          <div className="brand">
            <div className="logo">∞</div>
            <div><strong>Lifestyle OS</strong><span>Clinical Architecture</span></div>
          </div>
          <div className="muted">1 Personal Profile · Step 1 of 3</div>
          <button className="ghost" onClick={() => void signOut()}>Save & Exit</button>
        </header>
        <form className="card" onSubmit={(event) => { event.preventDefault(); void finish(false); }}>
          <div className="page-title">
            <div>
              <div className="kicker">Profile Configuration Phase</div>
              <h1>Set up your clinical & lifestyle baseline</h1>
              <p className="muted">Configure physiological parameters, targets, and measurement preferences. You can update these in Settings.</p>
            </div>
            <article className="card"><strong>Private account</strong><div className="muted">Saved to your Supabase project</div></article>
          </div>
          <div className="grid grid-2">
            <section>
              <h2>Personal Identity & Biometrics</h2>
              <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
                {avatar ? <img src={avatar} alt="" width={72} height={72} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : <div className="logo">?</div>}
                <div>
                  <strong>Profile Avatar</strong>
                  <div className="quick">
                    <label className="quick">Upload Headshot<input hidden type="file" accept="image/*" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setAvatar(URL.createObjectURL(file));
                    }} /></label>
                    <button type="button" onClick={() => picture && setAvatar(picture)}>Sync from Google Account</button>
                  </div>
                </div>
              </div>
              <div className="field"><label>Full Legal / Preferred Name</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div className="field"><label>Date of Birth {age != null ? `· ${age} years old` : ''}</label><input type="date" value={dob} onChange={(event) => setDob(event.target.value)} /></div>
              <div className="field"><label>Biological Sex / Phenotypic Profile</label>
                <div className="seg">
                  {[['male', 'Male'], ['female', 'Female'], ['other', 'Intersex / Other']].map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={gender === id} onClick={() => setGender(id)}>{label}</button>
                  ))}
                </div>
              </div>
              <p className="muted">Used for the metabolic estimate below.</p>
              <h3 style={{ margin: '12px 0' }}>Anthropometric Metrics</h3>
              <div className="grid grid-3">
                <div className="metric">
                  <div className="page-actions"><span className="muted">Height</span>
                    <div className="seg">{(['cm', 'ft'] as const).map((unit) => <button key={unit} type="button" aria-pressed={heightUnit === unit} onClick={() => setHeightUnit(unit)}>{unit.toUpperCase()}</button>)}</div>
                  </div>
                  <input value={height} onChange={(event) => setHeight(event.target.value)} />
                </div>
                <div className="metric">
                  <div className="page-actions"><span className="muted">Current</span>
                    <div className="seg">{(['kg', 'lbs'] as const).map((unit) => <button key={unit} type="button" aria-pressed={weightUnit === unit} onClick={() => setWeightUnit(unit)}>{unit.toUpperCase()}</button>)}</div>
                  </div>
                  <input value={weight} onChange={(event) => setWeight(event.target.value)} />
                </div>
                <div className="metric">
                  <span className="muted">Target</span>
                  <input value={target} onChange={(event) => setTarget(event.target.value)} />
                </div>
              </div>
            </section>
            <section>
              <h2>Daily Vital Targets & Preferences</h2>
              <div className="field"><label>Daily Hydration Target</label>
                <div className="chips">{[2500, 3000, 3500].map((ml) => <button key={ml} type="button" aria-pressed={water === String(ml)} onClick={() => setWater(String(ml))}>{ml.toLocaleString()} ml</button>)}</div>
                <input value={water} onChange={(event) => setWater(event.target.value)} />
              </div>
              <div className="field"><label>Daily Caloric Baseline {metabolic ? `· Est. TDEE ~${Math.round(metabolic * 1.375)} kcal` : ''}</label>
                <input value={calories} onChange={(event) => setCalories(event.target.value)} />
              </div>
              <div className="field"><label>Sleep Duration Goal</label><input value={sleep} onChange={(event) => setSleep(event.target.value)} /></div>
              <h3>Measurement Standardization</h3>
              <div className="grid grid-3">
                <article className="card"><div className="muted">Distance & Pace</div><strong>Metric (KM)</strong></article>
                <article className="card"><div className="muted">Fluid Intake</div><strong>Milliliters (ML)</strong></article>
                <article className="card"><div className="muted">Energy Standard</div><strong>Calories (KCAL)</strong></article>
              </div>
              <h3 style={{ marginTop: 12 }}>Active Core Modules · 6 of 6 Enabled</h3>
              <div className="chips">{['Fitness', 'Nutrition', 'Sleep', 'Habits', 'Supplements', 'Health Recs'].map((item) => <span className="card" key={item}>{item}</span>)}</div>
            </section>
          </div>
          <article className="card banner" style={{ marginTop: 12 }}>
            <div>
              <strong>Preliminary Basal Metabolic Rate (BMR): {metabolic ?? '—'} kcal</strong>
              <div className="muted">Harris-Benedict revised estimate from the height, weight, age, and sex entered here.</div>
            </div>
            <div className="muted">Target deficit: {deficit == null ? '—' : `${deficit} kcal/day`}</div>
          </article>
          {error ? <p className="error">{error}</p> : null}
          <footer className="setup-foot">
            <p className="muted">Name, body metrics, water goal, and calorie goal are saved to your account. Sleep goal stays on this browser.</p>
            <div className="page-actions">
              <button type="button" className="ghost" onClick={() => void finish(true)}>Skip for now</button>
              <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Complete Setup & Launch Lifestyle OS'}</button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
