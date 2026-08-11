'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, Bot, CheckCircle2, FileImage, Save, Trophy, Upload, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { calculateMatchMvp, validateBasketballStatRows, type EditableStatRow, type MatchMvpRecommendation, type StatEntryPlayer, type StatEntryTarget, type StatImportSummary } from '@/lib/stat-import';

type Props = {
  targets: StatEntryTarget[];
  players: StatEntryPlayer[];
  imports: StatImportSummary[];
};

type NumericField = keyof Pick<EditableStatRow,
  'pts' | 'fgm' | 'fga' | 'fgPct' | 'threePm' | 'threePa' | 'threePct' |
  'ftm' | 'fta' | 'ftPct' | 'ast' | 'stl' | 'bk' | 'orb' | 'drb' | 'reb' |
  'tov' | 'fls' | 'plusMinus' | 'ping'>;

const headers: Array<{ key: NumericField; label: string; readOnly?: boolean }> = [
  { key: 'pts', label: 'Pts' }, { key: 'fgm', label: 'Fgm' }, { key: 'fga', label: 'Fga' }, { key: 'fgPct', label: 'Fg%' },
  { key: 'threePm', label: '3pm' }, { key: 'threePa', label: '3pa' }, { key: 'threePct', label: '3p%' },
  { key: 'ftm', label: 'Ftm' }, { key: 'fta', label: 'Fta' }, { key: 'ftPct', label: 'Ft%' },
  { key: 'ast', label: 'Ast' }, { key: 'stl', label: 'Stl' }, { key: 'bk', label: 'Bk' },
  { key: 'orb', label: 'Orb' }, { key: 'drb', label: 'Drb' }, { key: 'reb', label: 'Reb' },
  { key: 'tov', label: 'Tov' }, { key: 'fls', label: 'Fls' }, { key: 'plusMinus', label: '+/-' }, { key: 'ping', label: 'Ping' },
];

export function StatImportWorkbench({ targets, players, imports }: Props) {
  const router = useRouter();
  const firstDraft = imports.find((item) => item.status === 'review_required');
  const firstDraftTargetId = firstDraft?.tournamentMatchId ?? firstDraft?.gameId ?? '';
  const [targetId, setTargetId] = useState(firstDraftTargetId || targets[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [activeId, setActiveId] = useState(firstDraft?.id ?? '');
  const [rows, setRows] = useState<EditableStatRow[]>(firstDraft?.rows ?? []);
  const [warnings, setWarnings] = useState<string[]>(firstDraft?.warnings ?? []);
  const [busy, setBusy] = useState<'upload' | 'save' | ''>('');
  const [message, setMessage] = useState('');
  const activeTarget = targets.find((target) => target.id === targetId);
  const eligiblePlayers = useMemo(() => players.filter((player) => (
    player.teamId === activeTarget?.homeTeamId || player.teamId === activeTarget?.awayTeamId
  )), [activeTarget, players]);
  const generatedScore = useMemo(() => ({
    home: rows.filter((row) => row.teamId === activeTarget?.homeTeamId).reduce((total, row) => total + row.pts, 0),
    away: rows.filter((row) => row.teamId === activeTarget?.awayTeamId).reduce((total, row) => total + row.pts, 0),
  }), [activeTarget, rows]);
  const mvpRecommendation = useMemo(() => calculateMatchMvp(rows).mvp, [rows]);
  const validationIssues = useMemo(() => {
    const issues = rows.length ? validateBasketballStatRows(rows) : [];
    if (activeTarget?.type === 'tournament' && rows.length) {
      if (!rows.some((row) => row.teamId === activeTarget.homeTeamId)) issues.push('ทีม Home ต้องมีผู้เล่นอย่างน้อย 1 แถว');
      if (!rows.some((row) => row.teamId === activeTarget.awayTeamId)) issues.push('ทีม Away ต้องมีผู้เล่นอย่างน้อย 1 แถว');
      if (generatedScore.home === generatedScore.away) issues.push('คะแนน Tournament รอบ Final ห้ามเสมอกัน');
    }
    return issues;
  }, [activeTarget, generatedScore, rows]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : '');
    setMessage('');
  }

  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !activeTarget) {
      setMessage('กรุณาเลือกเกมและไฟล์ภาพ');
      return;
    }
    setBusy('upload');
    setMessage('');
    const body = new FormData();
    body.set('targetType', activeTarget.type);
    body.set('targetId', activeTarget.id);
    body.set('image', file);
    try {
      const response = await fetch('/api/admin/stats/extract', { method: 'POST', body });
      const payload = await response.json() as { error?: string; importId?: string; rows?: EditableStatRow[]; warnings?: string[] };
      if (!response.ok || !payload.importId || !payload.rows) throw new Error(payload.error || 'วิเคราะห์ภาพไม่สำเร็จ');
      setActiveId(payload.importId);
      setRows(payload.rows);
      setWarnings(payload.warnings ?? []);
      setMessage('Gemini อ่านภาพแล้ว กรุณาตรวจและแก้ทุกแถวก่อนบันทึก');
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'วิเคราะห์ภาพไม่สำเร็จ');
    } finally {
      setBusy('');
    }
  }

  function openDraft(item: StatImportSummary) {
    setActiveId(item.id);
    setTargetId(item.tournamentMatchId ?? item.gameId ?? '');
    setRows(item.rows);
    setWarnings(item.warnings);
    setFile(null);
    setPreviewUrl('');
    setMessage(`เปิดแบบร่าง ${item.originalFilename}`);
  }

  function changeTarget(nextTargetId: string) {
    setTargetId(nextTargetId);
    setRows([]);
    setWarnings([]);
    setActiveId('');
    setMessage('');
  }

  function updatePlayer(rowIndex: number, playerId: string) {
    const player = players.find((item) => item.id === playerId);
    setRows((current) => current.map((row, index) => index === rowIndex ? {
      ...row,
      playerId,
      teamId: player?.teamId ?? '',
      player: player?.name.replace(/\s+\(@.*\)$/, '') ?? row.player,
    } : row));
  }

  function updateNumber(rowIndex: number, field: NumericField, value: string) {
    const number = Number(value);
    setRows((current) => current.map((row, index) => index === rowIndex ? { ...row, [field]: Number.isFinite(number) ? number : 0 } : row));
  }

  async function confirmRows() {
    if (!activeId || !rows.length) return;
    if (validationIssues.length) {
      setMessage(validationIssues[0]);
      return;
    }
    setBusy('save');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/stats/imports/${activeId}/confirm`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const payload = await response.json() as { error?: string; savedRows?: number; mvp?: MatchMvpRecommendation };
      if (!response.ok) throw new Error(payload.error || 'บันทึกสถิติไม่สำเร็จ');
      const mvpMessage = payload.mvp ? ` · MVP แนะนำ: ${payload.mvp.player} (${payload.mvp.score})` : '';
      setMessage(activeTarget?.type === 'tournament'
        ? `บันทึกผล Tournament ${generatedScore.away}–${generatedScore.home} และประกาศผู้ชนะแล้ว${mvpMessage}`
        : `บันทึกสถิติ ${payload.savedRows ?? rows.length} แถวแล้ว หน้า Stats จะใช้ข้อมูลล่าสุดทันที${mvpMessage}`);
      setRows([]);
      setWarnings([]);
      setActiveId('');
      setFile(null);
      setPreviewUrl('');
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'บันทึกสถิติไม่สำเร็จ');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <form onSubmit={extract} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><Upload className="h-5 w-5" /></span><div><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">Step 1</p><h2 className="mt-1 text-xl font-black">อัปโหลดภาพต้นฉบับ</h2></div></div>
          <label className="mt-6 block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">เกมหรือแมตช์ Tournament
            <select value={targetId} onChange={(event) => changeTarget(event.target.value)} className="admin-input mt-2" required>
              <option value="">เลือกการแข่งขัน</option>
              {targets.some((target) => target.type === 'tournament') && <optgroup label="Tournament matches">{targets.filter((target) => target.type === 'tournament').map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</optgroup>}
              {targets.some((target) => target.type === 'league') && <optgroup label="League games (Final)">{targets.filter((target) => target.type === 'league').map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</optgroup>}
            </select>
          </label>
          <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--page)] p-5 text-center transition hover:border-[var(--orange)]">
            <FileImage className="mx-auto h-7 w-7 text-[var(--orange-soft)]" /><span className="mt-3 block text-sm font-black">{file?.name ?? 'เลือก screenshot สถิติ'}</span><span className="mt-1 block text-xs text-[var(--ink-faint)]">JPEG, PNG, WebP หรือ GIF · สูงสุด 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseFile} className="sr-only" />
          </label>
          <button type="submit" disabled={!file || !activeTarget || Boolean(busy)} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--orange)] text-xs font-black uppercase tracking-[0.1em] text-black disabled:opacity-50"><Bot className="h-4 w-4" />{busy === 'upload' ? 'Gemini กำลังอ่านภาพ...' : 'วิเคราะห์ภาพด้วย Gemini'}</button>
          <p className="mt-4 text-xs leading-5 text-[var(--ink-faint)]">ภาพจะถูกเก็บใน Supabase Storage แบบ private และผูกกับการแข่งขันที่เลือกเพื่อใช้ตรวจสอบย้อนหลัง</p>
        </form>

        <section className="min-h-72 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-4">
          {previewUrl ? (
            <div className="relative h-full min-h-72 overflow-hidden rounded-xl bg-black">
              {/* Blob previews are local-only and cannot use the Next image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="ภาพสถิติต้นฉบับที่เลือก" className="h-full w-full object-contain" />
            </div>
          ) : <div className="grid min-h-72 place-items-center rounded-xl bg-[var(--page)] text-center"><div><FileImage className="mx-auto h-9 w-9 text-[var(--ink-faint)]" /><p className="mt-3 text-sm font-black">ตัวอย่างภาพจะปรากฏที่นี่</p><p className="mt-1 text-xs text-[var(--ink-faint)]">AI ช่วยถอดข้อมูล แต่ staff เป็นผู้ตัดสินใจบันทึกเสมอ</p></div></div>}
        </section>
      </div>

      {message && <p role="status" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-soft)]">{message}</p>}

      {rows.length > 0 && (
        <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">Step 2 · Mandatory review</p><h2 className="mt-2 text-xl font-black">ตรวจและแก้ก่อนบันทึก</h2><p className="mt-2 text-xs text-[var(--ink-faint)]">Fg%, 3p% และ Ft% เก็บไว้ในหลักฐานการตรวจ ส่วนฐานข้อมูลคำนวณเปอร์เซ็นต์จริงจาก made/attempted เพื่อไม่ให้ข้อมูลคลาดเคลื่อน</p></div><a href={`/api/admin/stats/imports/${activeId}/source`} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-[0.1em] text-[var(--orange-soft)]">เปิดภาพต้นฉบับ ↗</a></div>
          {activeTarget?.type === 'tournament' && <div className="m-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-[var(--orange)]/30 bg-[var(--orange)]/10 p-5 text-center"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">Away</p><p className="race-display mt-2 text-4xl">{generatedScore.away}</p></div><div className="text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Generated score</div><div><p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">Home</p><p className="race-display mt-2 text-4xl">{generatedScore.home}</p></div></div>}
          {mvpRecommendation && <div className="mx-5 mb-5 flex flex-col gap-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-300 text-amber-950"><Trophy className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-amber-200">Gemini Match MVP recommendation</p><div className="mt-1 flex flex-wrap items-baseline gap-x-3"><h3 className="text-xl font-black">{mvpRecommendation.player}</h3><span className="number-tabular text-sm font-black text-amber-200">Impact {mvpRecommendation.score}</span></div><p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">{mvpRecommendation.reason}</p><p className="mt-1 text-[0.62rem] text-[var(--ink-faint)]">คำนวณจากแต้ม รีบาวด์ แอสซิสต์ เกมรับ ประสิทธิภาพ +/- และผลชนะ · Staff เป็นผู้ตัดสินสุดท้าย</p></div></div>}
          {warnings.length > 0 && <div className="m-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100"><p className="flex items-center gap-2 font-black"><AlertTriangle className="h-4 w-4" /> จุดที่ควรตรวจซ้ำ</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
          <div className="overflow-x-auto">
            <table className="min-w-[154rem] border-collapse text-xs">
              <thead><tr className="border-y border-[var(--line)] bg-[var(--page)] text-[0.58rem] font-black uppercase tracking-[0.08em] text-[var(--ink-faint)]"><th className="sticky left-0 z-10 min-w-64 bg-[var(--page)] px-3 py-3 text-left">Player</th><th className="min-w-24 px-2 py-3 text-left">Team</th>{headers.map((header) => <th key={header.key} className="min-w-20 px-2 py-3 text-center">{header.label}</th>)}</tr></thead>
              <tbody>{rows.map((row, rowIndex) => <tr key={`${activeId}-${rowIndex}`} className="border-b border-[var(--line)] last:border-0"><td className="sticky left-0 z-10 bg-[var(--surface)] p-2"><select value={row.playerId} onChange={(event) => updatePlayer(rowIndex, event.target.value)} className="admin-input !min-h-9 !rounded-lg !text-xs" aria-label={`ผู้เล่นแถว ${rowIndex + 1}`}><option value="">{row.player} · ยังไม่จับคู่</option>{eligiblePlayers.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></td><td className="px-2 py-2 font-black text-[var(--ink-soft)]">{row.teamId === activeTarget?.homeTeamId ? 'HOME' : row.teamId === activeTarget?.awayTeamId ? 'AWAY' : '—'}</td>{headers.map((header) => <td key={header.key} className="p-2"><input type="number" step={header.key.endsWith('Pct') ? '0.1' : '1'} value={row[header.key]} onChange={(event) => updateNumber(rowIndex, header.key, event.target.value)} className="admin-input !min-h-9 !rounded-lg !px-2 text-center !text-xs number-tabular" aria-label={`${header.label} ของ ${row.player}`} /></td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-col gap-4 border-t border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs"><p className={`flex items-center gap-2 font-black ${validationIssues.length ? 'text-red-200' : 'text-emerald-200'}`}>{validationIssues.length ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{validationIssues.length ? `${validationIssues.length} จุดต้องแก้ก่อนบันทึก` : `${rows.length} แถวพร้อมบันทึก`}</p>{validationIssues[0] && <p className="mt-1 text-[var(--ink-faint)]">{validationIssues[0]}</p>}</div><button type="button" onClick={() => void confirmRows()} disabled={Boolean(busy) || validationIssues.length > 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-xs font-black uppercase tracking-[0.1em] text-emerald-950 disabled:opacity-40"><Save className="h-4 w-4" />{busy === 'save' ? 'กำลังบันทึก...' : activeTarget?.type === 'tournament' ? 'ยืนยันสกอร์ Tournament' : 'ยืนยันและบันทึก DB'}</button></div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Audit trail</p><h2 className="mt-3 text-2xl font-black">รายการนำเข้าล่าสุด</h2></div><span className="text-xs text-[var(--ink-faint)]">เก็บภาพอ้างอิงทุกครั้ง</span></div>
        <div className="overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)]">
          {imports.length === 0 ? <p className="p-7 text-sm text-[var(--ink-faint)]">ยังไม่มีรายการนำเข้าสถิติ</p> : imports.map((item) => { const importTargetId = item.tournamentMatchId ?? item.gameId; return <div key={item.id} className="flex flex-col gap-3 border-b border-[var(--line)] p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-black">{item.originalFilename}</p><p className="mt-1 text-xs text-[var(--ink-faint)]">{targets.find((target) => target.id === importTargetId)?.label ?? importTargetId} · {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</p>{item.errorMessage && <p className="mt-1 text-xs text-red-300">{item.errorMessage}</p>}</div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-[0.58rem] font-black uppercase ${statusClass(item.status)}`}>{item.status.replace('_', ' ')}</span><a href={`/api/admin/stats/imports/${item.id}/source`} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[0.62rem] font-black uppercase">ภาพ</a>{item.status === 'review_required' && <button type="button" onClick={() => openDraft(item)} className="rounded-lg bg-[var(--orange)] px-3 py-1.5 text-[0.62rem] font-black uppercase text-black">ตรวจต่อ</button>}</div></div>; })}
        </div>
      </section>
    </div>
  );
}

function statusClass(status: StatImportSummary['status']) {
  if (status === 'confirmed') return 'bg-emerald-400/10 text-emerald-200';
  if (status === 'failed') return 'bg-red-400/10 text-red-200';
  if (status === 'review_required') return 'bg-amber-400/10 text-amber-200';
  return 'bg-blue-400/10 text-blue-200';
}
