/** @vitest-environment node */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "../..");

function sqlFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

const PLAYER = "11111111-1111-4111-8111-111111111101";
const OTHER = "11111111-1111-4111-8111-111111111102";
const ADMIN = "11111111-1111-4111-8111-111111111110";
const PLAYER_CHARGE = "22222222-2222-4222-8222-222222222201";
const OTHER_CHARGE = "22222222-2222-4222-8222-222222222206";

async function openClubDb() {
  const db = new PGlite();
  await db.exec(sqlFile("supabase/tests/bootstrap.sql"));
  await db.exec(sqlFile("supabase/migrations/20261014180000_club_payments.sql"));
  await db.exec(sqlFile("supabase/migrations/20261014193000_profile_status.sql"));
  await db.exec(sqlFile("supabase/migrations/20261014200000_stripe_checkout_reconcile.sql"));
  await db.exec(sqlFile("supabase/migrations/20261014201000_stripe_checkout_functions.sql"));
  await db.exec(sqlFile("supabase/seed.sql"));
  return db;
}

async function asRole(
  db: PGlite,
  role: "authenticated" | "anon" | "service_role",
  userId: string | null,
  fn: () => Promise<void>,
) {
  const claims = JSON.stringify({
    sub: userId ?? "",
    role,
  });
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await fn();
    await db.exec("rollback");
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

describe("club payment access policies", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await openClubDb();
  });

  afterAll(async () => {
    await db?.close();
  });

  it("seeds fictional profiles only", async () => {
    const { rows } = await db.query<{ phone_e164: string }>(
      "select phone_e164 from public.profiles order by phone_e164",
    );
    expect(rows.length).toBe(13);
    expect(rows.every((row) => row.phone_e164.startsWith("+447700900"))).toBe(true);
  });

  it("lets a player read only their own profile", async () => {
    await asRole(db, "authenticated", PLAYER, async () => {
      const { rows } = await db.query<{ id: string }>("select id from public.profiles");
      expect(rows.map((row) => row.id)).toEqual([PLAYER]);
    });
  });

  it("lets an admin read every profile", async () => {
    await asRole(db, "authenticated", ADMIN, async () => {
      const { rows } = await db.query("select id from public.profiles");
      expect(rows.length).toBe(13);
    });
  });

  it("blocks a player from changing their role", async () => {
    await asRole(db, "authenticated", PLAYER, async () => {
      await expect(
        db.query("update public.profiles set role = 'admin' where id = $1", [PLAYER]),
      ).rejects.toThrow(/permission denied/i);
    });
    const { rows } = await db.query<{ role: string }>(
      "select role from public.profiles where id = $1",
      [PLAYER],
    );
    expect(rows[0]?.role).toBe("player");
  });

  it("blocks a player from reading another player's charges", async () => {
    await asRole(db, "authenticated", PLAYER, async () => {
      const own = await db.query("select id from public.charges where player_id = $1", [PLAYER]);
      const other = await db.query("select id from public.charges where id = $1", [OTHER_CHARGE]);
      expect(own.rows.length).toBeGreaterThan(0);
      expect(other.rows.length).toBe(0);
    });
  });

  it("blocks a player from changing fee amounts or charge status", async () => {
    await asRole(db, "authenticated", PLAYER, async () => {
      const amount = await db.query(
        "update public.charges set amount_pence = 1 where id = $1",
        [PLAYER_CHARGE],
      );
      const status = await db.query(
        "update public.charges set status = 'paid' where id = $1",
        [PLAYER_CHARGE],
      );
      expect(amount.affectedRows).toBe(0);
      expect(status.affectedRows).toBe(0);
    });
  });

  it("blocks a player from inserting a charge", async () => {
    await asRole(db, "authenticated", PLAYER, async () => {
      await expect(
        db.query(
          `insert into public.charges (player_id, description, category, amount_pence, due_on)
           values ($1, 'Fake fine', 'fine', 500, '2026-10-20')`,
          [PLAYER],
        ),
      ).rejects.toThrow();
    });
  });

  it("lets an admin create charges", async () => {
    await asRole(db, "authenticated", ADMIN, async () => {
      const { rows } = await db.query<{ id: string }>(
        `select id from public.create_charges_for_players(
           array[$1]::uuid[],
           'Social · end of season',
           'social',
           1200,
           '2026-12-01'
         )`,
        [OTHER],
      );
      expect(rows.length).toBe(1);
    });
  });

  it("blocks a player from inserting payments or allocations", async () => {
    await asRole(db, "authenticated", PLAYER, async () => {
      await expect(
        db.query(
          `insert into public.payments (player_id, amount_pence, currency)
           values ($1, 800, 'gbp')`,
          [PLAYER],
        ),
      ).rejects.toThrow();
    });
  });

  it("blocks a player from reconciling a payment", async () => {
    await asRole(db, "authenticated", PLAYER, async () => {
      await expect(
        db.query(`select public.complete_payment(p_stripe_checkout_session_id => 'cs_test_training_october')`),
      ).rejects.toThrow(/admin|server|reconcile/i);
    });
  });

  it("lets a player read only their payment allocations", async () => {
    await asRole(db, "authenticated", PLAYER, async () => {
      const { rows } = await db.query<{ player_id: string }>(
        `select p.player_id
         from public.payment_allocations a
         join public.payments p on p.id = a.payment_id`,
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.player_id === PLAYER)).toBe(true);
    });
  });

  it("hides webhook events from players and admins", async () => {
    await db.exec(`
      insert into public.stripe_webhook_events (stripe_event_id, event_type)
      values ('evt_hidden', 'checkout.session.completed')
      on conflict do nothing
    `);
    await asRole(db, "authenticated", ADMIN, async () => {
      await expect(
        db.query("select stripe_event_id from public.stripe_webhook_events"),
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("records Stripe events once and ignores duplicates", async () => {
    await asRole(db, "service_role", null, async () => {
      const first = await db.query<{ ingest_stripe_event: boolean }>(
        `select public.ingest_stripe_event(
           'evt_dup_1',
           'ping',
           '{}'::jsonb
         )`,
      );
      const second = await db.query<{ ingest_stripe_event: boolean }>(
        `select public.ingest_stripe_event(
           'evt_dup_1',
           'ping',
           '{}'::jsonb
         )`,
      );
      expect(first.rows[0]?.ingest_stripe_event).toBe(true);
      expect(second.rows[0]?.ingest_stripe_event).toBe(false);
    });
  });

  it("allocates a partial payment without marking the charge paid", async () => {
    const league = "22222222-2222-4222-8222-222222222203";
    await asRole(db, "service_role", null, async () => {
      const payment = await db.query<{ id: string }>(
        `insert into public.payments (player_id, amount_pence, currency, status)
         values ($1, 1500, 'gbp', 'pending')
         returning id`,
        [PLAYER],
      );
      const paymentId = payment.rows[0]!.id;
      await db.query(
        `insert into public.payment_allocations (payment_id, charge_id, amount_pence)
         values ($1, $2, 1500)`,
        [paymentId, league],
      );
      await db.query(`select public.complete_payment(p_payment_id => $1::uuid)`, [paymentId]);
      const status = await db.query<{ status: string }>(
        "select status from public.charges where id = $1",
        [league],
      );
      expect(status.rows[0]?.status).toBe("partial");
    });
  });

  it("rejects allocations that exceed the charge", async () => {
    await asRole(db, "service_role", null, async () => {
      const payment = await db.query<{ id: string }>(
        `insert into public.payments (player_id, amount_pence, currency)
         values ($1, 99999, 'gbp')
         returning id`,
        [PLAYER],
      );
      await expect(
        db.query(
          `insert into public.payment_allocations (payment_id, charge_id, amount_pence)
           values ($1, $2, 99999)`,
          [payment.rows[0]!.id, PLAYER_CHARGE],
        ),
      ).rejects.toThrow(/exceed/i);
    });
  });

  it("does not mark a payment succeeded when ingesting a Checkout completed event", async () => {
    await asRole(db, "service_role", null, async () => {
      const started = await db.query<{ id: string; status: string }>(
        `select id, status from public.begin_checkout(
           $1::uuid,
           array[$2]::uuid[],
           'cs_test_webhook_only'
         )`,
        [PLAYER, PLAYER_CHARGE],
      );
      expect(started.rows[0]?.status).toBe("pending");
      await db.query(
        `select public.ingest_stripe_event(
           'evt_completed_no_auto',
           'checkout.session.completed',
           '{"id":"evt_completed_no_auto","type":"checkout.session.completed"}'::jsonb,
           'cs_test_webhook_only',
           'pi_test_webhook_only'
         )`,
      );
      const row = await db.query<{ status: string }>(
        "select status from public.payments where id = $1",
        [started.rows[0]!.id],
      );
      expect(row.rows[0]?.status).toBe("pending");
    });
  });

  it("abandons an expired checkout and frees remaining balance", async () => {
    await asRole(db, "service_role", null, async () => {
      await db.query(
        `select public.begin_checkout(
           $1::uuid,
           array[$2]::uuid[],
           'cs_test_expired_session'
         )`,
        [PLAYER, PLAYER_CHARGE],
      );
      const reserved = await db.query<{ allocated_pence: number }>(
        "select public.allocated_pence($1::uuid) as allocated_pence",
        [PLAYER_CHARGE],
      );
      expect(reserved.rows[0]?.allocated_pence).toBeGreaterThan(0);
      await db.query(
        `select public.abandon_payment(
           p_stripe_checkout_session_id => 'cs_test_expired_session',
           p_status => 'expired'
         )`,
      );
      const freed = await db.query<{ allocated_pence: number }>(
        "select public.allocated_pence($1::uuid) as allocated_pence",
        [PLAYER_CHARGE],
      );
      expect(freed.rows[0]?.allocated_pence).toBe(0);
    });
  });
});
