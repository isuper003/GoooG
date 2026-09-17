# Guess the Character

A flashcard-style character guessing game built with React, Vite, Tailwind CSS, Cloudflare Pages Functions, and Cloudflare D1.

## Local Development

Local development requires running both the client dev server and the API server concurrently in separate terminals:

1. **Frontend (Vite dev server)**:
   ```bash
   npm run dev
   ```
   Serves the React application on `http://localhost:5173` and proxies `/api/*` requests to port `8788`.

2. **Backend (Cloudflare Pages Functions + D1)**:
   ```bash
   npm run dev:api
   ```
   Runs `wrangler pages dev --port 8788`, serving Pages Functions with local D1 database bindings.

> **Note:** Before running `npm run dev:api` for the first time, run `npm run build` so that the `dist/` directory exists, and apply local database migrations with `npm run db:migrate:local`.
