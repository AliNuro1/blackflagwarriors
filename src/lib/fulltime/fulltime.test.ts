/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { FA_FIXTURES_LRCODE, FA_RESULTS_LRCODE, FA_TABLE_LRCODE, FA_TEAM_ID } from "@/lib/fulltime/config";
import {
  blockedByCloudflare,
  discoverTableUrl,
  parseTablePage,
  parseTeamPage,
  tidyClubName,
} from "@/lib/fulltime/parse";

const teamHtml = `
  <h2>Latest Results</h2>
  <table>
    <tr><th>Type</th><th>Date / Time</th><th>Home Team</th><th></th><th>Away Team</th></tr>
    <tr>
      <td>Cup</td><td>11/10/26 11:00</td>
      <td>Black Flag Warriors Black Flag Warriors</td><td></td>
      <td>5 - 1 (HT 3-1)</td><td></td>
      <td>Trafford Park FC First</td>
    </tr>
    <tr>
      <td>L</td><td>20/09/26 11:00</td>
      <td>Manchester South End FC MSE White</td><td></td>
      <td>5 - 1 (HT 0-0)</td><td></td>
      <td>Black Flag Warriors Black Flag Warriors</td>
    </tr>
  </table>
  <h2>Upcoming Fixtures</h2>
  <table>
    <tr><th>Type</th><th>Date / Time</th><th>Home Team</th><th></th><th>Away Team</th><th>Venue</th></tr>
    <tr>
      <td>Cup</td><td>25/10/26 11:00</td>
      <td>Beech Inn FC Sunday</td><td></td>
      <td>VS</td><td></td>
      <td>Black Flag Warriors Black Flag Warriors</td>
      <td>TURN MOSS PARK</td>
    </tr>
  </table>
  <a href="/table.html?league=630725823&amp;selectedSeason=171013629&amp;selectedDivision=477856515&amp;selectedCompetition=0&amp;selectedFixtureGroupKey=1_87082864">Tables</a>
`;

const tableHtml = `
  <h2>Division 2</h2>
  <table class="cell-dividers">
    <thead><tr><th>POS</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>PTS</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>NFA FC NFA FC</td><td>4</td><td>3</td><td>1</td><td>0</td><td>13</td><td>10</td></tr>
      <tr><td>5</td><td><a href="/displayTeam.html?teamID=${FA_TEAM_ID}">Black Flag Warriors Black Flag Warriors</a></td><td>2</td><td>2</td><td>0</td><td>0</td><td>8</td><td>6</td></tr>
    </tbody>
  </table>
  <table>
    <tr><th>Home</th><th>Away</th><th>Overall</th></tr>
    <tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>F</th><th>A</th><th>W</th><th>D</th><th>L</th><th>F</th><th>A</th><th>W</th><th>D</th><th>L</th><th>F</th><th>A</th><th>GD</th><th>PTS</th></tr>
  </table>
`;

describe("FA Full-Time parse", () => {
  it("collapses the FA doubled club name", () => {
    expect(tidyClubName("Black Flag Warriors Black Flag Warriors")).toBe("Black Flag Warriors");
  });

  it("reads results and fixtures from the team page", () => {
    const { results, fixtures } = parseTeamPage(teamHtml);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      home: "Black Flag Warriors",
      away: "Trafford Park FC First",
      homeGoals: 5,
      awayGoals: 1,
      ours: "home",
      outcome: "win",
    });
    expect(results[1]).toMatchObject({ ours: "away", outcome: "loss" });
    expect(fixtures[0]).toMatchObject({
      home: "Beech Inn FC Sunday",
      away: "Black Flag Warriors",
      venue: "TURN MOSS PARK",
      ours: "away",
    });
  });

  it("reads the compact division table and flags our row", () => {
    const table = parseTablePage(tableHtml);
    expect(table).toHaveLength(2);
    expect(table[1]).toMatchObject({
      position: 5,
      team: "Black Flag Warriors",
      played: 2,
      points: 6,
      isUs: true,
    });
  });

  it("discovers the current season table URL from the team page", () => {
    expect(discoverTableUrl(teamHtml)).toContain("selectedSeason=171013629");
    expect(discoverTableUrl(teamHtml)).toContain("selectedDivision=477856515");
  });

  it("keeps the official Full-Time snippet codes", () => {
    expect(FA_TABLE_LRCODE).toBe("570008697");
    expect(FA_FIXTURES_LRCODE).toBe("359240005");
    expect(FA_RESULTS_LRCODE).toBe("415878258");
  });

  it("spots a Cloudflare block page", () => {
    expect(blockedByCloudflare("<title>Attention Required!</title>")).toBe(true);
    expect(blockedByCloudflare(teamHtml)).toBe(false);
  });
});
