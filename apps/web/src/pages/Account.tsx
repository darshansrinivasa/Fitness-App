import { useState } from 'react';

import { PageTitle, Split } from '../components/ui';
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
        <div className="chip">Lifestyle OS</div>
        <h1>Lifestyle OS</h1>
        <p>The holistic operating system for your high-performance life. Fitness, nutrition, sleep, habits, and the rest of the day in one place.</p>
        <div>
          <div className="muted" style={{ color: '#c6c4df' }}>Unified Engine Modules</div>
          <div className="chip-row">{['Fitness', 'Nutrition', 'Sleep', 'Habits', 'Supplements', 'Health Records'].map((item) => <span className="chip" key={item}>{item}</span>)}</div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card card">
          <h2>Welcome to Lifestyle OS</h2>
          <p className="muted">Sign in to synchronize your logs with the phone app.</p>
          {error || localError ? <p className="error">{localError || error}</p> : null}
          <button className="primary" disabled={busy} onClick={() => {
            setBusy(true);
            void signInWithGoogle().catch((err: unknown) => {
              setLocalError(err instanceof Error ? err.message : 'Google sign-in failed');
              setBusy(false);
            });
          }}>Continue with Google</button>
          <button type="button" onClick={() => setLocalError('Passkey unlock is available after you sign in with Google on this browser.')}>Sign in with Passkey / WebAuthn</button>
          <p className="muted">or sign in with email</p>
          <form onSubmit={(event) => { event.preventDefault(); setLocalError('Email magic link is not enabled. Continue with Google.'); }}>
            <div className="field"><label>Work or personal email</label><input id="email" placeholder="name@company.com" /></div>
            <button type="submit">Continue with Magic Link</button>
          </form>
          <p className="muted">By continuing, you use the same private project as the phone app.</p>
        </div>
      </section>
    </div>
  );
}

export function UnlockPage({ onUnlock }: { onUnlock: () => void }) {
  const { profile, user, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="center-screen">
      <div className="card lock-card">
        <div className="kicker">Secure Session Lock</div>
        <h1>Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
        <p className="muted">{user?.email}</p>
        <h2>Touch ID or Passkey ready</h2>
        <p className="muted">Use this computer’s fingerprint, face, or device PIN to unlock the browser session.</p>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" onClick={() => {
          void import('../lib/passkey').then(({ unlockWithPasskey }) => unlockWithPasskey()).then(onUnlock).catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Unlock failed');
          });
        }}>Authenticate with Passkey</button>
        <button className="ghost" onClick={() => void signOut()}>Sign in with a different Google account</button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [section, setSection] = useState('Profile & Identity');
  const [name, setName] = useState(profile?.full_name ?? '');
  const [dob, setDob] = useState(profile?.date_of_birth ?? '');
  const [gender, setGender] = useState(profile?.gender ?? 'male');
  const [height, setHeight] = useState(profile?.height_cm ? String(profile.height_cm) : '');
  const [unit, setUnit] = useState(profile?.weight_unit ?? 'kg');
  const [waterUnit, setWaterUnit] = useState(profile?.water_unit ?? 'ml');
  const [message, setMessage] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(passkeyEnabled());
  const sections = ['Profile & Identity', 'Measurement Units', 'Passkey', 'Account'];

  const save = () => {
    if (!user) return;
    void updateProfile(user.id, {
      full_name: name,
      date_of_birth: dob || null,
      gender,
      height_cm: height ? Number(height) : null,
      weight_unit: unit,
      water_unit: waterUnit,
    }).then(() => refreshProfile()).then(() => setMessage('Saved.')).catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Save failed'));
  };

  return (
    <>
      <PageTitle kicker="Preferences Hub" title="Settings & Profile" copy="Manage your account, preferences, and measurement units." actions={<button className="primary" onClick={save}>Save All Changes</button>} />
      <Split
        left={<article className="card">
          <strong>{profile?.full_name || 'Profile'}</strong>
          <p className="muted">{user?.email}</p>
          {sections.map((item) => <button key={item} className={section === item ? 'nav-btn active' : 'nav-btn'} onClick={() => setSection(item)}>{item}</button>)}
        </article>}
        right={<div className="stack">
          {section === 'Profile & Identity' ? <form className="card" onSubmit={(event) => { event.preventDefault(); save(); }}>
            <h2>Personal Information</h2>
            <div className="field"><label>Full Legal / Preferred Name</label><input value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="field"><label>Primary Account Email</label><input value={user?.email ?? ''} readOnly /></div>
            <div className="field"><label>Date of Birth</label><input type="date" value={dob} onChange={(event) => setDob(event.target.value)} /></div>
            <div className="field"><label>Biological Marker / Gender</label>
              <div className="seg">{['male', 'female', 'other'].map((item) => <button type="button" key={item} aria-pressed={gender === item} onClick={() => setGender(item)}>{item}</button>)}</div>
            </div>
            <div className="field"><label>Standing Height (cm)</label><input value={height} onChange={(event) => setHeight(event.target.value)} /></div>
            {message ? <p className="muted">{message}</p> : null}
            <button className="primary" type="submit">Save Changes</button>
          </form> : null}
          {section === 'Measurement Units' ? <article className="card">
            <h2>Measurement & Unit Preferences</h2>
            <div className="field"><label>Weight Metric</label>
              <div className="seg">{['kg', 'lbs'].map((item) => <button key={item} type="button" aria-pressed={unit === item} onClick={() => setUnit(item)}>{item.toUpperCase()}</button>)}</div>
            </div>
            <div className="field"><label>Liquid Volume</label>
              <div className="seg">{['ml', 'oz'].map((item) => <button key={item} type="button" aria-pressed={waterUnit === item} onClick={() => setWaterUnit(item)}>{item.toUpperCase()}</button>)}</div>
            </div>
            <button className="primary" onClick={save}>Save Changes</button>
          </article> : null}
          {section === 'Passkey' ? <article className="card">
            <h2>Passkey unlock</h2>
            <p className="muted">{passkeySupported() ? 'Uses this computer’s fingerprint, face, or device PIN.' : 'This browser cannot create a platform passkey.'}</p>
            <p>{enabled ? 'Passkey is on for this browser.' : 'Passkey is off.'}</p>
            {enabled ? <button onClick={() => { disablePasskey(); setEnabled(false); }}>Turn off passkey</button> : (
              <button className="primary" disabled={!passkeySupported() || !user} onClick={() => {
                if (!user) return;
                void registerPasskey(user.id, profile?.full_name || user.email || 'Lifestyle OS').then(() => setEnabled(true)).catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Passkey failed'));
              }}>Create passkey</button>
            )}
          </article> : null}
          {section === 'Account' ? <article className="card">
            <h2>Account</h2>
            <p className="muted">Sign out of this browser. Account deletion is not available from the web app.</p>
            <button className="ghost" onClick={() => void signOut()}>Sign Out</button>
            <button onClick={() => { window.history.pushState({}, '', '/export'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Export Archive</button>
          </article> : null}
        </div>}
      />
    </>
  );
}
