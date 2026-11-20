import { useState } from 'react';
import type { DateRangePreset, ExportFormat, LifestyleExport, ReportPeriod } from '@lifestyle-os/shared';

import { analyticsSummary, buildExport, renderExport } from '../lib/api';
import { useAuth } from '../lib/auth';

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
      <div className="topbar">
        <div>
          <h1>Analytics & Reports</h1>
          <p className="muted">Summaries from the same cloud data as the phone app</p>
        </div>
      </div>
      <div className="chips">
        {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((item) => (
          <button key={item} aria-pressed={period === item} onClick={() => void load(item)}>{item}</button>
        ))}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {cards.length === 0 ? <p className="muted">Choose a period to load the report.</p> : (
        <div className="grid grid-3">
          {cards.map((card) => (
            <article className="card" key={card.label}>
              <div className="muted">{card.label}</div>
              <div className="stat-value">{card.headline}</div>
              <div className="muted">{card.detail}</div>
            </article>
          ))}
        </div>
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
      <div className="topbar">
        <div>
          <h1>Export & AI Hub</h1>
          <p className="muted">JSON, Markdown, printable HTML, and ChatGPT format</p>
        </div>
      </div>
      <article className="card">
        <div className="row">
          <select value={preset} onChange={(event) => setPreset(event.target.value as DateRangePreset)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="quarter">Last 3 months</option>
          </select>
          <select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
            <option value="chatgpt">ChatGPT</option>
            <option value="pdf">Printable HTML</option>
          </select>
          <button className="primary" onClick={() => void run()}>Download</button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        {preview ? <pre style={{ whiteSpace: 'pre-wrap' }}>{preview}</pre> : null}
      </article>
    </>
  );
}

function profilePayload(name?: string | null, height?: number | null, unit?: string | null) {
  return { name: name ?? null, height_cm: height ?? null, weight_unit: unit ?? 'kg' };
}
