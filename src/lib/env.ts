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

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
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

  return parsed.data;
}

export function appUrl(env: Env = getEnv()): string {
  return env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:38471";
}

export function sessionSecret(env: Env = getEnv()): string {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return "black-flag-warriors-local-session-secret";
}

export function usesMockData(env: Env = getEnv()): boolean {
  return !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY;
}

export function usesMockAuth(env: Env = getEnv()): boolean {
  return (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_VERIFY_SERVICE_SID
  );
}

export function usesMockPayments(env: Env = getEnv()): boolean {
  return !env.STRIPE_SECRET_KEY;
}
