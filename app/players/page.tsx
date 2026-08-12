import type { Metadata } from 'next';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { getSiteData } from '@/lib/league-data';
import { getStatsExplorerData } from '@/lib/stats-data';
import { PlayerDirectory } from './PlayerDirectory';

export const metadata: Metadata = {
  title: 'Players',
  description: 'Search the PBL player directory and explore current season statistics.',
};

export default async function PlayersPage() {
  const data = await getSiteData();
  const statsData = await getStatsExplorerData(data);

  return (
    <>
      <PageIntro
        eyebrow="Player directory"
        title="Find your favorite player."
        description="Every Roblox login creates a Player profile. New players remain Free Agents until Staff assigns them to a team."
      />
      <PlayerDirectory players={data.players} teams={data.teams} statsData={statsData} accolades={data.accolades} />
    </>
  );
}
