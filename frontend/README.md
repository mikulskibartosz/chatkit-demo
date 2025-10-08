# ChatKit Frontend

This Vite + React client is served by the lightweight Node.js runtime in `server.mjs`. The same process handles `/api/chatkit/session`, keeping your OpenAI API key out of the browser while still delivering a minimal ChatKit demo.

## Quick Reference
- App entry point: `src/main.tsx`
- ChatKit widget wrapper: `src/App.tsx`
- Node/Vite server: `server.mjs`

## Requirements
- Node.js 20+
- `OPENAI_API_KEY` with access to ChatKit
- `CHATKIT_WORKFLOW_ID` pointing at your workflow
- `VITE_CHATKIT_API_DOMAIN_KEY` for domain allowlisting

## Environment Variables

Create a `.env` file next to this README (or export the variables manually):

```bash
OPENAI_API_KEY=sk-proj-...
CHATKIT_WORKFLOW_ID=wf_...
VITE_CHATKIT_API_DOMAIN_KEY=domain_pk_local_dev
```

The domain key must match a value from the [ChatKit domain allowlist](https://platform.openai.com/settings/organization/security/domain-allowlist). Any placeholder works for local development if domain checks are disabled.

## Install & Run

```bash
npm install
npm run dev
```

The dev server is available at `http://127.0.0.1:5170`. The same runtime proxies `/api/chatkit/session` to the OpenAI API. For production, build the app and run the server with the `--prod` flag:

```bash
npm run build
node server.mjs --prod
```

Remember to add authentication or rate limiting before exposing the session endpoint to real traffic.
