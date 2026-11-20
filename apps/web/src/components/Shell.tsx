import type { ReactNode } from 'react';

import { MODULES } from '../lib/api';
import { useAuth } from '../lib/auth';

export function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function Shell({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  const { profile, user, signOut } = useAuth();
  const name = profile?.full_name || user?.email || 'You';
  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/modules', label: 'Modules Hub' },
    { href: '/analytics', label: 'Analytics & Reports' },
    { href: '/export', label: 'Export & AI Hub' },
    { href: '/settings', label: 'Settings & Profile' },
  ];

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
          {links.map((link) => (
            <button
              key={link.href}
              className={path === link.href ? 'nav-btn active' : 'nav-btn'}
              onClick={() => navigate(link.href)}
            >
              {link.label}
            </button>
          ))}
        </div>
        <div className="side-modules">
          <div className="nav-label">Modules · {MODULES.length} active</div>
          {MODULES.map((mod) => {
            const href = `/modules/${mod.id}`;
            return (
              <button
                key={mod.id}
                className={path === href ? 'side-link active' : 'side-link'}
                onClick={() => navigate(href)}
              >
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
      <main className="main">
        <div className="quick mobile-nav">
          {links.map((link) => (
            <button key={link.href} onClick={() => navigate(link.href)}>{link.label}</button>
          ))}
        </div>
        {children}
      </main>
    </div>
  );
}
