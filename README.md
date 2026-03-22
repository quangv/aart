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

3. Create database schema in Supabase SQL editor

- Run [supabase/schema.sql](supabase/schema.sql)

4. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

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
