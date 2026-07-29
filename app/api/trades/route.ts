import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-admin';
import { isSameOriginRequest } from '@/lib/request-security';

const requestSchema = z.object({
  playerId: z.string().uuid(),
  toTeamId: z.string().uuid(),
  requestKind: z.enum(['acquire', 'release', 'transfer']),
  notes: z.string().trim().max(500).optional().default(''),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const user = await getCurrentUser();
  const supabase = createAdminClient();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนยื่นคำขอ' }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'ระบบฐานข้อมูลยังไม่พร้อมใช้งาน' }, { status: 503 });
  const isStaff = user.role === 'staff' || user.role === 'admin';
  if (!isStaff && user.role !== 'franchise_owner') {
    return NextResponse.json({ error: 'เฉพาะ Franchise Owner หรือทีมงานลีกเท่านั้นที่ยื่นคำขอซื้อขายได้' }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลคำขอไม่ถูกต้อง' }, { status: 400 });

  const [{ data: player }, { data: activeSeason }] = await Promise.all([
    supabase.from('players').select('id, team_id, is_active').eq('id', parsed.data.playerId).maybeSingle(),
    supabase.from('seasons').select('id').eq('status', 'active').order('starts_on', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!player?.is_active) return NextResponse.json({ error: 'ไม่พบผู้เล่นที่เลือก' }, { status: 404 });

  let fromTeamId = typeof player.team_id === 'string' ? player.team_id : '';
  if (activeSeason?.id) {
    const { data: roster } = await supabase
      .from('rosters')
      .select('team_id')
      .eq('season_id', activeSeason.id)
      .eq('player_id', parsed.data.playerId)
      .eq('status', 'active')
      .maybeSingle();
    if (roster?.team_id) fromTeamId = roster.team_id;
  }
  if (!fromTeamId) return NextResponse.json({ error: 'ผู้เล่นยังไม่มีทีมต้นทางในฤดูกาลนี้' }, { status: 409 });
  if (fromTeamId === parsed.data.toTeamId) return NextResponse.json({ error: 'ทีมต้นทางและปลายทางต้องไม่ใช่ทีมเดียวกัน' }, { status: 400 });

  if (user.role === 'franchise_owner') {
    if (!user.franchiseTeamId) return NextResponse.json({ error: 'บัญชี Franchise Owner ยังไม่ได้ผูกกับทีม' }, { status: 403 });
    if (parsed.data.requestKind === 'acquire' && parsed.data.toTeamId !== user.franchiseTeamId) {
      return NextResponse.json({ error: 'คำขอซื้อผู้เล่นต้องย้ายเข้าสู่ทีม Franchise ของคุณ' }, { status: 403 });
    }
    if (parsed.data.requestKind === 'release' && fromTeamId !== user.franchiseTeamId) {
      return NextResponse.json({ error: 'คำขอขายผู้เล่นทำได้เฉพาะผู้เล่นในทีม Franchise ของคุณ' }, { status: 403 });
    }
    if (parsed.data.requestKind === 'transfer') {
      return NextResponse.json({ error: 'Franchise Owner ต้องเลือกซื้อเข้าทีมหรือขายออกจากทีม' }, { status: 400 });
    }
  }

  const { data: destination } = await supabase.from('teams').select('id').eq('id', parsed.data.toTeamId).eq('is_active', true).maybeSingle();
  if (!destination) return NextResponse.json({ error: 'ไม่พบทีมปลายทางที่เลือก' }, { status: 404 });

  const { data: existing } = await supabase
    .from('trades')
    .select('id')
    .eq('player_id', parsed.data.playerId)
    .eq('status', 'pending')
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'ผู้เล่นคนนี้มีคำขอที่รอตรวจสอบอยู่แล้ว' }, { status: 409 });

  const { data, error } = await supabase.from('trades').insert({
    player_id: parsed.data.playerId,
    from_team_id: fromTeamId,
    to_team_id: parsed.data.toTeamId,
    trade_date: new Date().toISOString().slice(0, 10),
    status: 'pending',
    request_kind: parsed.data.requestKind,
    notes: parsed.data.notes || null,
    created_by: user.id,
  }).select('id').single();
  if (error) {
    console.error('[trade:create]', error.message);
    return NextResponse.json({ error: 'บันทึกคำขอไม่สำเร็จ' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
