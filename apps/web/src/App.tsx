import { useEffect, useState } from 'react';

import { Shell } from './components/Shell';
import { useAuth } from './lib/auth';
import { isUnlocked, passkeyEnabled } from './lib/passkey';
import { LoginPage, SettingsPage, UnlockPage } from './pages/Account';
import { onboardingDone, ProfileSetup } from './pages/ProfileSetup';
import { Dashboard } from './pages/Dashboard';
import { AnalyticsPage, ExportPage } from './pages/Insights';
import { ModuleScreen, ModulesHub } from './pages/ModuleScreen';
import { MODULES, type ModuleId } from './lib/api';

function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return path;
}

export default function App() {
  const { configured, loading, session, profile, profileReady, error } = useAuth();
  const path = usePath();
  const [unlocked, setUnlocked] = useState(isUnlocked() || !passkeyEnabled());
  const [setupDone, setSetupDone] = useState(false);

  if (!configured) {
    return <div className="center-screen"><p>Add the Supabase URL and anon key to apps/web/.env, then restart the web server.</p></div>;
  }
  if (loading || (session && !profileReady)) {
    return <div className="center-screen"><p>Loading account…</p></div>;
  }
  if (!session) return <LoginPage />;
  if (error && !profile) return <div className="center-screen"><p className="error">{error}</p></div>;
  if (session && !setupDone && !onboardingDone(session.user.id)) {
    return <ProfileSetup onDone={() => setSetupDone(true)} />;
  }
  if (passkeyEnabled() && !unlocked) return <UnlockPage onUnlock={() => setUnlocked(true)} />;

  const moduleId = path.startsWith('/modules/') ? path.slice('/modules/'.length) : '';
  const known = MODULES.some((item) => item.id === moduleId);

  return (
    <Shell path={known ? path : path}>
      {path === '/modules' ? <ModulesHub /> : null}
      {known ? <ModuleScreen moduleId={moduleId as ModuleId} /> : null}
      {path === '/analytics' ? <AnalyticsPage /> : null}
      {path === '/export' ? <ExportPage /> : null}
      {path === '/settings' ? <SettingsPage /> : null}
      {path === '/' || path === '' ? <Dashboard /> : null}
    </Shell>
  );
}
