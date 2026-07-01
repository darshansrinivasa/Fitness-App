# Custom GPT setup (Lifestyle OS)

Use your Lifestyle OS export with a personal ChatGPT Custom GPT for coaching-style analysis — no AI inside the app.

## 1. Export from the app

1. Open **Insights → Export**
2. Choose date range and modules
3. Select **ChatGPT** format
4. Tap **Export & share** and save the `.json` file (or copy contents)

The ChatGPT format is compressed JSON with `_schema`, `_field_guide`, and coaching hints baked in.

## 2. Create the Custom GPT

In [ChatGPT → Explore GPTs → Create](https://chat.openai.com/gpts/editor):

### Name & description

- **Name:** Lifestyle OS Coach (or your preference)
- **Description:** Analyses Lifestyle OS health exports and gives actionable lifestyle coaching.

### Instructions (system prompt)

Paste the contents of [`gpt-system-prompt.txt`](./gpt-system-prompt.txt) from this repo, or copy from `packages/shared/src/export/gptSchema.ts` (`GPT_COACHING_INSTRUCTIONS` + field guide).

### Knowledge

Upload these files (optional but recommended):

- `docs/EXPORT_FORMAT.md` — full schema reference
- A sample export JSON from your app (ChatGPT format)

### Capabilities

- **Code interpreter:** Off (not needed)
- **Web browsing:** Off
- **DALL·E:** Off

## 3. Analyse your data

1. Start a new chat with your Custom GPT
2. Upload your export file or paste the JSON
3. Ask e.g.:
   - "Summarise my last month — wins, gaps, and top 3 priorities."
   - "How consistent were my habits vs sleep quality?"
   - "What should I focus on next week based on this export?"

## Export schema id

`lifestyle-os-export-v1` — stable across app versions until a breaking schema change.

See [EXPORT_FORMAT.md](./EXPORT_FORMAT.md) for field definitions.
