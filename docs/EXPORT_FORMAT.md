# Lifestyle OS Export Format (v1.0)

Structured exports for backup, sharing, and Custom GPT analysis.

## Version

`export_version`: `"1.0"`

## Top-level fields

| Field | Type | Description |
|---|---|---|
| `export_version` | string | Schema version |
| `exported_at` | ISO datetime | When the export was generated |
| `date_range` | `{ from, to }` | Inclusive date range (YYYY-MM-DD) |
| `user` | object | Profile snapshot (name, height, units) |
| `goals` | array | Active goals with progress % |
| `body` | object | Weight logs and measurements |
| `fitness` | object | Workout count and list |
| `nutrition` | object | Macro averages and daily totals |
| `water` | object | Daily intake vs goal |
| `sleep` | object | Duration and quality averages |
| `habits` | object | Completion rates and streaks |
| `supplements` | object | Active supplements and adherence |
| `haircare` | object | Oil/wash counts and condition score |
| `skincare` | object | Routine adherence, clarity, breakouts |
| `health` | object | Vitals and symptoms |
| `progress_photos` | object | Count and dates (metadata only) |

## Units

- Weight: **kg**
- Water: **ml**
- Sleep duration: **minutes** in daily logs, **hours** in averages
- Ratings (sleep quality, skin, scalp): **1–5**

## Formats

| Format | Extension | Use case |
|---|---|---|
| JSON | `.json` | Machine-readable, Custom GPT |
| Markdown | `.md` | Human-readable notes |
| PDF | `.pdf` | Printable summary |
| ChatGPT | `.json` | Compressed JSON with `_schema` hints |

## ChatGPT export

The ChatGPT format wraps the same data with:

```json
{
  "_schema": "lifestyle-os-export-v1",
  "_instructions": "Analyse this lifestyle dataset...",
  ...
}
```

Empty/null fields are stripped to reduce token usage.

## Module selection

Users can include or exclude modules at export time. Photo metadata (dates, count) is optional; image files are never embedded in exports.

## Custom GPT integration (Slice 6)

1. User exports JSON or ChatGPT format from **Insights → Export**
2. Upload to a Custom GPT configured with this schema
3. GPT acts as a personal lifestyle coach

See [PLAN.md](../PLAN.md) §12–13 for the full product vision.
