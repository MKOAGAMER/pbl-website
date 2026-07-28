import type { Metadata } from 'next';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { getSiteData } from '@/lib/league-data';
import { PlayerDirectory } from './PlayerDirectory';

export const metadata: Metadata = {
  title: 'Players',
  description: 'Search the PBL player directory and explore current season statistics.',
};

export default async function PlayersPage() {
  const data = await getSiteData();

  return (
    <>
      <PageIntro
        eyebrow="Player directory"
        title="Find your favorite player."
        description={`Search every profile registered for ${data.season.name}, filter by team or position and compare the numbers shaping the season.`}
      />
      <PlayerDirectory players={data.players} teams={data.teams} />
    </>
  );
}
