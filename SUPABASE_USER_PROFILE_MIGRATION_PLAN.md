# Supabase user profile/onboarding storage migration plan (for this repo)

## Current state (from code)
- Django models:
  - `accounts.CustomUser` holds: `email`, `type`(role), auth fields.
  - `accounts.Profile` holds onboarding/profile fields:
    - `bio`, `location`, `avatar`, `onboarding_data` (JSON)
    - `upi_id`, `total_earnings`, `rating`, `clips_completed`, `views_generated`
- Frontend calls only Django APIs for:
  - `/api/auth/register/`, `/api/auth/login/`
  - `/api/auth/profile/me/` (for profile read/write)
  - OTP endpoints for email verification.
- Supabase is currently used only for Google OAuth token validation.

## Supabase structure provided by you (key point)
You already have Django tables in Supabase, including:
- `public.accounts_customuser`
- `public.accounts_profile` (already has `onboarding_data jsonb` + all profile fields)

✅ Therefore the migration strategy is NOT to create new tables.

## What we need to do
1) Ensure Django is actually using the Supabase Postgres as its database.
   - If `DATABASE_URL` is configured to Supabase, Django writes to `public.accounts_customuser` and `public.accounts_profile` automatically.
2) If Django is NOT using Supabase Postgres today, we must migrate existing Django DB rows into Supabase DB.

## Decision: dual-write vs supabase-only
Because Supabase already contains the target tables, the safest path is:
- **Supabase-only storage by switching Django DATABASE_URL to Supabase**.
- During migration window, we can do a one-time backfill.

## Backfill approach (one-time)
A) Read from current Django DB table(s):
- `accounts_customuser`
- `accounts_profile`

B) Insert/upsert into Supabase tables (same schema):
- `public.accounts_customuser`
- `public.accounts_profile`

C) Mapping details
- `accounts_profile.user_id` references `accounts_customuser.id`.
- Keep the same primary keys if possible (identity/sequence constraints depend on DB).

If keeping IDs is hard:
- Use upsert by `accounts_customuser.email` for users.
- Then map `Profile` by `user.email` -> corresponding Supabase `customuser.id`.

## Implementation in this repo (recommended)
### Option 1 (best): switch Django to Supabase DB
- Set `DATABASE_URL` in backend `.env` to Supabase Postgres connection string.
- Restart backend.
- Run migrations (should match existing schema or be no-ops).

### Option 2: keep Django DB, run backfill script
Add a Django management command:
- `python manage.py backfill_profiles_to_supabase`
- It will:
  - fetch profiles from Django DB
  - write to Supabase using Supabase REST (preferred for simplicity) OR direct Postgres connection to Supabase.

## Validation checklist
After migration:
1) For a known user email:
   - Supabase `select * from public.accounts_customuser where email='...'`
   - Supabase `select onboarding_data from public.accounts_profile where user_id = ...`
2) Run frontend flow:
   - signup -> OTP verify -> register
   - onboarding updates -> check `onboarding_data` changed in Supabase.

## Requested next step
Confirm which database Django is currently connected to:
- Is `backend/core/settings.py` `DATABASE_URL` set and pointing to Supabase Postgres?
- If yes: then no code changes required, only verification.
- If no: implement either Option 1 (switch) or Option 2 (backfill).

