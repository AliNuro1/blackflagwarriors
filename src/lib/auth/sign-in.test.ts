/** @vitest-environment node */
import { DEMO_INACTIVE_PHONE, DEMO_PLAYER_PHONE } from "@/lib/data/seed";
import { MockClubStore, resetMockStore } from "@/lib/data/mock-store";
import { resetRateLimits, START_PER_PHONE, VERIFY_PER_PHONE } from "@/lib/auth/limits";
import { confirmSignIn, startSignIn } from "@/lib/auth/sign-in";
import type { TwilioVerifyClient } from "@/lib/auth/twilio-verify";

function fakeTwilio(): TwilioVerifyClient & { sent: string[]; checks: string[] } {
  const sent: string[] = [];
  const checks: string[] = [];
  return {
    sent,
    checks,
    async sendSms(to) {
      sent.push(to);
    },
    async checkCode(to, code) {
      checks.push(`${to}:${code}`);
      return code === "123456";
    },
  };
}

describe("phone sign-in", () => {
  beforeEach(() => {
    resetMockStore();
    resetRateLimits();
  });

  it("sends Twilio Verify SMS only for an active registered player", async () => {
    const twilio = fakeTwilio();
    const result = await startSignIn({
      phone: "07700 900101",
      ip: "1.1.1.1",
      store: new MockClubStore(),
      twilio,
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true });
    expect(twilio.sent).toEqual([DEMO_PLAYER_PHONE]);
  });

  it("returns the same success for an unregistered number and does not send SMS", async () => {
    const twilio = fakeTwilio();
    const result = await startSignIn({
      phone: "07700 900333",
      ip: "1.1.1.2",
      store: new MockClubStore(),
      twilio,
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual(
      (await startSignIn({
        phone: "07700 900101",
        ip: "1.1.1.3",
        store: new MockClubStore(),
        twilio: fakeTwilio(),
      })).body,
    );
    expect(twilio.sent).toEqual([]);
  });

  it("does not send SMS to an inactive player", async () => {
    const twilio = fakeTwilio();
    const result = await startSignIn({
      phone: "07700 900199",
      ip: "1.1.1.4",
      store: new MockClubStore(),
      twilio,
    });
    expect(result.status).toBe(200);
    expect(twilio.sent).toEqual([]);
    expect(DEMO_INACTIVE_PHONE).toBe("+447700900199");
  });

  it("rejects a landline", async () => {
    const result = await startSignIn({
      phone: "0161 123 4567",
      ip: "1.1.1.5",
      store: new MockClubStore(),
      twilio: fakeTwilio(),
    });
    expect(result.status).toBe(400);
  });

  it("accepts a valid Twilio code for an active player", async () => {
    const twilio = fakeTwilio();
    const result = await confirmSignIn({
      code: "123456",
      pendingPhone: DEMO_PLAYER_PHONE,
      ip: "2.2.2.2",
      store: new MockClubStore(),
      twilio,
    });
    expect(result.status).toBe(200);
    expect(result.playerId).toBe("11111111-1111-4111-8111-111111111101");
    expect(twilio.checks[0]).toContain("123456");
  });

  it("rejects an invalid Twilio code", async () => {
    const result = await confirmSignIn({
      code: "000111",
      pendingPhone: DEMO_PLAYER_PHONE,
      ip: "2.2.2.3",
      store: new MockClubStore(),
      twilio: fakeTwilio(),
    });
    expect(result.status).toBe(400);
    expect(result.playerId).toBeUndefined();
  });

  it("does not create a session for an unregistered number even if Twilio approves", async () => {
    const twilio: TwilioVerifyClient = {
      async sendSms() {},
      async checkCode() {
        return true;
      },
    };
    const result = await confirmSignIn({
      code: "123456",
      pendingPhone: "+447700900333",
      ip: "2.2.2.4",
      store: new MockClubStore(),
      twilio,
    });
    expect(result.status).toBe(400);
    expect(result.playerId).toBeUndefined();
  });

  it("does not create a session for an inactive player even if Twilio approves", async () => {
    const twilio: TwilioVerifyClient = {
      async sendSms() {},
      async checkCode() {
        return true;
      },
    };
    const result = await confirmSignIn({
      code: "123456",
      pendingPhone: DEMO_INACTIVE_PHONE,
      ip: "2.2.2.5",
      store: new MockClubStore(),
      twilio,
    });
    expect(result.status).toBe(400);
    expect(result.playerId).toBeUndefined();
  });

  it("rate-limits sign-in starts per phone", async () => {
    const store = new MockClubStore();
    const twilio = fakeTwilio();
    let last = await startSignIn({ phone: "07700 900101", ip: "9.9.9.1", store, twilio, now: 1_000 });
    for (let i = 1; i < START_PER_PHONE; i += 1) {
      last = await startSignIn({
        phone: "07700 900101",
        ip: `9.9.9.${i + 1}`,
        store,
        twilio,
        now: 1_000 + i * 60_000,
      });
    }
    expect(last.status).toBe(200);
    const limited = await startSignIn({
      phone: "07700 900101",
      ip: "9.9.9.99",
      store,
      twilio,
      now: 1_000 + START_PER_PHONE * 60_000,
    });
    expect(limited.status).toBe(429);
  });

  it("enforces a resend cooldown", async () => {
    const store = new MockClubStore();
    const twilio = fakeTwilio();
    await startSignIn({ phone: "07700 900102", ip: "8.8.8.1", store, twilio, now: 5_000 });
    const cooled = await startSignIn({
      phone: "07700 900102",
      ip: "8.8.8.2",
      store,
      twilio,
      now: 10_000,
    });
    expect(cooled.status).toBe(429);
  });

  it("rate-limits code checks", async () => {
    const store = new MockClubStore();
    const twilio = fakeTwilio();
    for (let i = 0; i < VERIFY_PER_PHONE; i += 1) {
      await confirmSignIn({
        code: "000111",
        pendingPhone: DEMO_PLAYER_PHONE,
        ip: `7.7.7.${i}`,
        store,
        twilio,
        now: 20_000 + i,
      });
    }
    const limited = await confirmSignIn({
      code: "123456",
      pendingPhone: DEMO_PLAYER_PHONE,
      ip: "7.7.7.9",
      store,
      twilio,
      now: 20_100,
    });
    expect(limited.status).toBe(429);
  });

  it("rejects verification without a pending sign-in", async () => {
    const result = await confirmSignIn({
      code: "123456",
      pendingPhone: null,
      ip: "5.5.5.5",
      store: new MockClubStore(),
      twilio: fakeTwilio(),
    });
    expect(result.status).toBe(401);
  });
});
