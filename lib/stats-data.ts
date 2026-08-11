import 'server-only';

import { cache } from 'react';
import type { SiteData } from './league-types';
import { createAdminClient } from './supabase-admin';

type Row = Record<string, unknown>;

export type StatsCompetition = {
  id: string;
  sourceId: string;
  kind: 'season' | 'tournament';
  name: string;
  isCurrent: boolean;
  startsAt: string;
};

export type CompetitionStatLine = {
  competitionId: string;
  targetId: string;
  playerId: string;
  teamId: string;
  gamesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
};

export type CompetitionResult = {
  competitionId: string;
  targetId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

export type StatsExplorerData = {
  competitions: StatsCompetition[];
  lines: CompetitionStatLine[];
  results: CompetitionResult[];
  initialCompetitionId: string;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const number = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object') : [];

async function loadStatsExplorerData(siteData: SiteData): Promise<StatsExplorerData> {
  const supabase = createAdminClient();
  const fallbackCompetitionId = `season:${siteData.season.id}`;
  const fallback: StatsExplorerData = {
    competitions: siteData.seasons.map((season) => ({
      id: `season:${season.id}`,
      sourceId: season.id,
      kind: 'season',
      name: season.name,
      isCurrent: season.isCurrent,
      startsAt: season.startsOn,
    })),
    lines: siteData.players.filter((player) => player.stats.gamesPlayed > 0).map((player) => ({
      competitionId: fallbackCompetitionId,
      targetId: `fallback:${player.id}`,
      playerId: player.id,
      teamId: player.teamId,
      gamesPlayed: player.stats.gamesPlayed,
      points: player.stats.pointsPerGame * player.stats.gamesPlayed,
      rebounds: player.stats.reboundsPerGame * player.stats.gamesPlayed,
      assists: player.stats.assistsPerGame * player.stats.gamesPlayed,
      steals: player.stats.stealsPerGame * player.stats.gamesPlayed,
      blocks: player.stats.blocksPerGame * player.stats.gamesPlayed,
      fieldGoalsMade: player.stats.fieldGoalPct,
      fieldGoalsAttempted: player.stats.fieldGoalPct ? 100 : 0,
      threePointersMade: player.stats.threePointPct,
      threePointersAttempted: player.stats.threePointPct ? 100 : 0,
    })),
    results: siteData.games.filter((game) => game.status === 'final' && game.homeScore !== null && game.awayScore !== null).map((game) => ({
      competitionId: `season:${game.seasonId}`,
      targetId: game.id,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: game.homeScore!,
      awayScore: game.awayScore!,
    })),
    initialCompetitionId: fallbackCompetitionId,
  };
  if (!supabase) return fallback;

  try {
    const [seasonsResult, tournamentsResult, gamesResult, leagueStatsResult, matchesResult, importsResult] = await Promise.all([
      supabase.from('seasons').select('id, name, status, is_public, starts_on').eq('is_public', true).order('starts_on', { ascending: false }),
      supabase.from('tournaments').select('id, name, status, is_public, starts_at').eq('is_public', true).order('starts_at', { ascending: false }),
      supabase.from('games').select('id, season_id, status, home_team_id, away_team_id, home_score, away_score').eq('status', 'final'),
      supabase.from('player_game_stats').select('game_id, player_id, team_id, did_play, points, rebounds, assists, steals, blocks, field_goals_made, field_goals_attempted, three_pointers_made, three_pointers_attempted').eq('did_play', true),
      supabase.from('tournament_matches').select('id, tournament_id, status, home_team_id, away_team_id, home_score, away_score').eq('status', 'final'),
      supabase.from('stat_imports').select('tournament_match_id, status, reviewed_rows, confirmed_at').eq('status', 'confirmed').not('tournament_match_id', 'is', null).order('confirmed_at', { ascending: false }),
    ]);

    const seasonRows = rows(seasonsResult.data);
    const tournamentRows = rows(tournamentsResult.data);
    const competitions: StatsCompetition[] = [
      ...seasonRows.map((row) => ({
        id: `season:${text(row.id)}`,
        sourceId: text(row.id),
        kind: 'season' as const,
        name: text(row.name) || 'Unnamed season',
        isCurrent: text(row.status) === 'active',
        startsAt: text(row.starts_on),
      })),
      ...tournamentRows.map((row) => ({
        id: `tournament:${text(row.id)}`,
        sourceId: text(row.id),
        kind: 'tournament' as const,
        name: text(row.name) || 'Unnamed tournament',
        isCurrent: text(row.status) === 'active',
        startsAt: text(row.starts_at),
      })),
    ];
    if (!competitions.length) return fallback;

    const gameRows = rows(gamesResult.data);
    const gameById = new Map(gameRows.map((row) => [text(row.id), row]));
    const matchRows = rows(matchesResult.data);
    const matchById = new Map(matchRows.map((row) => [text(row.id), row]));
    const lines: CompetitionStatLine[] = rows(leagueStatsResult.data).flatMap((row) => {
      const game = gameById.get(text(row.game_id));
      if (!game) return [];
      return [{
        competitionId: `season:${text(game.season_id)}`,
        targetId: text(row.game_id),
        playerId: text(row.player_id),
        teamId: text(row.team_id),
        gamesPlayed: 1,
        points: number(row.points),
        rebounds: number(row.rebounds),
        assists: number(row.assists),
        steals: number(row.steals),
        blocks: number(row.blocks),
        fieldGoalsMade: number(row.field_goals_made),
        fieldGoalsAttempted: number(row.field_goals_attempted),
        threePointersMade: number(row.three_pointers_made),
        threePointersAttempted: number(row.three_pointers_attempted),
      }];
    });

    // Only use the newest confirmed import for a tournament match. This keeps a
    // corrected re-import from counting the same match twice.
    const seenTournamentMatches = new Set<string>();
    rows(importsResult.data).forEach((statImport) => {
      const matchId = text(statImport.tournament_match_id);
      const match = matchById.get(matchId);
      if (!match || seenTournamentMatches.has(matchId)) return;
      seenTournamentMatches.add(matchId);
      rows(statImport.reviewed_rows).forEach((row) => {
        lines.push({
          competitionId: `tournament:${text(match.tournament_id)}`,
          targetId: matchId,
          playerId: text(row.player_id),
          teamId: text(row.team_id),
          gamesPlayed: 1,
          points: number(row.pts),
          rebounds: number(row.orb) + number(row.drb),
          assists: number(row.ast),
          steals: number(row.stl),
          blocks: number(row.bk),
          fieldGoalsMade: number(row.fgm),
          fieldGoalsAttempted: number(row.fga),
          threePointersMade: number(row.three_pm),
          threePointersAttempted: number(row.three_pa),
        });
      });
    });

    const results: CompetitionResult[] = [
      ...gameRows.filter(hasResult).map((row) => ({
        competitionId: `season:${text(row.season_id)}`,
        targetId: text(row.id),
        homeTeamId: text(row.home_team_id),
        awayTeamId: text(row.away_team_id),
        homeScore: number(row.home_score),
        awayScore: number(row.away_score),
      })),
      ...matchRows.filter(hasResult).map((row) => ({
        competitionId: `tournament:${text(row.tournament_id)}`,
        targetId: text(row.id),
        homeTeamId: text(row.home_team_id),
        awayTeamId: text(row.away_team_id),
        homeScore: number(row.home_score),
        awayScore: number(row.away_score),
      })),
    ];
    const currentSeason = competitions.find((item) => item.kind === 'season' && item.isCurrent)
      ?? competitions.find((item) => item.id === fallbackCompetitionId)
      ?? competitions[0];
    return { competitions, lines, results, initialCompetitionId: currentSeason.id };
  } catch (error) {
    console.error('[stats:data]', error instanceof Error ? error.message : error);
    return fallback;
  }
}

function hasResult(row: Row) {
  return Boolean(text(row.home_team_id) && text(row.away_team_id))
    && row.home_score !== null && row.home_score !== undefined
    && row.away_score !== null && row.away_score !== undefined;
}

export const getStatsExplorerData = cache(loadStatsExplorerData);
