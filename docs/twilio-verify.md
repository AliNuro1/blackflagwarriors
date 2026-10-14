# Twilio Verify for Black Flag Warriors

SMS one-time codes are created and checked **only** by Twilio Verify. This app never stores or compares OTP values itself.

## Environment variables (server-only)

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID (`AC…`) |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio auth token |
| `TWILIO_VERIFY_SERVICE_SID` | Yes | Verify service SID (`VA…`) |
| `SESSION_SECRET` | Yes, ≥ 32 characters | Encrypts HttpOnly session cookies (`iron-session`) |
| `AUTH_DEV_MOCK` | No | `true` enables a **development-only** mock that accepts code `000000` and does not send SMS. **Forbidden in production.** |

Never prefix Twilio secrets with `NEXT_PUBLIC_`. The browser never receives them.

If Twilio is unset in `development`, mock mode turns on automatically and the UI is labelled **Development-only mock**. Production refuses to boot without real Twilio credentials, and refuses `AUTH_DEV_MOCK=true`.

## Configure a Verify service

1. Create a Twilio account and note the Account SID and Auth Token from the console.
2. Open **Verify** → **Services** → **Create new**.
3. Name it e.g. `black-flag-warriors-login`. Enable the **SMS** channel. Leave friendly-name optional.
4. Copy the Service SID (`VA…`) into `TWILIO_VERIFY_SERVICE_SID`.
5. Geographic permissions: in Twilio Console → **Messaging** → **Geo permissions** (or Verify geo settings), allow **United Kingdom**. The app only accepts UK mobiles (`+44` / `07…`). Confirm a real `+44` Verify SMS in the Twilio logs before production.
6. Optional: set Verify **max check attempts** in the Twilio console as a second limit on top of this app’s rate limits.
7. Put the three Twilio values and `SESSION_SECRET` in `.env.local` on the server (or your host’s secret store). Restart the app.

## What the app calls

- `client.verify.v2.services(sid).verifications.create({ to, channel: "sms" })`
- `client.verify.v2.services(sid).verificationChecks.create({ to, code })`

`to` is always E.164 from `libphonenumber-js`. A code is accepted only when Twilio returns `status === "approved"` **and** that number belongs to an **active** row in `profiles`.
