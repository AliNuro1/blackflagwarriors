import { displayUkMobile, maskUkMobile, normalizeUkMobile } from "./phone";

describe("normalizeUkMobile", () => {
  it("accepts local 07 numbers", () => {
    expect(normalizeUkMobile("07700 900101")).toEqual({
      ok: true,
      e164: "+447700900101",
    });
  });

  it("accepts +44", () => {
    expect(normalizeUkMobile("+44 7700 900110")).toEqual({
      ok: true,
      e164: "+447700900110",
    });
  });

  it("rejects landlines", () => {
    expect(normalizeUkMobile("0161 123 4567").ok).toBe(false);
  });
});

describe("display helpers", () => {
  it("formats and masks", () => {
    expect(displayUkMobile("+447700900101")).toBe("07700 900 101");
    expect(maskUkMobile("+447700900101")).toBe("077*** ***101");
  });
});
