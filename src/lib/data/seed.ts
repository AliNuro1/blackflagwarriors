import type { Charge, Player } from "./types";

export const DEMO_OTP = "000000";
export const DEMO_PLAYER_PHONE = "+447700900101";
export const DEMO_ADMIN_PHONE = "+447700900110";
export const DEMO_INACTIVE_PHONE = "+447700900199";
export const DEMO_TREASURER_PHONE = DEMO_ADMIN_PHONE;

const timestamps = {
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

export const seedPlayers: Player[] = [
  { id: "11111111-1111-4111-8111-111111111101", phoneE164: DEMO_PLAYER_PHONE, fullName: "Alex Reed", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111102", phoneE164: "+447700900102", fullName: "Jordan Blake", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111103", phoneE164: "+447700900103", fullName: "Sam Cole", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111104", phoneE164: "+447700900104", fullName: "Riley Shah", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111105", phoneE164: "+447700900105", fullName: "Morgan Ellis", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111106", phoneE164: "+447700900106", fullName: "Chris Nolan", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111107", phoneE164: "+447700900107", fullName: "Pat Murray", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111108", phoneE164: "+447700900108", fullName: "Taylor Quinn", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111109", phoneE164: "+447700900109", fullName: "Jamie Frost", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111110", phoneE164: DEMO_ADMIN_PHONE, fullName: "Priya Khan", role: "admin", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111111", phoneE164: "+447700900111", fullName: "Drew McAllister", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111112", phoneE164: "+447700900112", fullName: "Ben Cartwright", role: "player", status: "active", ...timestamps },
  { id: "11111111-1111-4111-8111-111111111199", phoneE164: DEMO_INACTIVE_PHONE, fullName: "Robin Shaw", role: "player", status: "inactive", ...timestamps },
];

function charge(
  id: string,
  playerId: string,
  category: Charge["category"],
  description: string,
  amountPence: number,
  dueOn: string,
  status: Charge["status"],
  remainingPence = status === "paid" ? 0 : amountPence,
): Charge {
  return {
    id,
    playerId,
    category,
    description,
    amountPence,
    remainingPence,
    dueOn,
    status,
    createdAt: `${dueOn}T09:00:00.000Z`,
  };
}

const alex = seedPlayers[0]!.id;
const jordan = seedPlayers[1]!.id;
const priya = seedPlayers[9]!.id;
const sam = seedPlayers[2]!.id;

export const seedCharges: Charge[] = [
  charge("22222222-2222-4222-8222-222222222201", alex, "match_fee", "Match fee · vs FC Didsbury, 4 October", 800, "2026-10-04", "open"),
  charge("22222222-2222-4222-8222-222222222202", alex, "match_fee", "Match fee · vs Chorlton Athletic, 11 October", 800, "2026-10-11", "open"),
  charge("22222222-2222-4222-8222-222222222203", alex, "league_subs", "League and affiliation subs 2026/27", 4000, "2026-09-01", "open"),
  charge("22222222-2222-4222-8222-222222222204", alex, "training", "Training · October, Hough End", 1000, "2026-10-01", "paid"),
  charge("22222222-2222-4222-8222-222222222205", alex, "kit", "Home shirt deposit", 2500, "2026-08-15", "paid"),
  charge("22222222-2222-4222-8222-222222222206", jordan, "match_fee", "Match fee · vs Chorlton Athletic, 11 October", 800, "2026-10-11", "open"),
  charge("22222222-2222-4222-8222-222222222207", jordan, "fine", "Late to kick-off · 4 October", 500, "2026-10-04", "open"),
  charge("22222222-2222-4222-8222-222222222208", priya, "match_fee", "Match fee · vs Chorlton Athletic, 11 October", 800, "2026-10-11", "paid"),
  charge("22222222-2222-4222-8222-222222222209", sam, "kit", "Keeper glove contribution", 1500, "2026-09-20", "open"),
];
