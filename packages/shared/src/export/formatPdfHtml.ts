import type { LifestyleExport } from './types';
import { exportToMarkdown } from './formatMarkdown';

/** Minimal HTML wrapper for expo-print PDF generation. */
export function exportToPdfHtml(data: LifestyleExport): string {
  const md = exportToMarkdown(data);
  const body = md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
    .replace(/\n\n/g, '<br/><br/>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, sans-serif; padding: 24px; color: #0f172a; font-size: 14px; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 20px; color: #334155; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; }
  </style>
</head>
<body>${body}</body>
</html>`;
}
