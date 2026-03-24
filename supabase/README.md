# Database Management Guide

This directory contains Supabase configuration, schema definitions, and migration files for Aart.

## Migration Best Practices

### ✅ DO: Create a new migration file

If you've already deployed a migration to production and need to make changes:

```bash
npm run db:migration:new -- split_early_vowels_into_two_stages
```

Edit the generated file with your fixes or iterations, then:

```bash
npm run db:push
```

### ❌ DON'T: Edit migration files after deployment

Once a migration has run anywhere (local, staging, or production), **never edit the file**. Here's why:

1. **Migration history is immutable** — Supabase records each migration filename + checksum in `schema_migrations`. If you edit the file, the checksum no longer matches what actually ran.

2. **Breaking the local/production contract** — Your edited local version will differ from what's recorded as applied in production. This creates inconsistency.

3. **Silent data corruption** — The system won't know which version of the migration actually ran, leading to unpredictable schema differences between environments.

4. **Lost audit trail** — You lose the historical record of what actually changed on production.

5. **Future deployments break** — Tools and CI/CD systems rely on migration history to know what's been applied. Editing breaks this verification.

**Exception:** A migration file is safe to edit only if:

- It hasn't been deployed anywhere yet, AND
- It hasn't been committed to the main branch

### Workflow Example

**Scenario:** You created migration `20260323000100_sound_stage_curriculum_39_phonemes.sql` with 39 phonemes in 9 stages, deployed it, then realized you need to split vowels into 2 stages.

**Wrong approach:**

```bash
# ❌ DON'T: Edit the existing migration file
vim supabase/migrations/20260323000100_sound_stage_curriculum_39_phonemes.sql
npm run db:push  # Breaks production history
```

**Correct approach:**

```bash
# ✅ DO: Create a new migration
npm run db:migration:new -- split_early_vowels_into_two_stages

# Edit the new file
vim supabase/migrations/20260323000200_split_early_vowels_into_two_stages.sql

# Deploy both migrations (first runs again locally, second runs everywhere)
npm run db:push
```

## Migration Deep Dive

### How Supabase tracks migrations

Supabase maintains a `schema_migrations` table that records:

- `version` (timestampnamed migration file, e.g., `20260323000100`)
- `name` (migration description)
- `executed_at` (when it ran)

When you run `npm run db:push`, Supabase:

1. Checks `schema_migrations` to see which migrations have already run
2. Finds any new migration files you haven't deployed yet
3. Runs only the new ones in order

If you edit an already-applied migration file:

- Local: The edited file runs again, potentially causing duplicate UPDATEs or constraint errors
- Remote: The edited file is **ignored** because the migration version is already recorded as applied

### Debugging failed migrations

If a migration is marked as applied but the data didn't change as expected:

```bash
# Check which migrations are recorded as applied
supabase migration list --db-url "$SUPABASE_DB_URL"

# Query the actual schema to see if data matches
psql "$SUPABASE_DB_URL" -c "SELECT * FROM information_schema.tables WHERE table_schema='public';"

# If data is wrong, create a new migration to fix it
npm run db:migration:new -- fix_<issue_name>
```

## File Structure

- **migrations/** — Timestamped SQL migration files (never edit after deployment)
- **schema.sql** — Reference snapshot of the current schema (auto-generated, for reference only)
- **seed.sql** — Initial data to seed after fresh setup (optional, used by `npm run db:reset`)
- **config.toml** — Supabase CLI configuration (local Docker settings, JWT secrets, etc.)

## Common Commands

```bash
# Create a new migration
npm run db:migration:new -- <description>

# Apply pending migrations to production
npm run db:push

# Apply pending migrations to local Docker DB only
npm run db:migrate:local

# Rebuild local DB from scratch (migrations + seed)
npm run db:reset

# Pull remote schema as a new migration (if you edited tables in Supabase dashboard)
npm run db:pull

# Start/stop local Supabase Docker stack
npm run db:start
npm run db:stop
```

## Local vs Production

- **Local**: `npm run db:reset` applies all migrations from a clean state, so editing early migrations locally works temporarily but should not be committed
- **Production**: Always uses `npm run db:push` which checks migration history. Edited files are silently ignored because the migration version is already marked as applied

To test migrations locally without committing:

```bash
npm run db:reset
```

To push to production:

```bash
npm run db:push
```

## Related Docs

- [Main README](../README.md) — Project overview and setup
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#managing-migrations)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/usage)
