import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
  Accolade,
  Conference,
  Game,
  GameStatLine,
  LeagueLink,
  NewsPost,
  Player,
  PlayerStats,
  Season,
  SiteData,
  StaffMember,
  Team,
} from './league-types';
import { normalizeStatus } from './utils';

type Row = Record<string, unknown>;

const zeroStats: PlayerStats = {
  gamesPlayed: 0,
  pointsPerGame: 0,
  reboundsPerGame: 0,
  assistsPerGame: 0,
  stealsPerGame: 0,
  blocksPerGame: 0,
  fieldGoalPct: 0,
  threePointPct: 0,
};

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function rows(result: { data: unknown; error: unknown } | null | undefined) {
  if (!result || result.error || !Array.isArray(result.data)) return [];
  return result.data as Row[];
}

function failed(result: { error: unknown } | null | undefined) {
  return !result || Boolean(result.error);
}

const pendingSeason: Season = {
  id: 'unpublished',
  slug: 'unpublished',
  name: 'Season setup pending',
  isCurrent: true,
  startsOn: '2000-01-01',
  endsOn: '2000-01-01',
};

const unavailableSeason: Season = {
  id: 'unavailable',
  slug: 'unavailable',
  name: 'League data unavailable',
  isCurrent: false,
  startsOn: '2000-01-01',
  endsOn: '2000-01-01',
};

const unavailableSiteData: SiteData = {
  source: 'unavailable',
  season: unavailableSeason,
  seasons: [],
  teams: [],
  players: [],
  games: [],
  news: [],
  accolades: [],
  staff: [],
  links: [],
};

export function isSiteDataHealthy(data: SiteData) {
  return data.source === 'supabase' && data.season.id !== pendingSeason.id;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function conferenceValue(value: unknown): Conference {
  return String(value ?? '').toLowerCase().startsWith('w') ? 'West' : 'East';
}

function mapSeason(row: Row): Season {
  const name = stringValue(row.name, stringValue(row.label, 'Current Season'));
  return {
    id: stringValue(row.id, slugify(name)),
    slug: stringValue(row.slug, slugify(name)),
    name,
    isCurrent:
      booleanValue(row.is_current, booleanValue(row.is_active)) ||
      String(row.status ?? '').toLowerCase() === 'active',
    startsOn: stringValue(row.starts_on, stringValue(row.start_date, '2026-01-01')),
    endsOn: stringValue(row.ends_on, stringValue(row.end_date, '2026-12-31')),
  };
}

function mapTeam(row: Row, seasonTeam?: Row, standing?: Row): Team {
  const name = stringValue(row.name, 'Unnamed Team');
  const abbreviation = stringValue(
    row.abbreviation,
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase(),
  );

  return {
    id: stringValue(row.id, slugify(name)),
    slug: stringValue(row.slug, slugify(name)),
    name,
    shortName: stringValue(row.short_name, name.split(/\s+/).at(-1) ?? name),
    abbreviation,
    city: stringValue(row.city, 'PBL'),
    conference: conferenceValue(seasonTeam?.conference ?? row.conference),
    primaryColor: stringValue(row.primary_color, '#ff6b22'),
    secondaryColor: stringValue(row.secondary_color, '#ffb067'),
    wins: numberValue(standing?.wins, numberValue(row.wins)),
    losses: numberValue(standing?.losses, numberValue(row.losses)),
    logoUrl: stringValue(row.logo_url) || null,
    description: stringValue(
      row.description,
      `${name} competes in the Practical Basketball Asia League.`,
    ),
  };
}

function mapStats(row: Row | undefined): PlayerStats {
  if (!row) return zeroStats;
  return {
    gamesPlayed: numberValue(row.games_played),
    pointsPerGame: numberValue(row.points_per_game, numberValue(row.ppg)),
    reboundsPerGame: numberValue(row.rebounds_per_game, numberValue(row.rpg)),
    assistsPerGame: numberValue(row.assists_per_game, numberValue(row.apg)),
    stealsPerGame: numberValue(row.steals_per_game, numberValue(row.spg)),
    blocksPerGame: numberValue(row.blocks_per_game, numberValue(row.bpg)),
    fieldGoalPct: normalizePercentage(
      numberValue(
        row.field_goal_percentage,
        numberValue(row.field_goal_pct, numberValue(row.fg_pct)),
      ),
    ),
    threePointPct: normalizePercentage(
      numberValue(
        row.three_point_percentage,
        numberValue(row.three_point_pct, numberValue(row.three_pct)),
      ),
    ),
  };
}

function normalizePercentage(value: number) {
  return value > 0 && value <= 1 ? value * 100 : value;
}

function mapPlayer(row: Row, statsRow?: Row, roster?: Row): Player {
  const displayName = stringValue(
    row.display_name,
    stringValue(
      row.full_name,
      `${stringValue(row.first_name)} ${stringValue(row.last_name)}`.trim() ||
        stringValue(row.username, 'Unknown Player'),
    ),
  );
  return {
    id: stringValue(row.id, slugify(displayName)),
    slug: stringValue(row.slug, slugify(displayName)),
    displayName,
    robloxUsername: stringValue(row.roblox_username, stringValue(row.username, displayName)),
    jerseyNumber: numberValue(
      roster?.jersey_number,
      numberValue(row.jersey_number, numberValue(row.number)),
    ),
    position: stringValue(roster?.position, stringValue(row.position, 'G')),
    teamId: stringValue(roster?.team_id, stringValue(row.team_id)),
    avatarUrl: stringValue(row.avatar_url) || null,
    bio: stringValue(row.bio, `${displayName} competes in the Practical Basketball Asia League.`),
    isActive: booleanValue(row.is_active, booleanValue(row.active, true)),
    stats: mapStats(statsRow),
  };
}

function mapGame(row: Row, fallbackSeasonId: string): Game {
  const id = stringValue(
    row.id,
    `unknown-${stringValue(row.scheduled_at, stringValue(row.date, 'game'))}`,
  );
  const startsAt = stringValue(
    row.starts_at,
    stringValue(row.scheduled_at, stringValue(row.date, new Date().toISOString())),
  );
  return {
    id,
    slug: stringValue(row.slug, `game-${id}`),
    seasonId: stringValue(row.season_id, fallbackSeasonId),
    week: numberValue(row.week, numberValue(row.round_number, 1)),
    startsAt,
    status: normalizeStatus(row.status),
    venue: stringValue(row.venue, 'PBL Arena'),
    homeTeamId: stringValue(row.home_team_id),
    awayTeamId: stringValue(row.away_team_id),
    homeScore: row.home_score === null || row.home_score === undefined ? null : numberValue(row.home_score),
    awayScore: row.away_score === null || row.away_score === undefined ? null : numberValue(row.away_score),
    streamUrl: stringValue(row.stream_url) || null,
    notes: stringValue(row.notes) || null,
  };
}

function mapNews(row: Row, index: number): NewsPost {
  const title = stringValue(row.title, 'League update');
  return {
    id: stringValue(row.id, slugify(title)),
    slug: stringValue(row.slug, slugify(title)),
    title,
    excerpt: stringValue(row.excerpt, stringValue(row.summary, 'Latest news from the PBL.')),
    content: stringValue(row.content, stringValue(row.body, 'More details will be available soon.')),
    category: stringValue(row.category, 'League'),
    publishedAt: stringValue(row.published_at, stringValue(row.created_at, new Date().toISOString())),
    authorName: stringValue(row.author_name, 'PBL Media'),
    featured: booleanValue(row.featured, booleanValue(row.is_featured)),
    coverUrl: stringValue(row.cover_url, stringValue(row.cover_image_url)) || null,
    accent: ['#ff6b22', '#00cfa6', '#4a7dff', '#ff4f91'][index % 4],
  };
}

function mapAccolade(row: Row): Accolade {
  const player = row.players && typeof row.players === 'object' ? (row.players as Row) : undefined;
  const team = row.teams && typeof row.teams === 'object' ? (row.teams as Row) : undefined;
  const season = row.seasons && typeof row.seasons === 'object' ? (row.seasons as Row) : undefined;
  const playerName = player
    ? `${stringValue(player.first_name)} ${stringValue(player.last_name)}`.trim()
    : '';
  const recipient = stringValue(
    row.recipient_name,
    stringValue(row.recipient, playerName || stringValue(team?.name, 'To be announced')),
  );
  const category = stringValue(row.category, stringValue(row.type));
  return {
    id: stringValue(row.id, slugify(`${stringValue(row.title)}-${recipient}`)),
    season: stringValue(
      row.season_name,
      stringValue(row.season_label, stringValue(season?.name, 'Current Season')),
    ),
    title: stringValue(row.title, 'League Award'),
    recipient,
    teamId: stringValue(row.team_id) || null,
    description: stringValue(row.description),
    type: category.toLowerCase().includes('record') ? 'record' : 'award',
  };
}

function mapStaff(row: Row): StaffMember {
  const name = stringValue(row.display_name, stringValue(row.name, 'PBL Staff'));
  return {
    id: stringValue(row.id, slugify(name)),
    name,
    role: stringValue(row.role, 'League Staff'),
    department: stringValue(row.department, 'League Office'),
    robloxUsername: stringValue(row.roblox_username) || null,
    avatarUrl: stringValue(row.avatar_url) || null,
  };
}

function mapLink(row: Row): LeagueLink {
  const label = stringValue(row.label, stringValue(row.title, 'PBL Link'));
  const kind = String(row.kind ?? row.type ?? 'resource').toLowerCase();
  return {
    id: stringValue(row.id, slugify(label)),
    label,
    description: stringValue(row.description),
    href: stringValue(row.url, stringValue(row.href, '#')),
    kind:
      kind === 'social' || kind === 'stream'
        ? 'social'
        : kind === 'contact' || kind === 'community'
          ? 'community'
          : kind === 'game'
            ? 'game'
            : 'resource',
  };
}

export const getSiteData = cache(async (): Promise<SiteData> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('[pbl-data:public-load] Supabase environment variables are missing.');
    return unavailableSiteData;
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [
      seasonsResult,
      teamsResult,
      seasonTeamsResult,
      standingsResult,
      playersResult,
      rostersResult,
      statsResult,
      gamesResult,
      newsResult,
      accoladesResult,
      staffResult,
      linksResult,
    ] = await Promise.all([
      supabase
        .from('seasons')
        .select('id, name, slug, status, is_public, starts_on, ends_on')
        .order('starts_on', { ascending: false }),
      supabase
        .from('teams')
        .select('id, name, slug, abbreviation, city, description, logo_url, primary_color, secondary_color, is_active')
        .order('name'),
      supabase
        .from('season_teams')
        .select('season_id, team_id, conference, is_active'),
      supabase
        .from('standings')
        .select('season_id, team_id, wins, losses'),
      supabase
        .from('players')
        .select('id, first_name, last_name, slug, roblox_username, position, team_id, avatar_url, bio, is_active')
        .order('last_name'),
      supabase
        .from('rosters')
        .select('season_id, team_id, player_id, jersey_number, position, status'),
      supabase
        .from('player_season_stats')
        .select('season_id, player_id, games_played, points_per_game, rebounds_per_game, assists_per_game, steals_per_game, blocks_per_game, field_goal_percentage, three_point_percentage'),
      supabase
        .from('games')
        .select('id, season_id, round_number, scheduled_at, venue, status, home_team_id, away_team_id, home_score, away_score, stream_url, notes')
        .order('scheduled_at'),
      supabase
        .from('news_posts')
        .select('id, title, slug, excerpt, content, category, cover_image_url, is_featured, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
      supabase
        .from('accolades')
        .select('id, season_id, player_id, team_id, title, category, description, awarded_on, players(first_name, last_name), teams(name), seasons(name)')
        .order('awarded_on', { ascending: false, nullsFirst: false }),
      supabase
        .from('staff_members')
        .select('id, display_name, role, department, roblox_username, avatar_url, sort_order, is_active')
        .order('sort_order'),
      supabase
        .from('league_links')
        .select('id, label, url, kind, description, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order'),
    ]);

    const requiredResults = [
      seasonsResult,
      teamsResult,
      seasonTeamsResult,
      standingsResult,
      playersResult,
      rostersResult,
      statsResult,
      gamesResult,
      newsResult,
      accoladesResult,
      staffResult,
      linksResult,
    ];
    if (requiredResults.some(failed)) {
      console.error('[pbl-data:public-load] One or more required Supabase queries failed.', {
        failedQueryCount: requiredResults.filter(failed).length,
      });
      return unavailableSiteData;
    }

    const seasons = rows(seasonsResult).map(mapSeason);
    const season = seasons.find((item) => item.isCurrent) ?? seasons[0];
    const news = rows(newsResult).map(mapNews);
    const staff = rows(staffResult).map(mapStaff);
    const links = rows(linksResult).map(mapLink);

    if (!season) {
      const freeAgents = rows(playersResult)
        .filter((row) => booleanValue(row.is_active, true))
        .map((row) => mapPlayer(row));
      return {
        source: 'supabase',
        season: pendingSeason,
        seasons: [pendingSeason],
        teams: [],
        players: freeAgents,
        games: [],
        news,
        accolades: [],
        staff,
        links,
      };
    }

    const teamRows = rows(teamsResult);
    const seasonTeamRows = rows(seasonTeamsResult).filter(
      (row) =>
        String(row.season_id) === season.id &&
        booleanValue(row.is_active, true),
    );
    const standingRows = rows(standingsResult).filter(
      (row) => String(row.season_id) === season.id,
    );
    const teams = teamRows
      .filter(
        (row) => seasonTeamRows.some((item) => String(item.team_id) === String(row.id)),
      )
      .map((row) =>
        mapTeam(
          row,
          seasonTeamRows.find((item) => String(item.team_id) === String(row.id)),
          standingRows.find((item) => String(item.team_id) === String(row.id)),
        ),
      );
    const statRows = rows(statsResult).filter(
      (row) => String(row.season_id) === season.id,
    );
    const rosterRows = rows(rostersResult).filter(
      (row) => String(row.season_id) === season.id && String(row.status) === 'active',
    );
    const players = rows(playersResult)
      .filter((row) => booleanValue(row.is_active, true))
      .map((row) =>
        mapPlayer(
          row,
          statRows.find(
            (statRow) =>
              String(statRow.season_id) === season.id &&
              String(statRow.player_id) === String(row.id),
          ),
          rosterRows.find((rosterRow) => String(rosterRow.player_id) === String(row.id)),
        ),
      );

    return {
      source: 'supabase',
      season,
      // Public pages deliberately represent one coherent season. Historical
      // archives can be added later without mixing old rosters and statistics.
      seasons: [season],
      teams,
      players,
      games: rows(gamesResult)
        .filter((row) => String(row.season_id) === season.id)
        .map((row) => mapGame(row, season.id)),
      news,
      accolades: rows(accoladesResult)
        .filter((row) => String(row.season_id) === season.id)
        .map(mapAccolade),
      staff,
      links,
    };
  } catch (error) {
    console.error(
      '[pbl-data:public-load] Unexpected Supabase read failure.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return unavailableSiteData;
  }
});

export const getTeamBySlug = cache(async (slug: string) => {
  const data = await getSiteData();
  return data.teams.find((team) => team.slug === slug) ?? null;
});

export const getPlayerBySlug = cache(async (slug: string) => {
  const data = await getSiteData();
  return data.players.find((player) => player.slug === slug) ?? null;
});

export const getNewsBySlug = cache(async (slug: string) => {
  const data = await getSiteData();
  return data.news.find((post) => post.slug === slug) ?? null;
});

export const getGameBoxScore = cache(async (gameId: string): Promise<GameStatLine[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('player_game_stats')
    .select('player_id, team_id, minutes, points, rebounds, assists, steals, blocks, turnovers, field_goals_made, field_goals_attempted, three_pointers_made, three_pointers_attempted, free_throws_made, free_throws_attempted, players(first_name, last_name, slug)')
    .eq('game_id', gameId)
    .eq('did_play', true)
    .order('points', { ascending: false });
  if (error || !Array.isArray(data)) return [];

  return (data as Row[]).map((row) => {
    const player = row.players && typeof row.players === 'object'
      ? row.players as Row
      : undefined;
    const displayName = `${stringValue(player?.first_name)} ${stringValue(player?.last_name)}`.trim() || 'Unknown player';

    return {
      playerId: stringValue(row.player_id),
      playerSlug: stringValue(player?.slug, slugify(displayName)),
      displayName,
      teamId: stringValue(row.team_id),
      minutes: numberValue(row.minutes),
      points: numberValue(row.points),
      rebounds: numberValue(row.rebounds),
      assists: numberValue(row.assists),
      steals: numberValue(row.steals),
      blocks: numberValue(row.blocks),
      turnovers: numberValue(row.turnovers),
      fieldGoalsMade: numberValue(row.field_goals_made),
      fieldGoalsAttempted: numberValue(row.field_goals_attempted),
      threePointersMade: numberValue(row.three_pointers_made),
      threePointersAttempted: numberValue(row.three_pointers_attempted),
      freeThrowsMade: numberValue(row.free_throws_made),
      freeThrowsAttempted: numberValue(row.free_throws_attempted),
    };
  });
});
