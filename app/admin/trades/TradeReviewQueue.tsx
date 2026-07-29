'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Check, Clock3, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TradeRecord } from '@/lib/trade-types';

export function TradeReviewQueue({ trades }: { trades: TradeRecord[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const pending = useMemo(() => trades.filter((trade) => trade.status === 'pending'), [trades]);
  const reviewed = useMemo(() => trades.filter((trade) => trade.status !== 'pending').slice(0, 30), [trades]);

  async function review(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`/api/admin/trades/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, note: notes[id] ?? '' }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'ตรวจสอบคำขอไม่สำเร็จ');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ตรวจสอบคำขอไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">รอตรวจสอบ</h2><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-200">{pending.length}</span></div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        <div className="space-y-4">
          {pending.length === 0 ? <EmptyQueue /> : pending.map((trade) => (
            <article key={trade.id} className="rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(trade.requestedAt))}</p><h3 className="mt-2 text-xl font-black">{trade.playerName}</h3></div><Clock3 className="h-5 w-5 text-amber-300" /></div>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-xl bg-[var(--page)] p-4"><strong>{trade.fromTeamAbbreviation}</strong><ArrowLeftRight className="h-5 w-5 text-[var(--orange-soft)]" /><strong className="text-right">{trade.toTeamAbbreviation}</strong></div>
              {trade.notes && <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">{trade.notes}</p>}
              <textarea value={notes[trade.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [trade.id]: event.target.value }))} className="admin-input mt-4 py-3" rows={2} maxLength={500} placeholder="หมายเหตุการตรวจสอบ (ไม่บังคับ)" />
              <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" disabled={busyId === trade.id} onClick={() => void review(trade.id, 'reject')} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-400/30 text-xs font-black uppercase tracking-[0.1em] text-red-200 disabled:opacity-50"><X className="h-4 w-4" /> ไม่อนุมัติ</button><button type="button" disabled={busyId === trade.id} onClick={() => void review(trade.id, 'approve')} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-xs font-black uppercase tracking-[0.1em] text-emerald-950 disabled:opacity-50"><Check className="h-4 w-4" /> อนุมัติ</button></div>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-black">ตรวจแล้วล่าสุด</h2>
        <div className="overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)]">
          {reviewed.length === 0 ? <p className="p-6 text-sm text-[var(--ink-faint)]">ยังไม่มีรายการที่ตรวจแล้ว</p> : reviewed.map((trade) => <div key={trade.id} className="flex items-center justify-between gap-4 border-b border-[var(--line)] p-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-black">{trade.playerName}</p><p className="mt-1 text-xs text-[var(--ink-faint)]">{trade.fromTeamAbbreviation} → {trade.toTeamAbbreviation}</p></div><span className={`rounded-full px-2.5 py-1 text-[0.58rem] font-black uppercase ${trade.status === 'approved' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/10 text-red-200'}`}>{trade.status}</span></div>)}
        </div>
      </section>
    </div>
  );
}

function EmptyQueue() {
  return <div className="rounded-[1.4rem] border border-dashed border-[var(--line-strong)] p-10 text-center"><Check className="mx-auto h-8 w-8 text-emerald-300" /><h3 className="mt-4 font-black">ไม่มีคำขอค้าง</h3><p className="mt-2 text-sm text-[var(--ink-faint)]">คำขอใหม่จะปรากฏที่นี่เพื่อให้ staff ตรวจสอบ</p></div>;
}

