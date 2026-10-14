function firstHop(value: string | null): string | null {
  const part = value?.split(",")[0]?.trim();
  return part || null;
}

function lastHop(value: string | null): string | null {
  const parts = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  return parts.at(-1) ?? null;
}

/**
 * Prefer platform-provided client IPs. Do not trust the leftmost
 * X-Forwarded-For value: clients can prepend a fake address.
 */
export function clientIp(request: Request): string {
  return (
    firstHop(request.headers.get("x-vercel-forwarded-for")) ||
    firstHop(request.headers.get("cf-connecting-ip")) ||
    firstHop(request.headers.get("x-real-ip")) ||
    lastHop(request.headers.get("x-forwarded-for")) ||
    "unknown"
  );
}
