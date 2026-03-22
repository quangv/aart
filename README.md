# Aart: Words Mastery Tracker

Aart helps parents track a child's articulation progress by sound position and generate practice-safe language suggestions.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Vercel deployment target

Planned production domain: `aart.autismarcade.com`

## Core Product Model

The app stores:

- Parent accounts and child profiles
- Speech sounds (for example `p`, `sh`, `th`)
- Words with linguistic attributes:
  - reading level
  - part of speech
  - syllables
- Sound decomposition of each word by position:
  - beginning
  - middle
  - end
- Child sound progress per position:
  - score
  - attempts
  - mastered flag

Suggestions are generated only from sound-position targets the child has mastered.

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp .env.example .env.local
```

Set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL` (since no ip4 address use `session pooler` url)

Example `.env.local` values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://gayindulqnrngbpuqixl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE_PAYLOAD.EXAMPLE_SIGNATURE
SUPABASE_DB_URL=postgresql://postgres.gayindulqnrngbpuqixl:YOUR_DB_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

If your DB password contains special URL characters, URL-encode it before putting it in `SUPABASE_DB_URL`.

- `@` -> `%40`
- `#` -> `%23`
- `%` -> `%25`

Example encoded password:

```dotenv
SUPABASE_DB_URL=postgresql://postgres.gayindulqnrngbpuqixl:K%40%23oJl14%25PKYE3@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

3. Link this repo to your Supabase project

```bash
supabase link --project-ref <your-project-ref>
```

4. Apply database migrations

```bash
npm run db:push
```

5. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database Migrations (Supabase CLI)

This repo now includes a baseline migration at [supabase/migrations/20260322000100_init.sql](supabase/migrations/20260322000100_init.sql).

Use these commands for schema changes:

```bash
# create a new migration file
npm run db:migration:new -- add_child_avatar

# edit the generated SQL in supabase/migrations/<timestamp>_add_child_avatar.sql

# apply pending migrations to linked remote project
npm run db:push
```

Useful commands:

```bash
# start/stop local Supabase stack
npm run db:start
npm run db:stop

# rebuild local db from migrations + seed.sql
npm run db:reset

# pull remote schema into a new migration (for changes made in dashboard)
# use when you manually edited tables in Supabase dashboard
npm run db:pull

# db:push and db:pull read SUPABASE_DB_URL from .env.local
# useful on WSL/network setups where direct db.<project-ref> host fails
npm run db:push
npm run db:pull
```

Notes:

- Prefer migrations over editing Supabase tables directly in the dashboard.
- If you do edit schema in the dashboard, run `npm run db:pull` and commit the generated migration.
- [supabase/schema.sql](supabase/schema.sql) is kept as a reference snapshot of the initial schema.

## Current Routes

- `/` landing
- `/signup` parent registration
- `/login` parent login
- `/dashboard` child profile list and creation
- `/dashboard/[childId]` sound progress tracking + recommendations

## Deploy to Vercel

1. Create a Vercel project from this repository.
2. Set the same env vars in Vercel project settings.
3. Deploy.
4. In your DNS provider, add a CNAME for `aart.autismarcade.com` to your Vercel target and add the domain in Vercel.

## Important Next Step

Seed your `words` and `word_sounds` tables with your articulation curriculum data so recommendation quality improves immediately.
