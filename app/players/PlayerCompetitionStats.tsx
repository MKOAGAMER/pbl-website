'use client';

import { Activity, Crosshair, Gauge, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CompetitionStatsSelect } from '@/app/components/ui/CompetitionStatsSelect';
import { StatCard } from '@/app/components/ui/StatCard';
import { aggregatePlayerCompetitionStats, competitionIdsForSelection, competitionSelectionLabel } from '@/lib/competition-stats';
import type { StatsExplorerData } from '@/lib/stats-data';

export function PlayerCompetitionStats({ playerId, statsData }: { playerId: string; statsData: StatsExplorerData }) {
  const [selection, setSelection] = useState(statsData.initialCompetitionId);
  const ids = useMemo(() => competitionIdsForSelection(statsData.competitions, selection), [selection, statsData.competitions]);
  const entry = aggregatePlayerCompetitionStats(statsData.lines, ids).get(playerId);
  const stats = entry?.stats ?? { gamesPlayed: 0, pointsPerGame: 0, reboundsPerGame: 0, assistsPerGame: 0 };
  const label = competitionSelectionLabel(statsData.competitions, selection);
  return <section>
    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="eyebrow">Competition stats</p><h2 className="display-type mt-3 text-3xl sm:text-4xl">Tournament & league</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">{label} · {stats.gamesPlayed} games played</p></div>
      <div className="w-full sm:w-64"><CompetitionStatsSelect competitions={statsData.competitions} value={selection} onChange={setSelection} /></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard value={stats.pointsPerGame.toFixed(1)} label="Points per game" detail={label} icon={Target} accent="orange" />
      <StatCard value={stats.reboundsPerGame.toFixed(1)} label="Rebounds per game" detail={label} icon={Activity} accent="blue" />
      <StatCard value={stats.assistsPerGame.toFixed(1)} label="Assists per game" detail={label} icon={Crosshair} accent="mint" />
      <StatCard value={stats.gamesPlayed} label="Games played" detail={label} icon={Gauge} accent="orange" />
    </div>
  </section>;
}
