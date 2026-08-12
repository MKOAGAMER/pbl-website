import type { Metadata } from 'next';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { getSiteData, isTournamentOnlyMode } from '@/lib/league-data';
import { getStatsExplorerData } from '@/lib/stats-data';
import { TeamDirectory } from './TeamDirectory';

export const metadata: Metadata = {
  title: 'Teams',
  description: 'Explore every PBL team, record, roster and conference.',
};

export default async function TeamsPage() {
  const data = await getSiteData();
  const statsData = await getStatsExplorerData(data);
  const tournamentOnly = isTournamentOnlyMode(data);

  return (
    <>
      <PageIntro
        eyebrow={tournamentOnly ? 'Tournament clubs' : 'League clubs'}
        title={tournamentOnly ? 'Every team. One tournament.' : 'Every team. One league.'}
        description={tournamentOnly ? `Meet the ${data.teams.length} clubs registered for PBAL competitions. Open a team page for its roster and tournament history.` : `Meet the ${data.teams.length} clubs competing in ${data.season.name}. Filter by conference, compare records and open a team page for its full roster and schedule.`}
      />
      <TeamDirectory teams={data.teams} players={data.players} statsData={statsData} accolades={data.accolades} />
    </>
  );
}
