/** @vitest-environment node */
import { clientIp } from "@/lib/auth/client-ip";

describe("client IP", () => {
  it("does not trust a client-prepended X-Forwarded-For address", () => {
    const request = new Request("http://127.0.0.1:38471/api/auth/start", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.8" },
    });
    expect(clientIp(request)).toBe("10.0.0.8");
  });

  it("prefers the platform client IP over X-Forwarded-For", () => {
    const request = new Request("http://127.0.0.1:38471/api/auth/start", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 10.0.0.8",
        "x-vercel-forwarded-for": "203.0.113.9",
      },
    });
    expect(clientIp(request)).toBe("203.0.113.9");
  });
});
