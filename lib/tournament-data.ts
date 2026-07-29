import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import type { Tournament, TournamentMatch, TournamentTeam } from './tournament-types';
import { createAdminClient } from './supabase-admin';

type Row = Record<string, unknown>;
const stringOrNull = (value: unknown) => typeof value === 'string' && value ? value : null;
const numberOrNull = (value: unknown) => typeof value === 'number' ? value : null;

async function loadPublicTournaments(): Promise<Tournament[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const [tournamentResult, teamResult, matchResult] = await Promise.all([
    supabase.from('tournaments').select('*').eq('is_public', true).order('starts_at', { ascending: false }),
    supabase.from('tournament_teams').select('*').order('seed', { ascending: true }),
    supabase.from('tournament_matches').select('*').order('match_number', { ascending: true }).order('scheduled_at', { ascending: true }),
  ]);
  if (tournamentResult.error || teamResult.error || matchResult.error) return [];

  const teams = (teamResult.data ?? []) as Row[];
  const matches = (matchResult.data ?? []) as Row[];
  return ((tournamentResult.data ?? []) as Row[]).map((row) => ({
    id: String(row.id), seasonId: stringOrNull(row.season_id), name: String(row.name), slug: String(row.slug),
    format: String(row.format) as Tournament['format'], status: String(row.status) as Tournament['status'],
    description: stringOrNull(row.description), logoUrl: stringOrNull(row.logo_url), startsAt: stringOrNull(row.starts_at),
    endsAt: stringOrNull(row.ends_at), venue: stringOrNull(row.venue), isPublic: row.is_public === true,
    championTeamId: stringOrNull(row.champion_team_id),
    teams: teams.filter((item) => item.tournament_id === row.id).map((item): TournamentTeam => ({
      id: String(item.id), teamId: String(item.team_id), seed: numberOrNull(item.seed), groupName: stringOrNull(item.group_name),
      status: String(item.status) as TournamentTeam['status'],
    })),
    matches: matches.filter((item) => item.tournament_id === row.id).map((item): TournamentMatch => ({
      id: String(item.id), roundLabel: String(item.round_label), matchNumber: numberOrNull(item.match_number),
      scheduledAt: stringOrNull(item.scheduled_at), venue: stringOrNull(item.venue), status: String(item.status) as TournamentMatch['status'],
      homeTeamId: stringOrNull(item.home_team_id), awayTeamId: stringOrNull(item.away_team_id), homeScore: numberOrNull(item.home_score),
      awayScore: numberOrNull(item.away_score), winnerTeamId: stringOrNull(item.winner_team_id), streamUrl: stringOrNull(item.stream_url), notes: stringOrNull(item.notes),
    })),
  }));
}

const getCachedPublicTournaments = unstable_cache(loadPublicTournaments, ['pbal-public-tournaments-v1'], {
  tags: ['pbal-tournaments'],
  revalidate: 60,
});

export const getPublicTournaments = cache(getCachedPublicTournaments);
