import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getDiscordActor } from '@/lib/bot-auth';
import { createDisciplinaryAction, revokeDisciplinaryAction } from '@/lib/discipline';
import {
  interactionActorId,
  interactionMessage,
  interactionSubcommand,
  optionValue,
  verifyDiscordInteraction,
  type DiscordInteraction,
  type DiscordInteractionOption,
} from '@/lib/discord-interactions';
import { getSiteData } from '@/lib/league-data';
import { createTradeRequest, updateLeagueMatch } from '@/lib/league-operations';
import { LeagueOperationError } from '@/lib/operation-error';
import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' ? value : String(value ?? '');
}

async function findPlayer(query: string) {
  const supabase = createAdminClient();
  if (!supabase) throw new LeagueOperationError(503, 'database_not_configured', 'Database is not configured.');
  if (z.string().uuid().safeParse(query).success) {
    const { data } = await supabase.from('players').select('id, name, roblox_username, slug, team_id').eq('id', query).maybeSingle();
    return data as Row | null;
  }
  const [usernameResult, nameResult] = await Promise.all([
    supabase.from('players').select('id, name, roblox_username, slug, team_id').ilike('roblox_username', query).limit(1).maybeSingle(),
    supabase.from('players').select('id, name, roblox_username, slug, team_id').ilike('name', `%${query.slice(0, 80)}%`).limit(1).maybeSingle(),
  ]);
  return (usernameResult.data || nameResult.data) as Row | null;
}

async function findTeam(query: string) {
  const supabase = createAdminClient();
  if (!supabase) throw new LeagueOperationError(503, 'database_not_configured', 'Database is not configured.');
  if (z.string().uuid().safeParse(query).success) {
    const { data } = await supabase.from('teams').select('id, name, abbreviation').eq('id', query).maybeSingle();
    return data as Row | null;
  }
  const [abbreviationResult, nameResult] = await Promise.all([
    supabase.from('teams').select('id, name, abbreviation').ilike('abbreviation', query).limit(1).maybeSingle(),
    supabase.from('teams').select('id, name, abbreviation').ilike('name', `%${query.slice(0, 80)}%`).limit(1).maybeSingle(),
  ]);
  return (abbreviationResult.data || nameResult.data) as Row | null;
}

function optionsOf(option: DiscordInteractionOption | null) {
  return option?.options ?? [];
}

async function playerCommand(options: DiscordInteractionOption[]) {
  const query = optionValue<string>(options, 'query')?.trim() ?? '';
  const player = await findPlayer(query);
  if (!player) return interactionMessage('ไม่พบผู้เล่นที่ค้นหา', true);
  const supabase = createAdminClient();
  if (!supabase) return interactionMessage('ระบบฐานข้อมูลยังไม่พร้อม', true);
  const [{ data: team }, { data: discipline }] = await Promise.all([
    player.team_id
      ? supabase.from('teams').select('name, abbreviation').eq('id', player.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('public_player_disciplinary_actions')
      .select('action_type, public_note, ends_at')
      .eq('player_id', player.id)
      .eq('is_active', true),
  ]);
  const restrictions = ((discipline ?? []) as Row[])
    .map((action) => `${text(action.action_type).replaceAll('_', ' ')}${action.ends_at ? ` ถึง ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(text(action.ends_at)))}` : ''}`)
    .join(', ');
  return interactionMessage([
    `**${text(player.name)}** · @${text(player.roblox_username) || 'unknown'}`,
    `ทีม: ${team ? `${team.name} (${team.abbreviation})` : 'Free Agent'}`,
    `สถานะลงโทษ: ${restrictions || 'ปกติ'}`,
  ].join('\n'));
}

async function matchesCommand() {
  const site = await getSiteData();
  const teamById = new Map(site.teams.map((team) => [team.id, team]));
  const now = Date.now();
  const matches = site.games
    .filter((game) => game.status === 'live' || (game.status === 'scheduled' && new Date(game.startsAt).getTime() >= now))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, 6);
  if (!matches.length) return interactionMessage('ยังไม่มีแมตช์ที่กำลังแข่งหรือกำลังจะมาถึง');
  return interactionMessage(matches.map((game) => {
    const home = teamById.get(game.homeTeamId)?.abbreviation ?? 'HOME';
    const away = teamById.get(game.awayTeamId)?.abbreviation ?? 'AWAY';
    const time = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(game.startsAt));
    return `• **${away} @ ${home}** · ${game.status === 'live' ? '🔴 LIVE' : time} · ID: \`${game.id}\``;
  }).join('\n'));
}

async function standingsCommand() {
  const site = await getSiteData();
  const teams = [...site.teams].sort((left, right) => {
    const leftPct = left.wins / Math.max(left.wins + left.losses, 1);
    const rightPct = right.wins / Math.max(right.wins + right.losses, 1);
    return rightPct - leftPct || right.wins - left.wins;
  });
  if (!teams.length) return interactionMessage('ยังไม่มีข้อมูลตารางคะแนน');
  return interactionMessage(`**PBAL Standings · ${site.season.name}**\n${teams.map((team, index) => `${index + 1}. **${team.abbreviation}** ${team.wins}–${team.losses}`).join('\n')}`);
}

async function tradeCommand(interaction: DiscordInteraction, options: DiscordInteractionOption[]) {
  const supabase = createAdminClient();
  if (!supabase) throw new LeagueOperationError(503, 'database_not_configured', 'Database is not configured.');
  const actor = await getDiscordActor(supabase, interactionActorId(interaction));
  const player = await findPlayer(optionValue<string>(options, 'player')?.trim() ?? '');
  const team = await findTeam(optionValue<string>(options, 'team')?.trim() ?? '');
  if (!player || !team) throw new LeagueOperationError(404, 'trade_target_not_found', 'ไม่พบผู้เล่นหรือทีมที่ระบุ');
  const kind = optionValue<string>(options, 'kind') as 'acquire' | 'release' | 'transfer';
  const trade = await createTradeRequest(supabase, actor, {
    playerId: text(player.id),
    toTeamId: text(team.id),
    requestKind: kind,
    notes: optionValue<string>(options, 'notes') ?? '',
    source: 'discord_bot',
    externalRequestId: interaction.id,
  });
  revalidatePath('/trades');
  revalidatePath('/admin/trades');
  return interactionMessage(`ส่งคำขอเทรด **${text(player.name)} → ${text(team.abbreviation)}** แล้ว · ID: \`${trade.id}\``, true);
}

async function punishCommand(interaction: DiscordInteraction, options: DiscordInteractionOption[]) {
  const supabase = createAdminClient();
  if (!supabase) throw new LeagueOperationError(503, 'database_not_configured', 'Database is not configured.');
  const actor = await getDiscordActor(supabase, interactionActorId(interaction));
  const player = await findPlayer(optionValue<string>(options, 'player')?.trim() ?? '');
  if (!player) throw new LeagueOperationError(404, 'player_not_found', 'ไม่พบผู้เล่นที่ระบุ');
  const hours = optionValue<number>(options, 'duration-hours');
  const endsAt = hours ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null;
  const actionType = optionValue<string>(options, 'type') as 'warning' | 'match_suspension' | 'trade_ban' | 'account_ban' | 'blacklist';
  const action = await createDisciplinaryAction(supabase, actor, {
    playerId: text(player.id),
    actionType,
    reason: optionValue<string>(options, 'reason') ?? '',
    publicNote: optionValue<string>(options, 'public-note') ?? '',
    endsAt,
    isPublic: optionValue<boolean>(options, 'public') ?? false,
    source: 'discord_bot',
    externalRequestId: interaction.id,
  });
  revalidatePath('/blacklist');
  revalidatePath('/admin/discipline');
  revalidatePath('/trades');
  return interactionMessage(`บันทึก **${actionType.replaceAll('_', ' ')}** สำหรับ **${text(player.name)}** แล้ว · ID: \`${action.id}\``, true);
}

async function revokeCommand(interaction: DiscordInteraction, options: DiscordInteractionOption[]) {
  const supabase = createAdminClient();
  if (!supabase) throw new LeagueOperationError(503, 'database_not_configured', 'Database is not configured.');
  const actor = await getDiscordActor(supabase, interactionActorId(interaction));
  const action = await revokeDisciplinaryAction(supabase, actor, {
    actionId: optionValue<string>(options, 'action-id') ?? '',
    reason: optionValue<string>(options, 'reason') ?? '',
    source: 'discord_bot',
    externalRequestId: interaction.id,
  });
  revalidatePath('/blacklist');
  revalidatePath('/admin/discipline');
  return interactionMessage(`ยกเลิกบทลงโทษ \`${action.id}\` แล้ว`, true);
}

async function matchUpdateCommand(interaction: DiscordInteraction, options: DiscordInteractionOption[]) {
  const supabase = createAdminClient();
  if (!supabase) throw new LeagueOperationError(503, 'database_not_configured', 'Database is not configured.');
  const actor = await getDiscordActor(supabase, interactionActorId(interaction));
  const status = optionValue<string>(options, 'status') as 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
  const homeScore = optionValue<number>(options, 'home-score');
  const awayScore = optionValue<number>(options, 'away-score');
  const changes = {
    status,
    homeScore: homeScore === undefined ? undefined : homeScore,
    awayScore: awayScore === undefined ? undefined : awayScore,
    notes: optionValue<string>(options, 'notes'),
  };
  const match = await updateLeagueMatch(supabase, actor, {
    matchId: optionValue<string>(options, 'match-id') ?? '',
    changes,
    source: 'discord_bot',
    externalRequestId: interaction.id,
  });
  revalidateTag('pbal-site-data', { expire: 0 });
  revalidatePath('/games');
  revalidatePath('/admin/league');
  return interactionMessage(`อัปเดตแมตช์ \`${text(match.id)}\` เป็น **${text(match.status)}** แล้ว`, true);
}

export async function POST(request: Request) {
  const signature = request.headers.get('x-signature-ed25519') ?? '';
  const timestamp = request.headers.get('x-signature-timestamp') ?? '';
  const rawBody = await request.text();
  if (!verifyDiscordInteraction(rawBody, signature, timestamp)) {
    return new Response('Invalid request signature', { status: 401 });
  }
  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch {
    return new Response('Invalid JSON payload', { status: 400 });
  }
  if (interaction.type === 1) return Response.json({ type: 1 });
  if (interaction.type !== 2 || interaction.data?.name !== 'pbal') {
    return interactionMessage('Unsupported command.', true);
  }
  const subcommand = interactionSubcommand(interaction);
  const options = optionsOf(subcommand);
  try {
    switch (subcommand?.name) {
      case 'player': return await playerCommand(options);
      case 'matches': return await matchesCommand();
      case 'standings': return await standingsCommand();
      case 'trade': return await tradeCommand(interaction, options);
      case 'punish': return await punishCommand(interaction, options);
      case 'revoke': return await revokeCommand(interaction, options);
      case 'match-update': return await matchUpdateCommand(interaction, options);
      default: return interactionMessage('ไม่รู้จักคำสั่งย่อยนี้', true);
    }
  } catch (error) {
    const message = error instanceof LeagueOperationError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Discord command failed.';
    console.error('[discord-interaction]', message);
    return interactionMessage(`ทำรายการไม่สำเร็จ: ${message}`, true);
  }
}
