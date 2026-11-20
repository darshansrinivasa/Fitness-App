import { useState } from 'react';

import { saveBaseline } from '../lib/api';
import { useAuth } from '../lib/auth';
import { updateProfile } from '../lib/supabase';
import { disablePasskey, passkeyEnabled, passkeySupported, registerPasskey } from '../lib/passkey';

export function LoginPage() {
  const { signInWithGoogle, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div className="auth">
      <section className="auth-brand">
        <div className="logo">∞</div>
        <h1>Lifestyle OS</h1>
        <p>The holistic operating system for a high-performance life. Fitness, nutrition, sleep, and the rest of the day in one place.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card card">
          <h2>Sign in</h2>
          <p className="muted">Use the same Google account as the phone app. Your logs stay in the same private project.</p>
          {error || localError ? <p className="error">{localError || error}</p> : null}
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void signInWithGoogle().catch((err: unknown) => {
                setLocalError(err instanceof Error ? err.message : 'Google sign-in failed');
                setBusy(false);
              });
            }}
          >
            Continue with Google
          </button>
        </div>
      </section>
    </div>
  );
}

export function UnlockPage({ onUnlock }: { onUnlock: () => void }) {
  const { profile, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="center-screen">
      <div className="card lock-card">
        <div className="logo" style={{ margin: '0 auto 16px' }}>∞</div>
        <h1>Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
        <p className="muted">Unlock Lifestyle OS with the passkey saved on this computer.</p>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" onClick={() => {
          void import('../lib/passkey').then(({ unlockWithPasskey }) => unlockWithPasskey()).then(onUnlock).catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Unlock failed');
          });
        }}>Unlock with passkey</button>
        <button className="ghost" onClick={() => void signOut()}>Sign in with a different account</button>
      </div>
    </div>
  );
}

export function ProfileSetup() {
  const { user, refreshProfile, signOut } = useAuth();
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const seeded = typeof meta?.full_name === 'string' ? meta.full_name : typeof meta?.name === 'string' ? meta.name : '';
  const [name, setName] = useState(seeded);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [water, setWater] = useState('3000');
  const [calories, setCalories] = useState('2200');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="center-screen">
      <form
        className="card"
        style={{ width: 'min(720px, 100%)' }}
        onSubmit={(event) => {
          event.preventDefault();
          if (!user || !name.trim()) {
            setError('Enter your name to continue.');
            return;
          }
          if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
            setError('Use a valid date of birth.');
            return;
          }
          const heightCm = height ? Number(height) : null;
          const weightValue = weight ? Number(weight) : null;
          if (height && (!heightCm || heightCm <= 0)) {
            setError('Height must be a positive number.');
            return;
          }
          if (weight && (!weightValue || weightValue <= 0)) {
            setError('Weight must be a positive number.');
            return;
          }
          const weightKg = weightValue == null ? null : unit === 'lbs' ? Math.round((weightValue / 2.20462) * 10) / 10 : weightValue;
          setSaving(true);
          setError(null);
          void updateProfile(user.id, {
            full_name: name.trim(),
            date_of_birth: dob || null,
            gender,
            height_cm: heightCm,
            weight_unit: unit,
          })
            .then(() => saveBaseline(user.id, {
              weightKg,
              waterMl: Number(water),
              calories: Number(calories),
            }))
            .then(() => refreshProfile())
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : 'Could not save profile');
              setSaving(false);
            });
        }}
      >
        <h1>Set up your profile</h1>
        <p className="muted">This writes the same profile, weight, water goal, and calorie goal the phone app uses.</p>
        <div className="grid grid-2">
          <div className="field"><label>Name</label><input value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <div className="field"><label>Date of birth</label><input type="date" value={dob} onChange={(event) => setDob(event.target.value)} /></div>
          <div className="field">
            <label>Sex</label>
            <select value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field"><label>Height (cm)</label><input inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} /></div>
          <div className="field"><label>Current weight</label><input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} /></div>
          <div className="field">
            <label>Weight unit</label>
            <select value={unit} onChange={(event) => setUnit(event.target.value as 'kg' | 'lbs')}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
          <div className="field"><label>Daily water (ml)</label><input inputMode="numeric" value={water} onChange={(event) => setWater(event.target.value)} /></div>
          <div className="field"><label>Daily calories</label><input inputMode="numeric" value={calories} onChange={(event) => setCalories(event.target.value)} /></div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Continue'}</button>
        <button className="ghost" type="button" onClick={() => void signOut()}>Sign out</button>
      </form>
    </div>
  );
}

export function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [height, setHeight] = useState(profile?.height_cm ? String(profile.height_cm) : '');
  const [unit, setUnit] = useState(profile?.weight_unit ?? 'kg');
  const [message, setMessage] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(passkeyEnabled());

  return (
    <>
      <div className="topbar"><div><h1>Settings & Profile</h1><p className="muted">{user?.email}</p></div></div>
      <div className="grid grid-2">
        <form className="card" onSubmit={(event) => {
          event.preventDefault();
          if (!user) return;
          void updateProfile(user.id, { full_name: name, height_cm: height ? Number(height) : null, weight_unit: unit })
            .then(() => refreshProfile())
            .then(() => setMessage('Profile saved.'))
            .catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Save failed'));
        }}>
          <h2>Profile</h2>
          <div className="field"><label>Name</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="field"><label>Height (cm)</label><input value={height} onChange={(event) => setHeight(event.target.value)} /></div>
          <div className="field">
            <label>Weight unit</label>
            <select value={unit} onChange={(event) => setUnit(event.target.value)}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
          {message ? <p className="muted">{message}</p> : null}
          <button className="primary" type="submit">Save profile</button>
        </form>
        <article className="card">
          <h2>Passkey unlock</h2>
          <p className="muted">
            {passkeySupported()
              ? 'Uses this computer’s fingerprint, face, or device PIN. It locks the browser session, not a second account.'
              : 'This browser cannot create a platform passkey.'}
          </p>
          <p>{enabled ? 'Passkey is on for this browser.' : 'Passkey is off.'}</p>
          {enabled ? (
            <button onClick={() => { disablePasskey(); setEnabled(false); }}>Turn off passkey</button>
          ) : (
            <button
              className="primary"
              disabled={!passkeySupported() || !user}
              onClick={() => {
                if (!user) return;
                void registerPasskey(user.id, profile?.full_name || user.email || 'Lifestyle OS')
                  .then(() => setEnabled(true))
                  .catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Passkey failed'));
              }}
            >
              Create passkey
            </button>
          )}
          <button className="ghost" onClick={() => void signOut()}>Sign out</button>
        </article>
      </div>
    </>
  );
}
