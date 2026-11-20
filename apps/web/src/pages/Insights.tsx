import { useState } from 'react';
import type { DateRangePreset, ExportFormat, LifestyleExport, ReportPeriod } from '@lifestyle-os/shared';

import { PageTitle, Split, Stat, Tabs } from '../components/ui';
import { analyticsSummary, buildExport, renderExport } from '../lib/api';
import { useAuth } from '../lib/auth';

const RANGES: Array<{ id: DateRangePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'quarter', label: 'Last Quarter' },
];

const FORMATS: Array<{ id: ExportFormat; label: string; ext: string }> = [
  { id: 'json', label: 'JSON Data', ext: '.json' },
  { id: 'markdown', label: 'Markdown Summary', ext: '.md' },
  { id: 'pdf', label: 'PDF Comprehensive', ext: '.html' },
  { id: 'chatgpt', label: 'GPT-Optimized', ext: '.md' },
];

export function AnalyticsPage() {
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [cards, setCards] = useState<Array<{ label: string; headline: string; detail: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async (next: ReportPeriod) => {
    if (!user) return;
    setPeriod(next);
    try {
      const preset = next === 'daily' ? 'today' : next === 'weekly' ? 'week' : 'month';
      const data = await buildExport(user.id, preset, profilePayload(profile?.full_name, profile?.height_cm, profile?.weight_unit));
      setCards(analyticsSummary(next, data).modules);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build report');
    }
  };

  return (
    <>
      <PageTitle kicker="Biometrics & Longitudinal Data" title="Analytics & Reports" copy="Health signals across the modules that have saved logs." actions={
        <button className="primary" onClick={() => void load(period)}>Refresh</button>
      } />
      <Tabs tabs={['Today', 'This Week', 'This Month']} value={period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : 'This Month'} onChange={(tab) => void load(tab === 'Today' ? 'daily' : tab === 'This Week' ? 'weekly' : 'monthly')} />
      {error ? <p className="error">{error}</p> : null}
      {cards.length === 0 ? <p className="muted">Choose a range to load the report.</p> : (
        <Split
          left={<div className="stack">
            <div className="grid grid-2">
              {cards.slice(0, 4).map((card) => <Stat key={card.label} label={card.label} value={card.headline} detail={card.detail} />)}
            </div>
            <article className="card">
              <h2>Longitudinal signals</h2>
              <p className="muted">Figures come from the logs in this range. Empty modules stay blank.</p>
            </article>
          </div>}
          right={<article className="card">
            <h2>Detailed Module Reports</h2>
            {cards.map((card) => (
              <div className="list-row" key={card.label}><span>{card.label}</span><span className="muted">{card.headline}</span></div>
            ))}
          </article>}
        />
      )}
    </>
  );
}

export function ExportPage() {
  const { user, profile } = useAuth();
  const [preset, setPreset] = useState<DateRangePreset>('week');
  const [format, setFormat] = useState<ExportFormat>('json');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!user) return;
    try {
      const data: LifestyleExport = await buildExport(user.id, preset, profilePayload(profile?.full_name, profile?.height_cm, profile?.weight_unit));
      const file = renderExport(data, format);
      setPreview(file.contents.slice(0, 4000));
      const blob = new Blob([file.contents], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <>
      <PageTitle kicker="Data export" title="Export & AI Integration Hub" copy="Download the logs already stored in your account as JSON, Markdown, a ChatGPT brief, or printable HTML." />
      <Split
        left={<div className="stack">
          <article className="card">
            <h3>Temporal Scope</h3>
            <div className="chips" style={{ marginTop: 8 }}>
              {RANGES.map((item) => <button key={item.id} aria-pressed={preset === item.id} onClick={() => setPreset(item.id)}>{item.label}</button>)}
            </div>
          </article>
          <article className="card">
            <h3>Export Formats</h3>
            <div className="grid grid-2" style={{ marginTop: 8 }}>
              {FORMATS.map((item) => (
                <button key={item.id} className="card" aria-pressed={format === item.id} onClick={() => setFormat(item.id)}>
                  <strong>{item.label}</strong>
                  <div className="muted">{item.ext}</div>
                </button>
              ))}
            </div>
          </article>
        </div>}
        right={<article className="card">
          <h3>Module Scope</h3>
          <p className="muted">The file includes every module that has rows in the selected range.</p>
          <button className="primary" onClick={() => void run()}>Generate & Download Export</button>
          {error ? <p className="error">{error}</p> : null}
          {preview ? <pre style={{ whiteSpace: 'pre-wrap' }}>{preview}</pre> : null}
        </article>}
      />
    </>
  );
}

function profilePayload(name?: string | null, height?: number | null, unit?: string | null) {
  return { name: name ?? null, height_cm: height ?? null, weight_unit: unit ?? 'kg' };
}
