import type { Metadata } from 'next';
import { CalendarDays } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { GamesExplorer } from './GamesExplorer';

export const metadata: Metadata = {
  title: 'Games',
  description: 'Browse the current PBL schedule, live matchups and final scores by team and week.',
};

export default async function GamesPage() {
  const data = await getSiteData();
  const validGames = data.games.filter(
    (game) =>
      data.teams.some((team) => team.id === game.homeTeamId) &&
      data.teams.some((team) => team.id === game.awayTeamId),
  );

  return (
    <>
      <PageIntro
        eyebrow="Match center"
        title="Every tip-off. Every final."
        description="Follow the current schedule, check completed results and open any matchup for its official game details. All times are shown in ICT."
      />
      <div className="site-shell py-12 sm:py-16">
        {validGames.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Schedule coming soon"
            description="Games will appear here as soon as league staff publish the season schedule."
          />
        ) : (
          <GamesExplorer
            games={validGames}
            teams={data.teams}
          />
        )}
      </div>
    </>
  );
}
