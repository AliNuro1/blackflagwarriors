/** @vitest-environment node */
import {
  newSessionRecord,
  sealSession,
  unsealSession,
  readSessionPlayerIdFromCookie,
} from "@/lib/auth/session-seal";

describe("encrypted sessions", () => {
  it("round-trips a player id", async () => {
    const record = newSessionRecord("11111111-1111-4111-8111-111111111101", 1_000);
    const token = await sealSession(record);
    const opened = await unsealSession(token, { now: 1_000 });
    expect(opened?.playerId).toBe(record.playerId);
  });

  it("treats an expired session as unauthenticated", async () => {
    const record = newSessionRecord("11111111-1111-4111-8111-111111111101", 1_000, 1);
    const token = await sealSession(record);
    const opened = await unsealSession(token, { now: 1_000 + 2_000 });
    expect(opened).toBeNull();
  });

  it("does not accept a missing or forged cookie as a session", async () => {
    expect(await readSessionPlayerIdFromCookie(undefined)).toBeNull();
    expect(await unsealSession("not-a-session")).toBeNull();
  });
});
