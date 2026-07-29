import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAdminContext } from '@/lib/admin-auth';
import { extractBasketballStats } from '@/lib/claude-vision';
import type { EditableStatRow } from '@/lib/stat-import';
import { isSameOriginRequest } from '@/lib/request-security';

export const runtime = 'nodejs';

const gameIdSchema = z.string().uuid();
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedMime = (typeof allowedTypes)[number];

type PlayerRow = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  roblox_username: string | null;
};

function normalizeName(value: string) {
  return value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9ก-๙]/g, '');
}

function percent(made: number, attempted: number, extracted: number) {
  if (!attempted) return extracted || 0;
  return Math.round((made / attempted) * 1000) / 10;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const admin = await getApiAdminContext('staff');
  if (!admin) return NextResponse.json({ error: 'ไม่มีสิทธิ์นำเข้าสถิติ' }, { status: 403 });

  const formData = await request.formData();
  const gameIdResult = gameIdSchema.safeParse(formData.get('gameId'));
  const image = formData.get('image');
  if (!gameIdResult.success || !(image instanceof File)) {
    return NextResponse.json({ error: 'กรุณาเลือกเกมและไฟล์ภาพ' }, { status: 400 });
  }
  if (!allowedTypes.includes(image.type as AllowedMime)) {
    return NextResponse.json({ error: 'รองรับเฉพาะ JPEG, PNG, WebP หรือ GIF' }, { status: 415 });
  }
  if (image.size < 1 || image.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'ไฟล์ภาพต้องมีขนาดไม่เกิน 10 MB' }, { status: 413 });
  }

  const gameId = gameIdResult.data;
  const { data: game } = await admin.supabase
    .from('games')
    .select('id, season_id, home_team_id, away_team_id, status')
    .eq('id', gameId)
    .maybeSingle();
  if (!game || game.status !== 'final') {
    return NextResponse.json({ error: 'นำเข้าสถิติได้เฉพาะเกมที่ประกาศผล final แล้ว' }, { status: 409 });
  }

  const importId = randomUUID();
  const extension = ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  } as Record<AllowedMime, string>)[image.type as AllowedMime];
  const storagePath = `${gameId}/${importId}.${extension}`;
  const bytes = new Uint8Array(await image.arrayBuffer());
  const { error: uploadError } = await admin.supabase.storage
    .from('stat-screenshots')
    .upload(storagePath, Buffer.from(bytes), { contentType: image.type, upsert: false, cacheControl: '3600' });
  if (uploadError) {
    console.error('[stats:upload]', uploadError.message);
    return NextResponse.json({ error: 'เก็บภาพต้นฉบับไม่สำเร็จ ตรวจสอบว่า migration และ bucket ถูกสร้างแล้ว' }, { status: 500 });
  }

  const model = process.env.CLAUDE_MODEL?.trim() || 'claude-sonnet-4-6';
  const { error: importError } = await admin.supabase.from('stat_imports').insert({
    id: importId,
    game_id: gameId,
    storage_path: storagePath,
    original_filename: image.name.slice(0, 255) || `box-score.${extension}`,
    mime_type: image.type,
    file_size_bytes: image.size,
    model,
    status: 'processing',
    created_by: admin.user.id,
  });
  if (importError) {
    await admin.supabase.storage.from('stat-screenshots').remove([storagePath]);
    console.error('[stats:import-create]', importError.message);
    return NextResponse.json({ error: 'สร้างรายการนำเข้าไม่สำเร็จ กรุณารัน migration ล่าสุด' }, { status: 500 });
  }

  try {
    const extraction = await extractBasketballStats({ bytes, mediaType: image.type as AllowedMime });
    if (extraction.rows.length === 0) throw new Error('ไม่พบแถวผู้เล่นในภาพ');

    const { data: rosterRows } = await admin.supabase
      .from('rosters')
      .select('player_id, team_id')
      .eq('season_id', game.season_id)
      .in('team_id', [game.home_team_id, game.away_team_id]);
    const playerIds = [...new Set((rosterRows ?? []).map((row) => row.player_id as string))];
    const { data: playerRows } = playerIds.length
      ? await admin.supabase.from('players').select('id, name, first_name, last_name, roblox_username').in('id', playerIds)
      : { data: [] };
    const players = (playerRows ?? []) as PlayerRow[];
    const rosterByPlayer = new Map((rosterRows ?? []).map((row) => [row.player_id as string, row.team_id as string]));

    const rows: EditableStatRow[] = extraction.rows.map((row) => {
      const normalized = normalizeName(row.Player);
      const exactMatches = players.filter((player) => [
        player.name ?? '',
        `${player.first_name ?? ''} ${player.last_name ?? ''}`,
        player.roblox_username ?? '',
      ].some((name) => normalizeName(name) === normalized));
      const looseMatches = exactMatches.length ? exactMatches : players.filter((player) => [
        player.name ?? '',
        `${player.first_name ?? ''} ${player.last_name ?? ''}`,
        player.roblox_username ?? '',
      ].some((name) => {
        const candidate = normalizeName(name);
        return candidate.length >= 3 && (candidate.includes(normalized) || normalized.includes(candidate));
      }));
      const match = looseMatches.length === 1 ? looseMatches[0] : null;
      return {
        player: row.Player.trim(),
        playerId: match?.id ?? '',
        teamId: match ? rosterByPlayer.get(match.id) ?? '' : '',
        pts: Math.max(0, Math.round(row.Pts)),
        fgm: Math.max(0, Math.round(row.Fgm)),
        fga: Math.max(0, Math.round(row.Fga)),
        fgPct: percent(row.Fgm, row.Fga, row['Fg%']),
        threePm: Math.max(0, Math.round(row['3pm'])),
        threePa: Math.max(0, Math.round(row['3pa'])),
        threePct: percent(row['3pm'], row['3pa'], row['3p%']),
        ftm: Math.max(0, Math.round(row.Ftm)),
        fta: Math.max(0, Math.round(row.Fta)),
        ftPct: percent(row.Ftm, row.Fta, row['Ft%']),
        ast: Math.max(0, Math.round(row.Ast)),
        stl: Math.max(0, Math.round(row.Stl)),
        bk: Math.max(0, Math.round(row.Bk)),
        orb: Math.max(0, Math.round(row.Orb)),
        drb: Math.max(0, Math.round(row.Drb)),
        reb: Math.max(0, Math.round(row.Reb)),
        tov: Math.max(0, Math.round(row.Tov)),
        fls: Math.max(0, Math.round(row.Fls)),
        plusMinus: Math.round(row['+/-']),
        ping: Math.max(0, Math.round(row.Ping)),
      };
    });
    const warnings = [
      ...extraction.warnings,
      ...rows.filter((row) => !row.playerId).map((row) => `ยังจับคู่ผู้เล่น “${row.player}” กับ roster ไม่ได้`),
    ];

    const { error: updateError } = await admin.supabase.from('stat_imports').update({
      model: extraction.model,
      status: 'review_required',
      extracted_rows: rows,
      warnings,
      error_message: null,
    }).eq('id', importId);
    if (updateError) throw updateError;

    return NextResponse.json({ importId, rows, warnings, model: extraction.model });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Unknown extraction error';
    console.error('[stats:extract]', detail);
    await admin.supabase.from('stat_imports').update({ status: 'failed', error_message: detail.slice(0, 1000) }).eq('id', importId);
    return NextResponse.json({ error: `วิเคราะห์ภาพไม่สำเร็จ: ${detail}`, importId }, { status: 502 });
  }
}
