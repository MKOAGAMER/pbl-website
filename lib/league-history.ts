import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Player, Team } from './league-types';

export type PlayerSeasonHistory = { seasonId: string; seasonName: string; games: number; points: number; rebounds: number; assists: number };
export type TeamSeasonHistory = { seasonId: string; seasonName: string; wins: number; losses: number };

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export async function getPlayerSeasonHistory(player: Player, fallbackSeason: { id: string; name: string }): Promise<PlayerSeasonHistory[]> {
  const client = supabase();
  if (!client) return [fallbackPlayerSeason(player, fallbackSeason)];
  try {
    const [{ data: seasons }, { data: stats, error }] = await Promise.all([
      client.from('seasons').select('id, name').order('starts_on', { ascending: false }),
      client.from('player_season_stats').select('season_id, games_played, points_per_game, rebounds_per_game, assists_per_game').eq('player_id', player.id),
    ]);
    if (error || !stats?.length) return [fallbackPlayerSeason(player, fallbackSeason)];
    const names = new Map((seasons ?? []).map((season) => [String(season.id), String(season.name)]));
    return stats.map((row) => ({ seasonId: String(row.season_id), seasonName: names.get(String(row.season_id)) ?? fallbackSeason.name, games: Number(row.games_played ?? 0), points: Number(row.points_per_game ?? 0), rebounds: Number(row.rebounds_per_game ?? 0), assists: Number(row.assists_per_game ?? 0) }));
  } catch { return [fallbackPlayerSeason(player, fallbackSeason)]; }
}

export async function getTeamSeasonHistory(team: Team, fallbackSeason: { id: string; name: string }): Promise<TeamSeasonHistory[]> {
  const client = supabase();
  if (!client) return [fallbackTeamSeason(team, fallbackSeason)];
  try {
    const [{ data: seasons }, { data: standings, error }] = await Promise.all([
      client.from('seasons').select('id, name').order('starts_on', { ascending: false }),
      client.from('standings').select('season_id, wins, losses').eq('team_id', team.id),
    ]);
    if (error || !standings?.length) return [fallbackTeamSeason(team, fallbackSeason)];
    const names = new Map((seasons ?? []).map((season) => [String(season.id), String(season.name)]));
    return standings.map((row) => ({ seasonId: String(row.season_id), seasonName: names.get(String(row.season_id)) ?? fallbackSeason.name, wins: Number(row.wins ?? 0), losses: Number(row.losses ?? 0) }));
  } catch { return [fallbackTeamSeason(team, fallbackSeason)]; }
}

function fallbackPlayerSeason(player: Player, season: { id: string; name: string }): PlayerSeasonHistory { return { seasonId: season.id, seasonName: season.name, games: player.stats.gamesPlayed, points: player.stats.pointsPerGame, rebounds: player.stats.reboundsPerGame, assists: player.stats.assistsPerGame }; }
function fallbackTeamSeason(team: Team, season: { id: string; name: string }): TeamSeasonHistory { return { seasonId: season.id, seasonName: season.name, wins: team.wins, losses: team.losses }; }

