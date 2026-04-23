# CareerConnect

A React + Vite app previously built on Base44. Auth and backend have been
migrated to **Supabase** (auth, Postgres, storage, edge functions).

## Prerequisites

1. A [Supabase](https://supabase.com) project (free tier is fine).
2. Node 18+.

## Setup

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in the values from your Supabase project
(Settings → API):

```ini
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## Database schema

Open the Supabase SQL editor and run `supabase/schema.sql`. This will:

- Create a `profiles` table linked 1:1 to `auth.users`
- Auto-create a profile row whenever a new user signs up
- Create all domain tables used by the app (jobs, matches, messages, etc.)
- Enable **permissive** RLS (any authenticated user can read/write). Tighten
  before shipping to production — see the comments at the bottom of the file.
- Create a public `uploads` storage bucket for file uploads.

## Auth

- Email + password is enabled by default.
- New users can sign up at `/signup` and sign in at `/login`.
- The first user you want as an admin can be promoted manually:
  ```sql
  update public.profiles set role = 'admin' where email = 'you@example.com';
  ```

## Base44 → Supabase compatibility layer

The rest of the codebase still calls `base44.auth.*`, `base44.entities.*`,
`base44.integrations.Core.UploadFile`, and `base44.functions.invoke`.

Rather than touch ~25 files, `src/api/base44Client.js` exports a drop-in
compatibility shim that delegates every call to Supabase:

| Old Base44 call                                         | Now backed by                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `base44.auth.me()`                                      | `supabase.auth.getUser()` + `profiles` row                       |
| `base44.auth.logout()` / `redirectToLogin()`            | `supabase.auth.signOut()` + redirect to `/login`                 |
| `base44.auth.updateMe({ ... })`                         | Upsert into `profiles`                                           |
| `base44.entities.<Name>.list/filter/create/update/delete` | `supabase.from('<snake_name>')` queries                        |
| `base44.integrations.Core.UploadFile({ file })`         | `supabase.storage.from('uploads').upload(...)`                   |
| `base44.integrations.Core.InvokeLLM(...)`               | Supabase edge function `invoke-llm` (you must deploy this)       |
| `base44.integrations.Core.ExtractDataFromUploadedFile`  | Supabase edge function `extract-data` (you must deploy this)     |
| `base44.functions.invoke(name, payload)`                | `supabase.functions.invoke(name, { body: payload })`             |

Feel free to migrate call sites to native `supabase.from(...)` queries
incrementally; the shim will keep untouched call sites working.

## Edge functions

All five edge functions are already ported and live under `supabase/functions/`:

| Function             | Purpose                                        | Secrets it needs                       |
| -------------------- | ---------------------------------------------- | -------------------------------------- |
| `addToGoogleCalendar`| Create events on a Google Calendar             | `GOOGLE_ACCESS_TOKEN`                  |
| `blockGmailCalendar` | Block availability slots on Google Calendar    | `GOOGLE_ACCESS_TOKEN`                  |
| `syncToNotion`       | Upsert a record into a Notion database         | `NOTION_TOKEN`, `NOTION_DATABASE_ID`   |
| `invoke-llm`         | Hosted LLM (powers AI job matching, quiz, etc.)| `OPENAI_API_KEY` **or** `ANTHROPIC_API_KEY` |
| `extract-data`       | Extract structured data from uploaded files    | `OPENAI_API_KEY`                       |

Set secrets with:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set GOOGLE_ACCESS_TOKEN=ya29...
supabase secrets set NOTION_TOKEN=secret_...
supabase secrets set NOTION_DATABASE_ID=...
```

Deploy them all with `npm run sb:deploy:all` (after `sb:login` + `sb:link`).

## Scripts

```bash
npm run dev        # start Vite dev server
npm run build      # production build
npm run lint       # ESLint (errors only)
npm run lint:fix   # auto-fix lint issues
npm run typecheck  # TypeScript check via jsconfig.json

# Supabase deploy helpers:
npm run sb:login         # log in to Supabase (one time)
npm run sb:link          # link this repo to the Supabase project
npm run sb:push          # push supabase/schema.sql to the DB
npm run sb:deploy:all    # deploy all 5 edge functions
```

## One-time Supabase bootstrap

After cloning and setting `.env.local`, do this once:

```bash
npm run sb:login            # opens a browser to log in
npm run sb:link             # links to project gndxqnmsrkbukpuolblg
npm run sb:push             # pushes schema.sql (creates tables, RLS, bucket)
npm run sb:deploy:all       # deploys the 5 edge functions

# Then set any secrets the functions need:
supabase secrets set OPENAI_API_KEY=sk-...
```

Promote your first admin once you've signed up:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## Deploy (host the app online)

The frontend is a static Vite build (`dist/`). Your database, auth, storage, and
edge functions stay on **Supabase**; you only need a static host for the React
app.

### 1. Vercel (quickest)

1. Push the repo to GitHub (or use Vercel’s “Import” with a folder).
2. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the repo.
3. Framework: **Vite** (auto-detected). **Root** = repo root, **Build** =
   `npm run build`, **Output** = `dist` (this repo’s `vercel.json` already sets
   this and SPA rewrites for React Router).
4. **Environment variables** (required at build time):

   | Name                    | Value                                      |
   | ----------------------- | ------------------------------------------ |
   | `VITE_SUPABASE_URL`     | `https://<project-ref>.supabase.co`         |
   | `VITE_SUPABASE_ANON_KEY` | Anon public key (Settings → API)          |

5. **Deploy** — you get a URL like `https://career-connect-xxx.vercel.app`.

**Supabase (required once per production URL):** in the [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL configuration**:

- **Site URL** — set to your public site, e.g. `https://career-connect-xxx.vercel.app`
- **Redirect URLs** — add the same base URL (and any preview URLs if you use
  Vercel preview deployments), e.g.  
  `https://career-connect-xxx.vercel.app/**`

Without this, sign-in, magic links, and email confirmations will still point at
`localhost` or the wrong host.

### 2. Netlify

Same env vars. This repo includes `netlify.toml` (build, publish `dist`, SPA
`200` redirect). Connect the repo in [Netlify](https://app.netlify.com) and set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Site settings** →
**Environment variables** → trigger a new deploy.
