import type { StatsCompetition } from '@/lib/stats-data';

export function CompetitionStatsSelect({ competitions, value, onChange }: { competitions: StatsCompetition[]; value: string; onChange: (value: string) => void }) {
  const seasons = competitions.filter((item) => item.kind === 'season');
  const tournaments = competitions.filter((item) => item.kind === 'tournament');

  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">Stats competition</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--ink)]">
        <option value="all">All competitions</option>
        {seasons.length > 0 && <optgroup label="League seasons"><option value="season">All league seasons</option>{seasons.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isCurrent ? ' · current' : ''}</option>)}</optgroup>}
        {tournaments.length > 0 && <optgroup label="Tournaments"><option value="tournament">All tournaments</option>{tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isCurrent ? ' · current' : ''}</option>)}</optgroup>}
      </select>
    </label>
  );
}
