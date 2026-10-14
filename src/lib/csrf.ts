export class CsrfError extends Error {
  constructor(message = "Cross-origin request blocked.") {
    super(message);
    this.name = "CsrfError";
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let incoming: string;
  try {
    incoming = new URL(origin).origin;
  } catch {
    throw new CsrfError();
  }
  const expected = new URL(request.url).origin;
  if (incoming !== expected) {
    throw new CsrfError();
  }
}
