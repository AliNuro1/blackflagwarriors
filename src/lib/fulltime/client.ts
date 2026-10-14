import {
  FA_FETCH_HEADERS,
  FA_REVALIDATE_SECONDS,
  faTableUrl,
  faTeamUrl,
} from "@/lib/fulltime/config";
import { blockedByCloudflare, parseBoard, type FaBoard } from "@/lib/fulltime/parse";

export type { FaBoard, FaMatch, FaTableRow } from "@/lib/fulltime/parse";

export type FaSnapshot =
  | { ok: true; board: FaBoard; fetchedAt: string }
  | { ok: false; error: string; teamUrl: string; tableUrl: string };

async function getHtml(url: string): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      headers: FA_FETCH_HEADERS,
      next: { revalidate: FA_REVALIDATE_SECONDS },
    });
    const html = await response.text();
    if (!response.ok || blockedByCloudflare(html)) {
      return {
        ok: false,
        error: `FA Full-Time returned ${response.status}. They block many automated requests, so this page falls back to their site until a fetch succeeds.`,
      };
    }
    return { ok: true, html };
  } catch {
    return { ok: false, error: "Could not reach FA Full-Time." };
  }
}

export async function loadFaBoard(): Promise<FaSnapshot> {
  const teamUrl = faTeamUrl();
  const fallbackTable = faTableUrl();
  const team = await getHtml(teamUrl);
  if (!team.ok) {
    return { ok: false, error: team.error, teamUrl, tableUrl: fallbackTable };
  }
  const board = parseBoard(team.html, null, teamUrl);
  const table = await getHtml(board.tableUrl);
  if (table.ok) {
    return {
      ok: true,
      board: parseBoard(team.html, table.html, teamUrl),
      fetchedAt: new Date().toISOString(),
    };
  }
  if (board.results.length === 0 && board.fixtures.length === 0) {
    return { ok: false, error: table.error, teamUrl, tableUrl: board.tableUrl };
  }
  return {
    ok: true,
    board,
    fetchedAt: new Date().toISOString(),
  };
}
