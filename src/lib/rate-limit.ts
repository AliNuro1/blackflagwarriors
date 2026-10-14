type Bucket = number[];

const windows = new Map<string, Bucket>();

export function takeToken(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const cutoff = now - windowMs;
  const recent = (windows.get(key) ?? []).filter((stamp) => stamp > cutoff);
  if (recent.length >= limit) {
    windows.set(key, recent);
    return false;
  }
  recent.push(now);
  windows.set(key, recent);
  return true;
}

export function resetRateLimits(): void {
  windows.clear();
}
