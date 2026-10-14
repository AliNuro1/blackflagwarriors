# Administrator dashboard

The administrator area (`/admin`) is a separate, protected surface. Every page and `/api/admin/*` handler reloads the signed-in profile from club records and requires `role = admin` and `status = active`. A player cannot become an administrator by editing a form, forging a cookie field, or calling an API.

Development seed (Ofcom drama numbers only):

- Player: `07700 900 101` (Alex Reed)
- Administrator: `07700 900 110` (Priya Khan)
- Mock OTP when Twilio is unset: `000000`

Those accounts are for local development. They are not a production access-control model.

## First administrator in a real project

Do this **once**, with a database role that already bypasses RLS (Supabase SQL editor as the project owner, or `psql` as a superuser). Do not expose a public “make me admin” route.

1. Register the person as a normal player (portal sign-in with their UK mobile, or `create_player` as an existing admin).
2. In SQL, set the role on that profile only:

```sql
update public.profiles
  set role = 'admin'
  where phone_e164 = '+44XXXXXXXXXX'
    and status = 'active';
```

3. Confirm there is at least one active admin:

```sql
select id, full_name, phone_e164, role, status
from public.profiles
where role = 'admin';
```

Later administrators can be added from `/admin/players` by an existing admin. The database refuses to demote or deactivate the last active administrator. Profiles and payment rows cannot be deleted; void a charge instead of removing history.

Apply `supabase/migrations/20261014210000_admin_dashboard.sql` with the other migrations (`supabase db push`).
