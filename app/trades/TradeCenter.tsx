'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, CheckCircle2, Clock3, Filter, Search, Send, ShieldCheck, XCircle } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { Player, Team } from '@/lib/league-types';
import type { TradeRecord, TradeRequestKind, TradeStatus } from '@/lib/trade-types';

type Props = {
  trades: TradeRecord[];
  players: Player[];
  teams: Team[];
  currentUsername: string | null;
  isStaff: boolean;
  canRequestTrade: boolean;
  franchiseTeamId: string | null;
  currentPlayerId: string | null;
};

export function TradeCenter({ trades, players, teams, currentUsername, isStaff, canRequestTrade, franchiseTeamId, currentPlayerId }: Props) {
  const router = useRouter();
  const [requestKind, setRequestKind] = useState<TradeRequestKind>(franchiseTeamId ? 'acquire' : 'transfer');
  const eligiblePlayers = useMemo(() => {
    if (currentPlayerId && !franchiseTeamId && !isStaff) {
      return players.filter((player) => player.id === currentPlayerId);
    }
    if (!franchiseTeamId || requestKind === 'transfer') {
      return requestKind === 'acquire'
        ? players.filter((player) => !player.teamId)
        : players.filter((player) => Boolean(player.teamId));
    }
    return requestKind === 'release'
      ? players.filter((player) => player.teamId === franchiseTeamId)
      : players.filter((player) => player.teamId !== franchiseTeamId);
  }, [currentPlayerId, franchiseTeamId, isStaff, players, requestKind]);
  const [playerId, setPlayerId] = useState(() => (
    currentPlayerId && !franchiseTeamId && !isStaff
      ? currentPlayerId
      : franchiseTeamId
      ? players.find((player) => player.teamId !== franchiseTeamId)?.id ?? ''
      : players.find((player) => Boolean(player.teamId))?.id ?? ''
  ));
  const selectedPlayer = eligiblePlayers.find((player) => player.id === playerId);
  const destinations = teams.filter((team) => team.id !== selectedPlayer?.teamId);
  const [toTeamId, setToTeamId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [teamId, setTeamId] = useState('all');
  const [date, setDate] = useState('');

  const filteredTrades = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return trades.filter((trade) => {
      const matchesQuery = !normalized || [trade.playerName, trade.fromTeamName, trade.toTeamName]
        .some((value) => value.toLowerCase().includes(normalized));
      const matchesTeam = teamId === 'all' || trade.fromTeamId === teamId || trade.toTeamId === teamId;
      const matchesDate = !date || trade.tradeDate === date;
      return matchesQuery && matchesTeam && matchesDate;
    });
  }, [date, query, teamId, trades]);

  async function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const destinationTeamId = requestKind === 'acquire' && franchiseTeamId
      ? franchiseTeamId
      : toTeamId === '__free_agent__' ? null : toTeamId || null;
    const submittedKind: TradeRequestKind = destinationTeamId ? requestKind : 'release';
    if (!playerId || (submittedKind !== 'release' && !destinationTeamId)) {
      setMessage('กรุณาเลือกผู้เล่นและทีมปลายทาง');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerId, toTeamId: destinationTeamId, requestKind: submittedKind, notes }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'ส่งคำขอไม่สำเร็จ');
      setMessage(currentPlayerId && !franchiseTeamId && !isStaff
        ? 'ส่งคำขอแล้ว Franchise Owner และทีมงานลีกจะตรวจสอบก่อนเปลี่ยน roster'
        : 'ส่งคำขอแล้ว ทีมงานลีกจะตรวจสอบก่อนประกาศอย่างเป็นทางการ');
      setNotes('');
      setToTeamId('');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ส่งคำขอไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--line)]">
        <div className="subtle-grid absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="site-shell relative py-14 sm:py-20">
          <p className="eyebrow">PBAL Player Movement</p>
          <h1 className="display-type mt-5 max-w-4xl text-5xl sm:text-7xl">Trade Center</h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
            ศูนย์กลางคำขอย้ายทีมและประวัติการเทรดอย่างเป็นทางการ ค้นหาได้ตามผู้เล่น ทีม และวันที่ พร้อมสถานะที่ตรวจสอบโดยทีมงานลีก
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.1em]">
            <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2">{trades.filter((trade) => trade.status === 'approved').length} official trades</span>
            {isStaff && <Link href="/admin/trades" className="rounded-full bg-[var(--orange)] px-4 py-2 text-black">Open review queue</Link>}
          </div>
        </div>
      </section>

      <main className="site-shell py-10 sm:py-14">
        <div className="grid gap-7 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="h-fit rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><Send className="h-5 w-5" /></span>
              <div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">Request desk</p><h2 className="mt-1 text-xl font-black">ยื่นคำขอเทรด</h2></div>
            </div>
            {!currentUsername ? (
              <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--page)] p-4 text-sm leading-6 text-[var(--ink-soft)]">
                เข้าสู่ระบบด้วย Roblox ก่อนยื่นคำขอ <Link href="/login?next=/trades" className="font-black text-[var(--orange-soft)]">เข้าสู่ระบบ →</Link>
              </div>
            ) : !canRequestTrade ? (
              <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--page)] p-4 text-sm leading-6 text-[var(--ink-soft)]">
                บัญชีนี้ยังไม่ได้ผูกกับ Player profile จึงยื่นคำขอย้ายทีมไม่ได้ กรุณาติดต่อแอดมินเพื่อผูก Roblox account กับผู้เล่น
              </div>
            ) : (
              <form onSubmit={submitTrade} className="mt-6 space-y-4">
                <p className="text-xs text-[var(--ink-faint)]">ยื่นคำขอในชื่อ <strong className="text-[var(--ink)]">{currentUsername}</strong></p>
                {(franchiseTeamId || isStaff) && <label className="block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">ประเภทธุรกรรม
                  <select value={requestKind} onChange={(event) => {
                    const kind = event.target.value as TradeRequestKind;
                    setRequestKind(kind);
                    const nextPlayers = franchiseTeamId
                      ? kind === 'release'
                        ? players.filter((player) => player.teamId === franchiseTeamId)
                        : players.filter((player) => player.teamId !== franchiseTeamId)
                      : kind === 'acquire'
                        ? players.filter((player) => !player.teamId)
                        : players.filter((player) => Boolean(player.teamId));
                    setPlayerId(nextPlayers[0]?.id ?? '');
                    setToTeamId('');
                  }} className="admin-input mt-2">
                    <option value="acquire">ซื้อผู้เล่นเข้าทีม</option>
                    <option value="release">ปล่อย / ส่งผู้เล่นออกจากทีม</option>
                    {isStaff && <option value="transfer">ย้ายระหว่างทีม</option>}
                  </select>
                </label>}
                <label className="block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">ผู้เล่น
                  <select value={playerId} onChange={(event) => { setPlayerId(event.target.value); setToTeamId(''); }} className="admin-input mt-2" required>
                    {eligiblePlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3 text-center">
                  <span><span className="block text-[0.6rem] font-black uppercase text-[var(--ink-faint)]">ต้นทาง</span><strong className="mt-1 block text-sm">{teams.find((team) => team.id === selectedPlayer?.teamId)?.abbreviation ?? 'FA'}</strong></span>
                  <ArrowLeftRight className="h-5 w-5 text-[var(--orange-soft)]" />
                  <span><span className="block text-[0.6rem] font-black uppercase text-[var(--ink-faint)]">ปลายทาง</span><strong className="mt-1 block text-sm">{toTeamId === '__free_agent__' ? 'FA' : teams.find((team) => team.id === (requestKind === 'acquire' && franchiseTeamId ? franchiseTeamId : toTeamId))?.abbreviation ?? (requestKind === 'release' ? 'FA' : '—')}</strong></span>
                </div>
                {!(requestKind === 'acquire' && franchiseTeamId) && <label className="block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">ทีมปลายทาง
                  <select value={toTeamId} onChange={(event) => setToTeamId(event.target.value)} className="admin-input mt-2" required={requestKind !== 'release'}>
                    <option value="">เลือกทีม</option>
                    {(requestKind === 'release' || Boolean(currentPlayerId && !franchiseTeamId && !isStaff)) && <option value="__free_agent__">Free Agent (ไม่มีทีม)</option>}
                    {destinations.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                </label>}
                <label className="block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">หมายเหตุ (ไม่บังคับ)
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={500} className="admin-input mt-2 py-3" placeholder="ข้อมูลประกอบคำขอ" />
                </label>
                {message && <p role="status" className="rounded-xl border border-[var(--line)] bg-[var(--page)] px-3 py-2.5 text-sm text-[var(--ink-soft)]">{message}</p>}
                <button type="submit" disabled={submitting || eligiblePlayers.length === 0} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--orange)] px-5 text-xs font-black uppercase tracking-[0.12em] text-black disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? 'กำลังส่ง...' : currentPlayerId && !franchiseTeamId && !isStaff ? 'ส่งคำขอย้ายทีม' : 'ส่งให้ทีมงานตรวจสอบ'}
                </button>
              </form>
            )}
            <div className="mt-5 flex gap-3 border-t border-[var(--line)] pt-5 text-xs leading-5 text-[var(--ink-faint)]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Player สามารถขอย้ายทีมของตัวเองหรือขอเป็น Free Agent ได้ โดย Franchise Owner จะเห็นคำขอของทีม และ roster จะเปลี่ยนเมื่อ staff อนุมัติเท่านั้น</p></div>
          </section>

          <section>
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-[var(--orange-soft)]" /><h2 className="font-black">ค้นหาประวัติเทรด</h2></div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_13rem_12rem]">
                <label className="relative"><span className="sr-only">ค้นหาผู้เล่น</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="admin-input pl-11" placeholder="ผู้เล่นหรือชื่อทีม" /></label>
                <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="admin-input" aria-label="กรองตามทีม"><option value="all">ทุกทีม</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="admin-input" aria-label="กรองตามวันที่" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {filteredTrades.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line-strong)] p-10 text-center"><ArrowLeftRight className="mx-auto h-8 w-8 text-[var(--ink-faint)]" /><h3 className="mt-4 font-black">ไม่พบรายการเทรด</h3><p className="mt-2 text-sm text-[var(--ink-faint)]">ลองเปลี่ยนตัวกรอง หรือรอประกาศรายการแรกจากทีมงานลีก</p></div>
              ) : filteredTrades.map((trade) => <TradeRow key={trade.id} trade={trade} />)}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

const statusConfig: Record<TradeStatus, { label: string; className: string; icon: typeof Clock3 }> = {
  pending: { label: 'รอตรวจสอบ', className: 'bg-amber-400/10 text-amber-200', icon: Clock3 },
  approved: { label: 'อนุมัติแล้ว', className: 'bg-emerald-400/10 text-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'ไม่อนุมัติ', className: 'bg-red-400/10 text-red-200', icon: XCircle },
  cancelled: { label: 'ยกเลิก', className: 'bg-white/5 text-[var(--ink-faint)]', icon: XCircle },
};

function TradeRow({ trade }: { trade: TradeRecord }) {
  const config = statusConfig[trade.status];
  const StatusIcon = config.icon;
  return (
    <article className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">{trade.requestKind === 'acquire' ? 'ซื้อเข้าทีม' : trade.requestKind === 'release' ? 'ขายออกจากทีม' : 'ย้ายทีม'} · {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${trade.tradeDate}T00:00:00`))}</p>
          {trade.playerSlug ? <Link href={`/players/${trade.playerSlug}`} className="mt-2 block text-xl font-black hover:text-[var(--orange-soft)]">{trade.playerName}</Link> : <h3 className="mt-2 text-xl font-black">{trade.playerName}</h3>}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.08em] ${config.className}`}><StatusIcon className="h-3.5 w-3.5" />{config.label}</span>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-xl bg-[var(--page)] p-4">
        <span><span className="block text-[0.58rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">ทีมต้นทาง</span><strong className="mt-1 block text-sm">{trade.fromTeamName}</strong></span>
        <ArrowLeftRight className="h-5 w-5 text-[var(--orange-soft)]" />
        <span className="text-right"><span className="block text-[0.58rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">ทีมปลายทาง</span><strong className="mt-1 block text-sm">{trade.toTeamName}</strong></span>
      </div>
      {(trade.notes || trade.reviewNote) && <div className="mt-4 text-xs leading-5 text-[var(--ink-faint)]">{trade.notes && <p>หมายเหตุ: {trade.notes}</p>}{trade.reviewNote && <p>ผลการตรวจสอบ: {trade.reviewNote}</p>}</div>}
      {trade.isOwnRequest && trade.status !== 'approved' && <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[var(--orange-soft)]">คำขอของคุณ</p>}
    </article>
  );
}
