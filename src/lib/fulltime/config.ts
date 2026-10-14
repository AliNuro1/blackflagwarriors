/** Manchester Amateur Sunday League — Black Flag Warriors on FA Full-Time. */
export const FA_TEAM_ID = "222271322";
export const FA_TEAM_LABEL = "Black Flag Warriors";
export const FA_LEAGUE_ID = "630725823";
export const FA_SEASON_ID = "171013629";
export const FA_DIVISION_ID = "477856515";
export const FA_FIXTURE_GROUP_KEY = "1_87082864";
/** Official Full-Time Code Snippets (Media → Code Snippets). */
export const FA_TABLE_LRCODE = "570008697";
export const FA_FIXTURES_LRCODE = "359240005";
export const FA_RESULTS_LRCODE = "415878258";
export const FA_DIVISION_SEASON = "87082864";

export const FA_ORIGIN = "https://fulltime.thefa.com";

export function faTeamUrl(teamId = FA_TEAM_ID): string {
  return `${FA_ORIGIN}/displayTeam.html?id=${teamId}`;
}

export function faTableUrl(params?: {
  leagueId?: string;
  seasonId?: string;
  divisionId?: string;
  fixtureGroupKey?: string;
}): string {
  const search = new URLSearchParams({
    league: params?.leagueId ?? FA_LEAGUE_ID,
    selectedSeason: params?.seasonId ?? FA_SEASON_ID,
    selectedDivision: params?.divisionId ?? FA_DIVISION_ID,
    selectedCompetition: "0",
    selectedFixtureGroupKey: params?.fixtureGroupKey ?? FA_FIXTURE_GROUP_KEY,
  });
  return `${FA_ORIGIN}/table.html?${search.toString()}`;
}

export const FA_FETCH_HEADERS = {
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "User-Agent":
    "BlackFlagWarriorsPayments/0.1 (club site; +https://blackflagwarriors) AppleWebKit/605.1.15",
} as const;

export const FA_REVALIDATE_SECONDS = 600;
