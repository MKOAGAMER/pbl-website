'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-auth';
import { areFibaGroupsComplete, assignFibaGroups, calculateFibaStandings, createFibaGroupPairings, createFibaQuarterFinals, type FibaMatch } from '@/lib/fiba-tournament';

const uuid = z.string().uuid();
const optionalId = z.union([z.literal(''), uuid]);
const optionalUrl = z.union([z.literal(''), z.string().url().max(500)]);
const optionalDateTime = z.union([z.literal(''), z.string().datetime({ local: true })]);
const optionalPositiveInt = z.union([z.literal(''), z.coerce.number().int().positive()]);
const optionalScore = z.union([z.literal(''), z.coerce.number().int().min(0)]);

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function refreshTournaments() { updateTag('pbal-tournaments'); revalidatePath('/tournaments'); revalidatePath('/admin/tournaments'); revalidatePath('/sitemap.xml'); }
function ictDateTimeToIso(value: string) { return new Date(`${value}${value.length === 16 ? ':00' : ''}+07:00`).toISOString(); }

export async function saveTournament(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({
    id: optionalId, name: z.string().trim().min(2).max(120), seasonId: optionalId,
    format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'group_stage', 'fiba']),
    status: z.enum(['draft', 'registration', 'active', 'completed', 'cancelled']), description: z.string().trim().max(3000),
    logoUrl: optionalUrl, startsAt: optionalDateTime, endsAt: optionalDateTime, venue: z.string().trim().max(160),
    championTeamId: optionalId, isPublic: z.boolean(),
  }).safeParse({
    // New tournaments do not render hidden id/champion fields. Normalize the
    // missing FormData entries to the empty value accepted by optionalId.
    id: formData.get('id') ?? '', name: formData.get('name'), seasonId: formData.get('season_id') ?? '', format: formData.get('format'), status: formData.get('status'),
    description: formData.get('description'), logoUrl: formData.get('logo_url'), startsAt: formData.get('starts_at'), endsAt: formData.get('ends_at'),
    venue: formData.get('venue'), championTeamId: formData.get('champion_team_id') ?? '', isPublic: formData.get('is_public') === 'on',
  });
  if (!parsed.success || (parsed.data.startsAt && parsed.data.endsAt && parsed.data.endsAt < parsed.data.startsAt)) redirect('/admin/tournaments?error=invalid-tournament');
  if (parsed.data.championTeamId) {
    if (!parsed.data.id) redirect('/admin/tournaments?error=invalid-champion');
    const { data: championEntry } = await supabase.from('tournament_teams').select('id').eq('tournament_id', parsed.data.id).eq('team_id', parsed.data.championTeamId).maybeSingle();
    if (!championEntry) redirect('/admin/tournaments?error=invalid-champion');
  }
  const payload = { season_id: parsed.data.seasonId || null, name: parsed.data.name, format: parsed.data.format, status: parsed.data.status,
    description: parsed.data.description || null, logo_url: parsed.data.logoUrl || null, starts_at: parsed.data.startsAt ? ictDateTimeToIso(parsed.data.startsAt) : null,
    ends_at: parsed.data.endsAt ? ictDateTimeToIso(parsed.data.endsAt) : null, venue: parsed.data.venue || null, is_public: parsed.data.isPublic,
    champion_team_id: parsed.data.championTeamId || null, updated_at: new Date().toISOString() };
  const result = parsed.data.id
    ? await supabase.from('tournaments').update(payload).eq('id', parsed.data.id)
    : await supabase.from('tournaments').insert({ ...payload, slug: `${slugify(parsed.data.name) || 'tournament'}-${Date.now().toString(36)}` });
  if (result.error) { console.error('[tournament:save]', result.error.message); redirect('/admin/tournaments?error=tournament-save'); }
  refreshTournaments(); redirect('/admin/tournaments?saved=tournament');
}

export async function deleteTournament(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff'); const id = uuid.safeParse(formData.get('id'));
  if (!id.success) redirect('/admin/tournaments?error=invalid-tournament');
  const { error } = await supabase.from('tournaments').delete().eq('id', id.data);
  if (error) redirect('/admin/tournaments?error=tournament-delete'); refreshTournaments(); redirect('/admin/tournaments?saved=deleted');
}

export async function addTournamentTeam(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({ tournamentId: uuid, teamId: uuid, seed: optionalPositiveInt, groupName: z.string().trim().max(40) }).safeParse({ tournamentId: formData.get('tournament_id'), teamId: formData.get('team_id'), seed: formData.get('seed'), groupName: formData.get('group_name') });
  if (!parsed.success) redirect('/admin/tournaments?error=invalid-team');
  const { error } = await supabase.from('tournament_teams').insert({ tournament_id: parsed.data.tournamentId, team_id: parsed.data.teamId, seed: parsed.data.seed || null, group_name: parsed.data.groupName || null });
  if (error) redirect('/admin/tournaments?error=team-save'); refreshTournaments(); redirect('/admin/tournaments?saved=team');
}

export async function removeTournamentTeam(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff'); const id = uuid.safeParse(formData.get('id'));
  if (!id.success) redirect('/admin/tournaments?error=invalid-team');
  const { data: entry } = await supabase.from('tournament_teams').select('tournament_id, team_id').eq('id', id.data).maybeSingle();
  if (!entry) redirect('/admin/tournaments?error=invalid-team');
  const { data: referencedMatch } = await supabase.from('tournament_matches').select('id').eq('tournament_id', entry.tournament_id).or(`home_team_id.eq.${entry.team_id},away_team_id.eq.${entry.team_id}`).limit(1).maybeSingle();
  if (referencedMatch) redirect('/admin/tournaments?error=team-in-use');
  const { error } = await supabase.from('tournament_teams').delete().eq('id', id.data);
  if (error) redirect('/admin/tournaments?error=team-delete'); refreshTournaments(); redirect('/admin/tournaments?saved=team-removed');
}

export async function generateFibaGroupStage(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const tournamentId = uuid.safeParse(formData.get('tournament_id'));
  if (!tournamentId.success) redirect('/admin/tournaments?error=invalid-tournament');
  const [tournamentResult, entryResult, matchResult] = await Promise.all([
    supabase.from('tournaments').select('format').eq('id', tournamentId.data).maybeSingle(),
    supabase.from('tournament_teams').select('id, team_id, seed').eq('tournament_id', tournamentId.data).order('seed'),
    supabase.from('tournament_matches').select('id').eq('tournament_id', tournamentId.data).limit(1),
  ]);
  if (tournamentResult.data?.format !== 'fiba') redirect('/admin/tournaments?error=not-fiba');
  if (matchResult.data?.length) redirect('/admin/tournaments?error=matches-exist');
  const entries = entryResult.data ?? [];
  if (entryResult.error || entries.length !== 16) redirect('/admin/tournaments?error=fiba-needs-16-teams');

  let assignments;
  try {
    assignments = assignFibaGroups(entries.map((entry) => ({ teamId: String(entry.team_id), seed: typeof entry.seed === 'number' ? entry.seed : null })));
  } catch { redirect('/admin/tournaments?error=fiba-group-setup'); }
  const groupByTeamId = new Map(assignments.map((entry) => [entry.teamId, entry.groupName]));
  const assignmentResults = await Promise.all(entries.map((entry) => supabase.from('tournament_teams')
    .update({ group_name: groupByTeamId.get(String(entry.team_id)), status: 'active' }).eq('id', entry.id)));
  if (assignmentResults.some((result) => result.error)) redirect('/admin/tournaments?error=fiba-group-setup');

  const pairings = createFibaGroupPairings(assignments);
  const { error } = await supabase.from('tournament_matches').insert(pairings.map((pairing, index) => ({
    tournament_id: tournamentId.data,
    stage: 'group',
    group_name: pairing.groupName,
    round_label: `Group ${pairing.groupName}`,
    match_number: index + 1,
    status: 'scheduled',
    home_team_id: pairing.homeTeamId,
    away_team_id: pairing.awayTeamId,
    notes: `Group round ${pairing.round}`,
  })));
  if (error) { console.error('[tournament:fiba-groups]', error.message); redirect('/admin/tournaments?error=fiba-group-setup'); }
  refreshTournaments(); redirect('/admin/tournaments?saved=fiba-groups');
}

export async function generateFibaKnockout(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const tournamentId = uuid.safeParse(formData.get('tournament_id'));
  if (!tournamentId.success) redirect('/admin/tournaments?error=invalid-tournament');
  const [tournamentResult, entryResult, matchResult] = await Promise.all([
    supabase.from('tournaments').select('format').eq('id', tournamentId.data).maybeSingle(),
    supabase.from('tournament_teams').select('team_id, group_name, seed').eq('tournament_id', tournamentId.data),
    supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId.data),
  ]);
  if (tournamentResult.data?.format !== 'fiba') redirect('/admin/tournaments?error=not-fiba');
  const entries = (entryResult.data ?? []).map((entry) => ({ teamId: String(entry.team_id), groupName: String(entry.group_name ?? ''), seed: typeof entry.seed === 'number' ? entry.seed : null }));
  const matches = (matchResult.data ?? []).map(mapFibaMatch);
  if (matches.some((match) => match.stage === 'knockout')) redirect('/admin/tournaments?error=knockout-exists');
  if (!areFibaGroupsComplete(entries, matches)) redirect('/admin/tournaments?error=groups-incomplete');

  let quarterFinals;
  try { quarterFinals = createFibaQuarterFinals(calculateFibaStandings(entries, matches)); }
  catch { redirect('/admin/tournaments?error=standings-incomplete'); }
  const finalId = crypto.randomUUID();
  const semiFinalIds = [crypto.randomUUID(), crypto.randomUUID()];
  const quarterFinalIds = quarterFinals.map(() => crypto.randomUUID());
  const rows = [
    { id: finalId, tournament_id: tournamentId.data, stage: 'knockout', bracket_round: 'final', bracket_position: 1, round_label: 'Final', match_number: 31, status: 'scheduled' },
    ...semiFinalIds.map((id, index) => ({ id, tournament_id: tournamentId.data, stage: 'knockout', bracket_round: 'semi_final', bracket_position: index + 1, round_label: 'Semi-Final', match_number: 29 + index, status: 'scheduled', next_match_id: finalId, next_match_side: index === 0 ? 'home' : 'away' })),
    ...quarterFinals.map((match, index) => ({ id: quarterFinalIds[index], tournament_id: tournamentId.data, stage: 'knockout', bracket_round: 'quarter_final', bracket_position: match.position, round_label: 'Quarter-Final', match_number: 25 + index, status: 'scheduled', home_team_id: match.homeTeamId, away_team_id: match.awayTeamId, next_match_id: semiFinalIds[index < 2 ? 0 : 1], next_match_side: index % 2 === 0 ? 'home' : 'away' })),
  ];
  const { error } = await supabase.from('tournament_matches').insert(rows);
  if (error) { console.error('[tournament:fiba-knockout]', error.message); redirect('/admin/tournaments?error=knockout-save'); }
  refreshTournaments(); redirect('/admin/tournaments?saved=fiba-knockout');
}

export async function saveTournamentMatch(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({ id: optionalId, tournamentId: uuid, roundLabel: z.string().trim().min(1).max(80), matchNumber: optionalPositiveInt,
    scheduledAt: optionalDateTime, venue: z.string().trim().max(160), status: z.enum(['scheduled', 'live', 'final', 'postponed', 'cancelled']),
    homeTeamId: optionalId, awayTeamId: optionalId, homeScore: optionalScore, awayScore: optionalScore, winnerTeamId: optionalId,
    streamUrl: optionalUrl, notes: z.string().trim().max(2000),
  }).safeParse({ id: formData.get('id'), tournamentId: formData.get('tournament_id'), roundLabel: formData.get('round_label'), matchNumber: formData.get('match_number'),
    scheduledAt: formData.get('scheduled_at'), venue: formData.get('venue'), status: formData.get('status'), homeTeamId: formData.get('home_team_id'),
    awayTeamId: formData.get('away_team_id'), homeScore: formData.get('home_score'), awayScore: formData.get('away_score'), winnerTeamId: formData.get('winner_team_id'),
    streamUrl: formData.get('stream_url'), notes: formData.get('notes') });
  if (!parsed.success || (parsed.data.homeTeamId && parsed.data.homeTeamId === parsed.data.awayTeamId)) redirect('/admin/tournaments?error=invalid-match');
  const hasBothScores = parsed.data.homeScore !== '' && parsed.data.awayScore !== '';
  if (parsed.data.status === 'final' && (!hasBothScores || parsed.data.homeScore === parsed.data.awayScore)) redirect('/admin/tournaments?error=final-score-required');
  const derivedWinnerId = parsed.data.status === 'final' && hasBothScores
    ? parsed.data.homeScore > parsed.data.awayScore ? parsed.data.homeTeamId : parsed.data.awayTeamId
    : parsed.data.winnerTeamId;
  if (derivedWinnerId && derivedWinnerId !== parsed.data.homeTeamId && derivedWinnerId !== parsed.data.awayTeamId) redirect('/admin/tournaments?error=invalid-winner');
  const selectedTeamIds = [...new Set([parsed.data.homeTeamId, parsed.data.awayTeamId, parsed.data.winnerTeamId].filter(Boolean))] as string[];
  if (selectedTeamIds.length) {
    const { data: participantRows } = await supabase.from('tournament_teams').select('team_id').eq('tournament_id', parsed.data.tournamentId).in('team_id', selectedTeamIds);
    if (participantRows?.length !== selectedTeamIds.length) redirect('/admin/tournaments?error=invalid-team');
  }
  const payload = { tournament_id: parsed.data.tournamentId, round_label: parsed.data.roundLabel, match_number: parsed.data.matchNumber || null,
    scheduled_at: parsed.data.scheduledAt ? ictDateTimeToIso(parsed.data.scheduledAt) : null, venue: parsed.data.venue || null, status: parsed.data.status,
    home_team_id: parsed.data.homeTeamId || null, away_team_id: parsed.data.awayTeamId || null, home_score: parsed.data.homeScore === '' ? null : parsed.data.homeScore,
    away_score: parsed.data.awayScore === '' ? null : parsed.data.awayScore, winner_team_id: derivedWinnerId || null,
    stream_url: parsed.data.streamUrl || null, notes: parsed.data.notes || null, updated_at: new Date().toISOString() };
  const result = parsed.data.id ? await supabase.from('tournament_matches').update(payload).eq('id', parsed.data.id) : await supabase.from('tournament_matches').insert(payload);
  if (result.error) { console.error('[tournament:match]', result.error.message); redirect('/admin/tournaments?error=match-save'); }
  if (parsed.data.id) {
    const { data: bracketMatch } = await supabase.from('tournament_matches').select('bracket_round, next_match_id, next_match_side').eq('id', parsed.data.id).maybeSingle();
    if (bracketMatch?.next_match_id && bracketMatch.next_match_side) {
      const sideField = bracketMatch.next_match_side === 'home' ? 'home_team_id' : 'away_team_id';
      const { error: advanceError } = await supabase.from('tournament_matches').update({ [sideField]: derivedWinnerId || null }).eq('id', bracketMatch.next_match_id);
      if (advanceError) { console.error('[tournament:advance]', advanceError.message); redirect('/admin/tournaments?error=bracket-advance'); }
    }
    if (bracketMatch?.bracket_round === 'final' && derivedWinnerId) {
      const { error: championError } = await supabase.from('tournaments').update({ champion_team_id: derivedWinnerId, status: 'completed' }).eq('id', parsed.data.tournamentId);
      if (championError) { console.error('[tournament:champion]', championError.message); redirect('/admin/tournaments?error=champion-save'); }
    }
  }
  refreshTournaments(); redirect('/admin/tournaments?saved=match');
}

export async function deleteTournamentMatch(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff'); const id = uuid.safeParse(formData.get('id'));
  if (!id.success) redirect('/admin/tournaments?error=invalid-match');
  const { error } = await supabase.from('tournament_matches').delete().eq('id', id.data);
  if (error) redirect('/admin/tournaments?error=match-delete'); refreshTournaments(); redirect('/admin/tournaments?saved=match-deleted');
}

function mapFibaMatch(row: Record<string, unknown>): FibaMatch {
  const numberOrNull = (value: unknown) => typeof value === 'number' ? value : null;
  const stringOrNull = (value: unknown) => typeof value === 'string' && value ? value : null;
  return {
    id: String(row.id), stage: stringOrNull(row.stage) as FibaMatch['stage'], groupName: stringOrNull(row.group_name),
    roundLabel: String(row.round_label ?? ''), bracketRound: stringOrNull(row.bracket_round) as FibaMatch['bracketRound'], bracketPosition: numberOrNull(row.bracket_position),
    status: String(row.status ?? ''), homeTeamId: stringOrNull(row.home_team_id), awayTeamId: stringOrNull(row.away_team_id),
    homeScore: numberOrNull(row.home_score), awayScore: numberOrNull(row.away_score), winnerTeamId: stringOrNull(row.winner_team_id),
  };
}
