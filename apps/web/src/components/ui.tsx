import type { ReactNode } from 'react';

export function Icon({ name }: { name: string }) {
  return <span className="icon">{name}</span>;
}

export function Crumb({ parts }: { parts: string[] }) {
  return <p className="crumb">{parts.join(' / ')}</p>;
}

export function PageTitle({
  kicker,
  title,
  copy,
  actions,
}: {
  kicker?: string;
  title: string;
  copy?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {kicker ? <div className="kicker">{kicker}</div> : null}
        <h1>{title}</h1>
        {copy ? <p className="muted">{copy}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab} role="tab" aria-selected={tab === value} onClick={() => onChange(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <article className="card stat-card">
      <div className="muted">{label}</div>
      <div className="stat-value">{value}</div>
      {detail ? <div className="muted">{detail}</div> : null}
    </article>
  );
}

export function Split({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="split">
      <div className="split-main">{left}</div>
      <div className="split-side">{right}</div>
    </div>
  );
}
