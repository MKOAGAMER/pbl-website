import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban, Clock3, ShieldCheck } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Blacklist & Discipline',
  description: 'Public PBAL blacklist and disciplinary notices.',
};

type Row = Record<string, unknown>;
const labels: Record<string, string> = { warning: 'Warning', match_suspension: 'Match suspension', trade_ban: 'Trade ban', account_ban: 'Account ban', blacklist: 'Blacklist' };

export default async function BlacklistPage() {
  const supabase = createAdminClient();
  const { data, error } = supabase
    ? await supabase.from('public_player_disciplinary_actions').select('*').order('created_at', { ascending: false }).limit(300)
    : { data: null, error: new Error('Database unavailable') };
  const rows = !error && Array.isArray(data) ? data as Row[] : [];
  const active = rows.filter((row) => row.is_active === true);
  const history = rows.filter((row) => row.is_active !== true);

  return <>
    <section className="relative overflow-hidden border-b border-[var(--line)]"><div className="race-grid absolute inset-0 opacity-25" /><div className="site-shell relative py-16 sm:py-24"><p className="race-eyebrow">League integrity</p><h1 className="race-display mt-4 max-w-4xl text-5xl sm:text-7xl">Blacklist & Discipline</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">ประกาศบทลงโทษที่ PBAL อนุญาตให้เปิดเผยต่อสาธารณะ พร้อมสถานะและระยะเวลาที่มีผล ข้อมูลหลักฐานภายในจะไม่แสดงในหน้านี้</p></div></section>
    <main className="site-shell py-12 sm:py-16">
      <div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-2xl font-black uppercase italic"><Ban className="h-6 w-6 text-red-300" /> Active</h2><span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-black text-red-200">{active.length}</span></div>
      <div className="grid gap-4 lg:grid-cols-2">{active.length ? active.map((row) => <PublicAction key={String(row.id)} row={row} />) : <div className="rounded-[1.5rem] border border-dashed border-[var(--line-strong)] p-12 text-center lg:col-span-2"><ShieldCheck className="mx-auto h-9 w-9 text-emerald-300" /><h3 className="mt-4 font-black">ไม่มีประกาศลงโทษที่กำลังมีผล</h3></div>}</div>
      {history.length > 0 && <section className="mt-14"><h2 className="mb-5 text-xl font-black uppercase italic text-[var(--ink-soft)]">Closed records</h2><div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">{history.map((row) => <div key={String(row.id)} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-4 last:border-0"><div><p className="font-black">{String(row.player_name)} · {labels[String(row.action_type)] ?? String(row.action_type)}</p><p className="mt-1 text-xs text-[var(--ink-faint)]">{String(row.public_note)}</p></div><span className="text-xs font-black uppercase text-[var(--ink-faint)]">Ended</span></div>)}</div></section>}
    </main>
  </>;
}

function PublicAction({ row }: { row: Row }) {
  const playerName = String(row.player_name ?? 'Unknown player');
  return <article className="rounded-[1.5rem] border border-red-400/20 bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-red-300">{labels[String(row.action_type)] ?? String(row.action_type)}</p>{row.player_slug ? <Link href={`/players/${row.player_slug}`} className="mt-2 block text-2xl font-black hover:text-[var(--orange-soft)]">{playerName}</Link> : <h3 className="mt-2 text-2xl font-black">{playerName}</h3>}<p className="mt-1 text-xs text-[var(--ink-faint)]">@{String(row.roblox_username ?? 'unknown')}</p></div><span className="rounded-full bg-red-400/10 px-3 py-1 text-[0.6rem] font-black uppercase text-red-200">Active</span></div><p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">{String(row.public_note)}</p><p className="mt-5 flex items-center gap-2 border-t border-[var(--line)] pt-4 text-xs text-[var(--ink-faint)]"><Clock3 className="h-3.5 w-3.5" />{row.ends_at ? `มีผลถึง ${formatDate(String(row.ends_at))}` : 'มีผลจนกว่าจะมีประกาศเปลี่ยนแปลง'}</p></article>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)); }
