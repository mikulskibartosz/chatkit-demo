# Minimal ChatKit Demo

This project wires up the ChatKit widget with as little code as possible while still keeping your OpenAI API key on the server. A single Node.js process serves the React frontend and exposes a `/api/chatkit/session` endpoint that exchanges your workflow ID for client secrets.

## Prerequisites

- Node.js 20+
- An OpenAI API key with access to ChatKit (`OPENAI_API_KEY`)
- A ChatKit workflow ID (`CHATKIT_WORKFLOW_ID`)
- A ChatKit domain key for your environment (`VITE_CHATKIT_API_DOMAIN_KEY`)

## Configuration

Create a `.env` file inside `frontend/` (or export the variables manually) with the following entries:

```bash
OPENAI_API_KEY=sk-proj-...
CHATKIT_WORKFLOW_ID=wf_...
VITE_CHATKIT_API_DOMAIN_KEY=domain_pk_local_dev
```

The `VITE_CHATKIT_API_DOMAIN_KEY` must match a domain you have allow-listed in the OpenAI dashboard. Any placeholder works for local development if the domain check is disabled in your org.

## Run the app

From the repository root:

```bash
npm run dev
```

The combined server listens on <http://127.0.0.1:5170>. It proxies `/api/chatkit/session` to the OpenAI Sessions API using your secret key and serves the Vite-powered frontend (with hot module replacement in development).

For a production-style test, first build the frontend and then start the server in production mode:

```bash
npm run build
(cd frontend && node server.mjs --prod)
```

## Deploy to Render

When creating a new Web Service on [Render](https://render.com), point it at this repository and supply the same environment
variables described above (`OPENAI_API_KEY`, `CHATKIT_WORKFLOW_ID`, and `VITE_CHATKIT_API_DOMAIN_KEY`). Then use the following
commands in the Render dashboard:

- **Build Command**

  ```bash
  npm install --prefix frontend && npm --prefix frontend run build
  ```

- **Start Command**

  ```bash
  cd frontend && node server.mjs --prod
  ```

Render automatically sets `PORT`; the server reads this value to bind the correct interface.

## How it works

1. The frontend generates or reuses a browser-scoped device identifier.
2. When ChatKit needs a client secret, the app POSTs the device ID to `/api/chatkit/session`.
3. The Node handler calls `https://api.openai.com/v1/chatkit/sessions` with your workflow ID and returns the resulting `client_secret` to the browser.
4. ChatKit mounts inside the page via the `@openai/chatkit-react` bindings and the hosted script from the CDN.

⚠️ **Security note:** This setup keeps your API key on the server, but the `/api/chatkit/session` route will hand out client secrets to anyone who can reach it. Use proper authentication and rate limiting before exposing the demo to real users.
