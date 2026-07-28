import type { Metadata } from 'next';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { getSiteData } from '@/lib/league-data';
import { StatsExplorer } from './StatsExplorer';

export const metadata: Metadata = {
  title: 'Player Stats',
  description: 'Explore PBL scoring, rebounding, playmaking, defense and shooting leaderboards.',
};

export default async function StatsPage() {
  const data = await getSiteData();

  return (
    <>
      <PageIntro
        eyebrow="League leaders"
        title="Numbers that tell the story."
        description={`Explore ${data.season.name} averages across scoring, rebounding, playmaking, defense and shooting. Adjust the eligibility filters to build your own leaderboard.`}
      />
      <StatsExplorer seasonName={data.season.name} players={data.players} teams={data.teams} />
    </>
  );
}
