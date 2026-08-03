import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Ban, Clock3, ShieldAlert } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { getDisciplinaryActions, type DisciplineActionType } from '@/lib/discipline';
import { ConfirmSubmitButton } from '../ConfirmSubmitButton';
import { SubmitButton } from '../SubmitButton';
import { issueDisciplinaryAction, revokeAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Player Discipline', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

const actionLabels: Record<DisciplineActionType, string> = {
  warning: 'Warning',
  match_suspension: 'Match suspension',
  trade_ban: 'Trade ban',
  account_ban: 'Account ban',
  blacklist: 'Blacklist',
};

export default async function DisciplinePage({ searchParams }: Props) {
  const [{ supabase }, params] = await Promise.all([requireAdminPermission('staff'), searchParams]);
  const [actions, playersResult, usersResult] = await Promise.all([
    getDisciplinaryActions(supabase, { limit: 300 }),
    supabase.from('players').select('id, name, roblox_username, is_active').order('name'),
    supabase.from('users').select('id, username'),
  ]);
  const players = playersResult.data ?? [];
  const playerById = new Map(players.map((player) => [String(player.id), player]));
  const userById = new Map((usersResult.data ?? []).map((user) => [String(user.id), String(user.username)]));
  const active = actions.filter((action) => action.isActive);
  const history = actions.filter((action) => !action.isActive);

  return (
    <main className="site-shell py-10 sm:py-14">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Admin</Link>
      <div className="mt-7 border-b border-[var(--line)] pb-8">
        <p className="eyebrow">League integrity</p>
        <h1 className="display-type mt-4 text-5xl sm:text-6xl">Player Discipline</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">ออกคำเตือน พักแข่ง แบนเทรด แบนบัญชี หรือ Blacklist ผู้เล่น พร้อมช่วงเวลา หลักฐาน ประวัติผู้ดำเนินการ และการบังคับใช้กับเว็บและ Discord Bot</p>
      </div>

      {(params.saved || params.error) && <p role="status" className={`mt-7 rounded-xl border px-4 py-3 text-sm ${params.saved ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-red-400/20 bg-red-400/10 text-red-200'}`}>{params.saved === 'issued' ? 'บันทึกบทลงโทษแล้ว' : params.saved === 'revoked' ? 'ยกเลิกบทลงโทษแล้ว' : 'บันทึกไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่'}</p>}

      <section className="mt-9 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-red-400/10 text-red-300"><ShieldAlert className="h-5 w-5" /></span><div><h2 className="text-xl font-black">ออกบทลงโทษใหม่</h2><p className="mt-1 text-sm text-[var(--ink-faint)]">เลือก “แสดงต่อสาธารณะ” เฉพาะเมื่อข้อความ Public note พร้อมเผยแพร่ในหน้า Blacklist</p></div></div>
        <form action={issueDisciplinaryAction} className="mt-7 grid gap-5 md:grid-cols-2">
          <Field label="Player"><select name="player_id" required className="admin-input"><option value="">เลือกผู้เล่น</option>{players.map((player) => <option key={String(player.id)} value={String(player.id)}>{String(player.name)} · @{String(player.roblox_username ?? 'unknown')}{player.is_active ? '' : ' · inactive'}</option>)}</select></Field>
          <Field label="Action type"><select name="action_type" required className="admin-input" defaultValue="warning">{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Starts at"><input type="datetime-local" name="starts_at" className="admin-input" /></Field>
          <Field label="Ends at (leave blank for indefinite)"><input type="datetime-local" name="ends_at" className="admin-input" /></Field>
          <Field label="Internal reason" wide><textarea name="reason" required minLength={3} maxLength={2000} rows={4} className="admin-input py-3" placeholder="เหตุผลฉบับเต็มสำหรับทีมงาน" /></Field>
          <Field label="Public note" wide><textarea name="public_note" maxLength={1000} rows={3} className="admin-input py-3" placeholder="ข้อความที่อนุญาตให้แสดงในหน้า Blacklist" /></Field>
          <Field label="Evidence URL"><input type="url" name="evidence_url" maxLength={500} className="admin-input" placeholder="https://..." /></Field>
          <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-[var(--line)] bg-[var(--page)] px-4 text-sm font-bold text-[var(--ink-soft)]"><input type="checkbox" name="is_public" /> แสดงต่อสาธารณะ</label>
          <div className="md:col-span-2"><SubmitButton>Issue disciplinary action</SubmitButton></div>
        </form>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-black"><Ban className="h-5 w-5 text-red-300" /> Active actions</h2><span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-black text-red-200">{active.length}</span></div>
        <div className="grid gap-4 xl:grid-cols-2">{active.length ? active.map((action) => {
          const player = playerById.get(action.playerId);
          return <article key={action.id} className="rounded-[1.4rem] border border-red-400/20 bg-[var(--surface)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-red-300">{actionLabels[action.actionType]}</p><h3 className="mt-2 text-xl font-black">{String(player?.name ?? 'Unknown player')}</h3><p className="mt-1 text-xs text-[var(--ink-faint)]">Issued by {action.issuedBy ? userById.get(action.issuedBy) ?? 'Unknown staff' : 'System'} · {action.source}</p></div><span className="rounded-full bg-red-400/10 px-3 py-1 text-[0.6rem] font-black uppercase text-red-200">Active</span></div><p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">{action.reason}</p>{action.endsAt && <p className="mt-3 flex items-center gap-2 text-xs text-[var(--ink-faint)]"><Clock3 className="h-3.5 w-3.5" /> Ends {formatDate(action.endsAt)}</p>}<form action={revokeAction} className="mt-5 flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row"><input type="hidden" name="action_id" value={action.id} /><input name="revocation_reason" required minLength={3} maxLength={1000} className="admin-input min-w-0 flex-1" placeholder="เหตุผลที่ยกเลิกบทลงโทษ" /><ConfirmSubmitButton message={`Revoke ${actionLabels[action.actionType]} for ${String(player?.name ?? 'this player')}?`}>Revoke</ConfirmSubmitButton></form></article>;
        }) : <p className="rounded-[1.4rem] border border-dashed border-[var(--line-strong)] p-10 text-center text-sm text-[var(--ink-faint)] xl:col-span-2">ไม่มีบทลงโทษที่กำลังมีผล</p>}</div>
      </section>

      <section className="mt-10"><h2 className="mb-4 text-xl font-black">History</h2><div className="overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)]">{history.length ? history.map((action) => <div key={action.id} className="grid gap-2 border-b border-[var(--line)] p-4 last:border-0 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-black">{String(playerById.get(action.playerId)?.name ?? 'Unknown player')} · {actionLabels[action.actionType]}</p><p className="mt-1 text-xs text-[var(--ink-faint)]">{action.revokedAt ? `Revoked ${formatDate(action.revokedAt)}` : `Expired ${action.endsAt ? formatDate(action.endsAt) : ''}`} · {action.revocationReason || action.reason}</p></div><span className="text-xs font-black uppercase text-[var(--ink-faint)]">Closed</span></div>) : <p className="p-6 text-sm text-[var(--ink-faint)]">ยังไม่มีประวัติที่สิ้นสุดแล้ว</p>}</div></section>
    </main>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span>{children}</label>; }
function formatDate(value: string) { return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)); }
