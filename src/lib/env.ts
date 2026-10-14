import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.string().url().optional(),
);

const optionalString = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  SESSION_SECRET: optionalString,
  AUTH_DEV_MOCK: optionalString,
  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_VERIFY_SERVICE_SID: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must never be exposed as NEXT_PUBLIC_*. Keep it server-only.",
    );
  }
  if (process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN || process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID) {
    throw new Error("Twilio credentials must never be exposed as NEXT_PUBLIC_*.");
  }

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    AUTH_DEV_MOCK: process.env.AUTH_DEV_MOCK,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  });

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  if (parsed.data.NODE_ENV === "production" && parsed.data.AUTH_DEV_MOCK === "true") {
    throw new Error("AUTH_DEV_MOCK cannot be enabled in production.");
  }

  if (
    parsed.data.NODE_ENV === "production" &&
    (!parsed.data.TWILIO_ACCOUNT_SID ||
      !parsed.data.TWILIO_AUTH_TOKEN ||
      !parsed.data.TWILIO_VERIFY_SERVICE_SID)
  ) {
    throw new Error("Twilio Verify is required in production.");
  }

  if (parsed.data.NODE_ENV === "production" && (parsed.data.SESSION_SECRET?.length ?? 0) < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }

  return parsed.data;
}

export function appUrl(env: Env = getEnv()): string {
  return env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:38471";
}

export function sessionSecret(env: Env = getEnv()): string {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 32) return env.SESSION_SECRET;
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return "black-flag-warriors-local-session-secret";
}

export function twilioConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID);
}

export function isDevMockAuth(env: Env = getEnv()): boolean {
  if (env.NODE_ENV === "production") return false;
  if (env.AUTH_DEV_MOCK === "true") return true;
  if (env.NODE_ENV === "test") return false;
  return !twilioConfigured(env);
}

export function usesMockData(env: Env = getEnv()): boolean {
  return !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY;
}

export function usesMockAuth(env: Env = getEnv()): boolean {
  return isDevMockAuth(env);
}

export function usesMockPayments(env: Env = getEnv()): boolean {
  return !env.STRIPE_SECRET_KEY;
}
