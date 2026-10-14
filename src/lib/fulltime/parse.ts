import { FA_TEAM_LABEL, faTableUrl } from "@/lib/fulltime/config";

export type FaMatch = {
  type: string;
  dateTime: string;
  home: string;
  away: string;
  venue?: string;
  score?: string;
  homeGoals?: number;
  awayGoals?: number;
  ours: "home" | "away" | "unknown";
  outcome?: "win" | "draw" | "loss";
};

export type FaTableRow = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
  isUs: boolean;
};

export type FaBoard = {
  results: FaMatch[];
  fixtures: FaMatch[];
  table: FaTableRow[];
  tableUrl: string;
  teamUrl: string;
};

const ENTITY: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  nbsp: " ",
  apos: "'",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, token: string) => {
    if (token[0] === "#") {
      const hex = token[1] === "x" || token[1] === "X";
      const code = Number.parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : full;
    }
    return ENTITY[token.toLowerCase()] ?? full;
  });
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function tidyClubName(name: string): string {
  const text = stripTags(name);
  const doubled = text.match(/^(.+?)\s+\1$/);
  return doubled ? doubled[1] : text;
}

export function isOurTeam(name: string): boolean {
  return tidyClubName(name).toLowerCase().includes(FA_TEAM_LABEL.toLowerCase());
}

export function extractTables(html: string): string[] {
  return [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((match) => match[0]);
}

export function tableRows(tableHtml: string): string[][] {
  const rows = [...tableHtml.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
  return rows
    .map((row) =>
      [...row.matchAll(/<t[hd]\b[\s\S]*?<\/t[hd]>/gi)].map((cell) => stripTags(cell[0])),
    )
    .filter((cells) => cells.some((cell) => cell.length > 0));
}

function cellsWithoutBlanks(cells: string[]): string[] {
  return cells.filter((cell) => cell.length > 0);
}

function parseScore(text: string): { score: string; homeGoals?: number; awayGoals?: number } {
  const match = text.match(/^(\d+)\s*[-–]\s*(\d+)(.*)$/);
  if (!match) return { score: text };
  return {
    score: text,
    homeGoals: Number(match[1]),
    awayGoals: Number(match[2]),
  };
}

function oursSide(home: string, away: string): FaMatch["ours"] {
  if (isOurTeam(home) && !isOurTeam(away)) return "home";
  if (isOurTeam(away) && !isOurTeam(home)) return "away";
  return "unknown";
}

function outcomeFor(
  ours: FaMatch["ours"],
  homeGoals?: number,
  awayGoals?: number,
): FaMatch["outcome"] {
  if (ours === "unknown" || homeGoals === undefined || awayGoals === undefined) return undefined;
  if (homeGoals === awayGoals) return "draw";
  const weWon = ours === "home" ? homeGoals > awayGoals : awayGoals > homeGoals;
  return weWon ? "win" : "loss";
}

function parseMatchRow(cells: string[], kind: "result" | "fixture"): FaMatch | null {
  const compact = cellsWithoutBlanks(cells);
  if (compact.length < 4) return null;
  const type = compact[0];
  if (/^type$/i.test(type) || /^pos$/i.test(type)) return null;
  const dateTime = compact[1];
  if (kind === "fixture") {
    const vsIndex = compact.findIndex((cell) => /^vs$/i.test(cell));
    if (vsIndex < 2 || vsIndex + 1 >= compact.length) return null;
    const home = tidyClubName(compact[2]);
    const away = tidyClubName(compact[vsIndex + 1]);
    const venue = compact[vsIndex + 2];
    return {
      type,
      dateTime,
      home,
      away,
      venue,
      ours: oursSide(home, away),
    };
  }
  const scoreIndex = compact.findIndex((cell) => /\d+\s*[-–]\s*\d+/.test(cell));
  if (scoreIndex < 3 || scoreIndex + 1 >= compact.length) return null;
  const home = tidyClubName(compact[2]);
  const away = tidyClubName(compact[scoreIndex + 1]);
  const scored = parseScore(compact[scoreIndex]);
  const ours = oursSide(home, away);
  return {
    type,
    dateTime,
    home,
    away,
    score: scored.score,
    homeGoals: scored.homeGoals,
    awayGoals: scored.awayGoals,
    ours,
    outcome: outcomeFor(ours, scored.homeGoals, scored.awayGoals),
  };
}

function tableAfterHeading(html: string, heading: string): string | null {
  const headingMatch = html.match(new RegExp(`>(\\s*${heading}\\s*)<`, "i"));
  if (!headingMatch || headingMatch.index === undefined) return null;
  const from = html.slice(headingMatch.index);
  const table = from.match(/<table\b[\s\S]*?<\/table>/i);
  return table ? table[0] : null;
}

export function parseTeamPage(html: string): { results: FaMatch[]; fixtures: FaMatch[] } {
  const resultsTable = tableAfterHeading(html, "Latest Results");
  const fixturesTable = tableAfterHeading(html, "Upcoming Fixtures");
  const results = resultsTable
    ? tableRows(resultsTable)
        .map((row) => parseMatchRow(row, "result"))
        .filter((row): row is FaMatch => row !== null)
    : [];
  const fixtures = fixturesTable
    ? tableRows(fixturesTable)
        .map((row) => parseMatchRow(row, "fixture"))
        .filter((row): row is FaMatch => row !== null)
    : [];
  return { results, fixtures };
}

export function parseTablePage(html: string): FaTableRow[] {
  const tables = extractTables(html);
  for (const table of tables) {
    const rows = tableRows(table);
    if (rows.length < 2) continue;
    const header = rows[0].map((cell) => cell.toUpperCase());
    if (!(header.includes("POS") && header.includes("PTS") && header.includes("TEAM"))) continue;
    if (header.includes("F") && header.filter((cell) => cell === "W").length > 1) continue;
    const pos = header.indexOf("POS");
    const team = header.indexOf("TEAM");
    const played = header.indexOf("P");
    const won = header.indexOf("W");
    const drawn = header.indexOf("D");
    const lost = header.indexOf("L");
    const gd = header.indexOf("GD");
    const pts = header.lastIndexOf("PTS");
    return rows
      .slice(1)
      .map((row) => {
        const name = tidyClubName(row[team] ?? "");
        const position = Number(row[pos]);
        if (!name || !Number.isFinite(position)) return null;
        return {
          position,
          team: name,
          played: Number(row[played]) || 0,
          won: Number(row[won]) || 0,
          drawn: Number(row[drawn]) || 0,
          lost: Number(row[lost]) || 0,
          goalDifference: Number(row[gd]) || 0,
          points: Number(row[pts]) || 0,
          isUs: isOurTeam(name),
        };
      })
      .filter((row): row is FaTableRow => row !== null);
  }
  return [];
}

export function discoverTableUrl(teamHtml: string): string {
  const match = teamHtml.match(
    /table\.html\?league=(\d+)&(?:amp;)?selectedSeason=(\d+)&(?:amp;)?selectedDivision=(\d+)&(?:amp;)?selectedCompetition=0&(?:amp;)?selectedFixtureGroupKey=([^"'&\s]+)/i,
  );
  if (!match) {
    return faTableUrl();
  }
  return faTableUrl({
    leagueId: match[1],
    seasonId: match[2],
    divisionId: match[3],
    fixtureGroupKey: decodeEntities(match[4]),
  });
}

export function parseBoard(teamHtml: string, tableHtml: string | null, teamUrl: string): FaBoard {
  const { results, fixtures } = parseTeamPage(teamHtml);
  const tableUrl = discoverTableUrl(teamHtml);
  return {
    results,
    fixtures,
    table: tableHtml ? parseTablePage(tableHtml) : [],
    tableUrl,
    teamUrl,
  };
}

export function blockedByCloudflare(html: string): boolean {
  return /Attention Required/i.test(html) || /cf-browser-verification/i.test(html);
}
