const UK_MOBILE = /^(?:\+44|44|0)7\d{9}$/;

export type PhoneResult =
  | { ok: true; e164: string }
  | { ok: false; error: string };

export function normalizeUkMobile(input: string): PhoneResult {
  const digits = input.replace(/[\s()-]/g, "");
  if (!UK_MOBILE.test(digits)) {
    return {
      ok: false,
      error: "Enter a UK mobile number, for example 07700 900101.",
    };
  }

  const national = digits.replace(/^(?:\+44|44|0)/, "");
  return { ok: true, e164: `+44${national}` };
}

export function displayUkMobile(e164: string): string {
  const national = e164.replace(/^\+44/, "0");
  if (national.length !== 11) return e164;
  return `${national.slice(0, 5)} ${national.slice(5, 8)} ${national.slice(8)}`;
}

export function maskUkMobile(e164: string): string {
  const national = e164.replace(/^\+44/, "0");
  if (national.length !== 11) return "UK mobile";
  return `${national.slice(0, 3)}*** ***${national.slice(-3)}`;
}
