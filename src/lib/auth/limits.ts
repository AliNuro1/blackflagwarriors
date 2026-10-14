import { createHmac } from "node:crypto";

export const START_WINDOW_MS = 15 * 60 * 1000;
export const START_PER_PHONE = 5;
export const START_PER_IP = 10;
export const START_COOLDOWN_MS = 45 * 1000;
export const VERIFY_WINDOW_MS = 10 * 60 * 1000;
export const VERIFY_PER_PHONE = 5;
export const VERIFY_PER_IP = 20;
export const SEND_DAY_MS = 24 * 60 * 60 * 1000;
export const SENDS_PER_PHONE_PER_DAY = 8;
export const SENDS_PER_IP_PER_DAY = 25;

type Bucket = { hits: number[]; last?: number };

const buckets = new Map<string, Bucket>();

export function hashSensitive(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 20);
}

export function resetRateLimits(): void {
  buckets.clear();
}

export function consume(
  key: string,
  options: { limit: number; windowMs: number; cooldownMs?: number; now?: number },
): "ok" | "limited" | "cooldown" {
  const now = options.now ?? Date.now();
  const cutoff = now - options.windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((stamp) => stamp > cutoff);

  if (options.cooldownMs && bucket.last !== undefined && now - bucket.last < options.cooldownMs) {
    buckets.set(key, bucket);
    return "cooldown";
  }
  if (bucket.hits.length >= options.limit) {
    buckets.set(key, bucket);
    return "limited";
  }

  bucket.hits.push(now);
  bucket.last = now;
  buckets.set(key, bucket);
  return "ok";
}
