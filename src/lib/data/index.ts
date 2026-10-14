import { usesMockData } from "@/lib/env";
import { MockClubStore } from "./mock-store";
import { createSupabaseStore } from "./supabase-store";
import type { ClubStore } from "./types";

export function getStore(): ClubStore {
  if (usesMockData()) return new MockClubStore();
  return createSupabaseStore();
}

export type { ClubStore } from "./types";
