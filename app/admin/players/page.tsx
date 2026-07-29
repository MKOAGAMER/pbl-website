import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { PlayerProfileManager } from './PlayerProfileManager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Player Profile Manager', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminPlayersPage({ searchParams }: Props) {
  const [, params] = await Promise.all([requireAdminPermission('staff'), searchParams]);
  return <main className="site-shell py-10 sm:py-14"><Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Staff Control</Link><div className="mt-7 border-b border-[var(--line)] pb-8"><p className="eyebrow">Player administration</p><h1 className="display-type mt-4 text-5xl sm:text-6xl">Player Profile Manager</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">ค้นหาผู้เล่นก่อนแก้ About, รูปโปรไฟล์, สถานะเผยแพร่ และตำแหน่งการเล่นสูงสุด 3 ตำแหน่ง</p></div>{params.saved && <p role="status" className="mt-7 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">บันทึก Player Profile แล้ว กรุณาค้นหาอีกครั้งหากต้องการแก้ต่อ</p>}{params.error && <p role="alert" className="mt-7 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">บันทึกไม่สำเร็จ ตรวจสอบว่าตำแหน่งถูกเลือก 1–3 ตำแหน่งและข้อมูลรูปถูกต้อง</p>}<div className="mt-10"><PlayerProfileManager /></div></main>;
}
