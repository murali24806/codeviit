# RunIt — Merged Project

This is your two repos (`runitbackend` and `runitfrontend`) combined into a single project folder for easier editing.

```
runit-project/
├── backend/     # Express API (code execution + AI test-case generation)
│   ├── index.js
│   └── package.json
├── frontend/    # Next.js app
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
└── package.json # root scripts to run both together
```

Nothing inside `backend/` or `frontend/` was changed — this only nests both folders
under one root and adds convenience scripts. Each still has its own `package.json`
and its own `node_modules`, so you can also `cd backend` or `cd frontend` and work
exactly as before.

## Setup

```bash
cd runit-project
npm run install:all
```

This runs `npm install` inside both `backend/` and `frontend/`.

## Running in development

Run both servers together from the root:

```bash
npm run dev
```

This uses `concurrently` to start:
- **backend** → Express server on `http://localhost:5000` (or `PORT` env var)
- **frontend** → Next.js dev server on `http://localhost:3000`

Or run them separately in two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

## Backend environment

The backend (`backend/index.js`) has no `.env` file — it currently uses:
- Judge0 CE public API for code execution (`https://ce.judge0.com`)
- Puter's anonymous AI endpoint for test-case generation

If you later add real API keys (e.g. your own Judge0 host or an Anthropic key),
create `backend/.env` and load it with `dotenv` — it's not wired up yet.

## Frontend → backend connection

Right now the frontend calls the backend via a **hardcoded URL**:
`https://runitbackend.onrender.com/api/execute`, found in:
- `frontend/app/editor/page.tsx`
- `frontend/app/editor/[id]/page.tsx`

So today it always talks to your deployed Render backend, even when you run
`frontend` locally. To test against your local backend instead, change both
occurrences to `http://localhost:5000/api/execute`, or better, introduce an
env var:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://runitbackend.onrender.com"
// then: fetch(`${API_URL}/api/execute`, ...)
```

and set `NEXT_PUBLIC_API_URL=http://localhost:5000` in `frontend/.env.local`
for local dev.

## Notes

- Frontend uses Next.js 16 + React 19 + Tailwind v4 + Supabase (auth/db) + Radix UI.
- Backend uses Express + Judge0 (code execution) + axios.
- `frontend/pnpm-lock.yaml` was kept as-is; if you prefer npm, delete it and let
  `npm install` generate a fresh `package-lock.json`.
