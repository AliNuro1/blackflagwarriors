import { parsePhoneNumberFromString } from "libphonenumber-js";

export type PhoneResult =
  | { ok: true; e164: string }
  | { ok: false; error: string };

const GENERIC_PHONE_ERROR = "Enter a UK mobile number, for example 07700 900101.";

export function normalizeUkMobile(input: string): PhoneResult {
  const parsed = parsePhoneNumberFromString(input.trim(), "GB");
  if (!parsed || parsed.countryCallingCode !== "44") {
    return { ok: false, error: GENERIC_PHONE_ERROR };
  }

  const national = parsed.nationalNumber.toString();
  if (!/^7\d{9}$/.test(national)) {
    return { ok: false, error: GENERIC_PHONE_ERROR };
  }

  return { ok: true, e164: `+44${national}` };
}

export function displayUkMobile(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (parsed) {
    const formatted = parsed.formatNational();
    if (formatted) return formatted;
  }
  const national = e164.replace(/^\+44/, "0");
  if (national.length === 11) {
    return `${national.slice(0, 5)} ${national.slice(5, 8)} ${national.slice(8)}`;
  }
  return e164;
}

export function maskUkMobile(e164: string): string {
  const national = e164.replace(/^\+44/, "0");
  if (national.length !== 11) return "UK mobile";
  return `${national.slice(0, 3)}*** ***${national.slice(-3)}`;
}
