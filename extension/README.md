# Tipble Chrome Extension

Autonomous crypto tipping agent for Rumble creators.

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # production build
```

## Load unpacked extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (toggle, top right)
3. Click **Load unpacked**
4. Select the `tipble/extension/dist/` folder
5. Pin the Tipble extension to your toolbar
6. Make sure the agent is running:
   ```bash
   cd agent && npm run dev
   ```

## Project structure

```
src/
  background/service-worker.ts   # polls agent API, fires notifications
  content/content.ts             # injects badge + toast into Rumble pages
  content/content.css
  popup/                         # React popup (Dashboard | Rules | History | Settings)
  lib/storage.ts                 # chrome.storage.local helpers
  lib/api.ts                     # agent API client
  types/index.ts                 # shared TypeScript interfaces
  manifest.json
  icons/
```
