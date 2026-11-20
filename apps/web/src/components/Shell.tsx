import { useMemo, useState, type ReactNode } from 'react';

import { MODULES } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Icon } from './ui';

export function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const LINKS = [
  { href: '/', label: 'Dashboard', icon: 'home' },
  { href: '/modules', label: 'Modules Hub', icon: 'grid_view' },
  { href: '/analytics', label: 'Analytics & Reports', icon: 'monitoring' },
  { href: '/export', label: 'Export & AI Hub', icon: 'ios_share' },
  { href: '/settings', label: 'Settings & Profile', icon: 'settings' },
];

export function Shell({ path, children }: { path: string; children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const name = profile?.full_name || user?.email || 'You';
  const matches = useMemo(
    () => MODULES.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6),
    [query],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">∞</div>
          <div>
            <strong>Lifestyle OS</strong>
            <span>Holistic Wellness</span>
          </div>
        </div>
        <div>
          <div className="nav-label">Main menu</div>
          {LINKS.map((link) => (
            <button key={link.href} className={path === link.href ? 'nav-btn active' : 'nav-btn'} onClick={() => navigate(link.href)}>
              <Icon name={link.icon} /> {link.label}
            </button>
          ))}
        </div>
        <div className="side-modules">
          <div className="nav-label">Modules · {MODULES.length} active</div>
          {MODULES.map((mod) => {
            const href = `/modules/${mod.id}`;
            return (
              <button key={mod.id} className={path === href ? 'side-link active' : 'side-link'} onClick={() => navigate(href)}>
                {mod.title}
              </button>
            );
          })}
        </div>
        <div className="sidebar-user">
          <div>
            <strong>{name}</strong>
            <div className="muted">Cloud synced</div>
          </div>
          <button onClick={() => void signOut()}>Log out</button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="search">
            <input
              value={query}
              placeholder="Search health metrics, logs, entries..."
              onChange={(event) => setQuery(event.target.value)}
            />
            {query.trim() ? (
              <div className="search-menu">
                {matches.length === 0 ? <p className="muted" style={{ padding: 8 }}>No modules found</p> : matches.map((item) => (
                  <button key={item.id} onClick={() => { setQuery(''); navigate(`/modules/${item.id}`); }}>{item.title}</button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="page-actions">
            <button className="primary" onClick={() => setLogOpen((open) => !open)}>Quick Log</button>
            <button className="ghost" onClick={() => navigate('/settings')}>{name.split(' ')[0]}</button>
          </div>
        </header>
        {logOpen ? (
          <div className="quick" style={{ padding: '12px 28px 0' }}>
            {[
              ['/modules/water', '+ Water'],
              ['/modules/fitness', '+ Workout'],
              ['/modules/nutrition', '+ Meal'],
              ['/modules/body', '+ Weight'],
              ['/modules/sleep', '+ Sleep'],
              ['/modules/supplements', '+ Stacks'],
            ].map(([href, label]) => (
              <button key={href} onClick={() => { setLogOpen(false); navigate(href); }}>{label}</button>
            ))}
          </div>
        ) : null}
        <main className="main">
          <div className="quick mobile-nav">
            {LINKS.map((link) => <button key={link.href} onClick={() => navigate(link.href)}>{link.label}</button>)}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
