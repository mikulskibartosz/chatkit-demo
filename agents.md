# ChatKit Integration Guide

This repository now focuses on the lightest possible ChatKit setup with a single Node.js service that serves the React frontend and brokers ChatKit client secrets. Use it as a reference when you want to prototype quickly before investing in a more robust backend.

---

## Quick Reference
- **Frontend entry point**: `frontend/src/main.tsx`
- **ChatKit widget wrapper**: `frontend/src/App.tsx`
- **Node server**: `frontend/server.mjs`

---

## Prerequisites
- Node.js 20+
- OpenAI API key exported as `OPENAI_API_KEY`
- ChatKit workflow ID exported as `CHATKIT_WORKFLOW_ID`
- ChatKit domain key exported as `VITE_CHATKIT_API_DOMAIN_KEY`

---

## Local Project Setup

1. **Start the combined server**
   ```bash
   npm install
   npm run dev
   ```
   The dev server listens on `http://127.0.0.1:5170`.

2. **Domain allowlisting**
   - For local development, export any non-empty string so the SDK sees a key:
     ```bash
     export VITE_CHATKIT_API_DOMAIN_KEY=domain_pk_local_dev
     ```
   - When deploying, register your domain at [platform.openai.com/settings/organization/security/domain-allowlist](https://platform.openai.com/settings/organization/security/domain-allowlist) and replace the placeholder with the generated `domain_pk_...` value.
   - Mirror the domain inside `frontend/vite.config.ts` by adding it to `server.allowedHosts`.

---

## Production Reminder

This example skips auth around `/api/chatkit/session`; protect the route before shipping anything user-facing.
