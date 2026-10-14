/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEnv } from "@/lib/env";

const keys = [
  "NODE_ENV",
  "SESSION_SECRET",
  "AUTH_DEV_MOCK",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
] as const;

const snapshot: Record<string, string | undefined> = {};

function setProductionBase(): void {
  process.env.NODE_ENV = "production";
  process.env.SESSION_SECRET = "production-session-secret-at-least-32-chars";
  process.env.AUTH_DEV_MOCK = "";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  process.env.TWILIO_ACCOUNT_SID = "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  process.env.TWILIO_AUTH_TOKEN = "token";
  process.env.TWILIO_VERIFY_SERVICE_SID = "VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_placeholder";
  delete process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
}

describe("production environment", () => {
  beforeEach(() => {
    for (const key of keys) snapshot[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of keys) {
      const value = snapshot[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("boots when all production secrets are present", () => {
    setProductionBase();
    expect(getEnv().NODE_ENV).toBe("production");
  });

  it("refuses AUTH_DEV_MOCK in production", () => {
    setProductionBase();
    process.env.AUTH_DEV_MOCK = "true";
    expect(() => getEnv()).toThrow(/AUTH_DEV_MOCK/);
  });

  it("boots public pages in production without Twilio, Supabase, or Stripe", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_DEV_MOCK = "";
    delete process.env.SESSION_SECRET;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(getEnv().NODE_ENV).toBe("production");
  });

  it("refuses a public Stripe secret", () => {
    setProductionBase();
    process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY = "sk_test_leaked";
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC/);
  });
});
