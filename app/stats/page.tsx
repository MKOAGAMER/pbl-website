import type { Metadata } from 'next';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { getSiteData } from '@/lib/league-data';
import { getStatsExplorerData } from '@/lib/stats-data';
import { StatsExplorer } from './StatsExplorer';

export const metadata: Metadata = {
  title: 'Player Stats',
  description: 'Explore PBL scoring, rebounding, playmaking, defense and shooting leaderboards.',
};

export default async function StatsPage() {
  const data = await getSiteData();
  const statsData = await getStatsExplorerData(data);

  return (
    <>
      <PageIntro
        eyebrow="League leaders"
        title="Numbers that tell the story."
        description="Explore player and team averages across regular seasons and tournaments. Select one or more competitions to build the leaderboard you need."
      />
      <StatsExplorer statsData={statsData} players={data.players} teams={data.teams} />
    </>
  );
}
