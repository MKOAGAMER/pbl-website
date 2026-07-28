import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck2, TableProperties, Trophy, Users } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import type { Conference, Team } from '@/lib/league-types';
import { rankTeamsByStanding, winPercentage } from '@/lib/utils';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { StatCard } from '@/app/components/ui/StatCard';
import { TeamLogo } from '@/app/components/ui/TeamLogo';

export const metadata: Metadata = {
  title: 'Standings',
  description: 'Current PBL Eastern and Western Conference standings, records, win percentages and games behind.',
};

export default async function StandingsPage() {
  const data = await getSiteData();
  const east = rankTeamsByStanding(data.teams.filter((team) => team.conference === 'East'));
  const west = rankTeamsByStanding(data.teams.filter((team) => team.conference === 'West'));
  const overall = rankTeamsByStanding(data.teams);
  const leader = overall[0];
  const completedGames = data.games.filter(
    (game) => game.seasonId === data.season.id && game.status === 'final',
  ).length;

  return (
    <>
      <PageIntro
        eyebrow={`${data.season.name} table`}
        title="Two conferences. One title race."
        description="Track every club across the East and West. Teams are ordered by win percentage, then total wins, fewer losses and team name."
      />

      <div className="site-shell py-12 sm:py-16">
        {data.teams.length === 0 ? (
          <EmptyState
            icon={TableProperties}
            title="No standings available"
            description="Conference tables will appear once teams are added to the active season."
          />
        ) : (
          <>
            <div className="mb-10 grid gap-3 sm:grid-cols-3">
              <StatCard
                value={leader?.abbreviation ?? '-'}
                label="League leader"
                detail={leader ? `${leader.wins}-${leader.losses} overall` : 'Awaiting results'}
                icon={Trophy}
              />
              <StatCard
                value={data.teams.length}
                label="Active teams"
                detail={`${east.length} East - ${west.length} West`}
                icon={Users}
                accent="blue"
              />
              <StatCard
                value={completedGames}
                label="Published finals"
                detail={data.season.name}
                icon={CalendarCheck2}
                accent="mint"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <StandingsTable conference="East" teams={east} />
              <StandingsTable conference="West" teams={west} />
            </div>

            <div className="mt-8 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.13em] text-[var(--orange-soft)]">Reading the table</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">
                  PCT is wins divided by games played. GB shows how far a team sits behind its conference leader; a dash marks the leader.
                </p>
              </div>
              <Link
                href="/rankings"
                className="mt-4 inline-flex shrink-0 rounded-full border border-[var(--line-strong)] px-5 py-2.5 text-xs font-black uppercase tracking-[0.11em] transition hover:border-[var(--orange)] hover:text-[var(--orange-soft)] sm:mt-0"
              >
                Power rankings
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function StandingsTable({ conference, teams }: { conference: Conference; teams: Team[] }) {
  const leader = teams[0];

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface-raised)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${conference === 'East' ? 'bg-blue-400' : 'bg-[var(--orange)]'}`} />
          <div>
            <p className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-[var(--ink-faint)]">Conference</p>
            <h2 className="display-type mt-0.5 text-2xl">{conference}</h2>
          </div>
        </div>
        <span className="text-xs font-bold text-[var(--ink-faint)]">{teams.length} teams</span>
      </div>

      {teams.length === 0 ? (
        <div className="p-5">
          <EmptyState icon={Users} title={`No ${conference} teams`} description={`Teams assigned to the ${conference} will appear here.`} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">
                <th scope="col" className="w-14 px-4 py-3 text-center">#</th>
                <th scope="col" className="px-3 py-3">Club</th>
                <th scope="col" className="px-3 py-3 text-center">GP</th>
                <th scope="col" className="px-3 py-3 text-center">W</th>
                <th scope="col" className="px-3 py-3 text-center">L</th>
                <th scope="col" className="px-3 py-3 text-center">PCT</th>
                <th scope="col" className="px-4 py-3 text-center">GB</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr key={team.id} className="group border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-raised)]">
                  <td className="number-tabular px-4 py-4 text-center text-sm font-black text-[var(--ink-faint)]">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <th scope="row" className="px-3 py-3 font-normal">
                    <Link href={`/teams/${team.slug}`} className="flex items-center gap-3">
                      <TeamLogo team={team} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black group-hover:text-[var(--orange-soft)]">{team.name}</span>
                        <span className="mt-0.5 block text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">{team.city}</span>
                      </span>
                    </Link>
                  </th>
                  <Metric value={team.wins + team.losses} />
                  <Metric value={team.wins} strong />
                  <Metric value={team.losses} />
                  <Metric value={formatPct(team)} strong />
                  <Metric value={gamesBehind(leader, team)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({ value, strong = false }: { value: string | number; strong?: boolean }) {
  return (
    <td className={`number-tabular px-3 py-4 text-center text-sm ${strong ? 'font-black text-[var(--ink)]' : 'font-bold text-[var(--ink-soft)]'}`}>
      {value}
    </td>
  );
}

function formatPct(team: Team) {
  return winPercentage(team.wins, team.losses).toFixed(3).replace(/^0/, '');
}

function gamesBehind(leader: Team | undefined, team: Team) {
  if (!leader || leader.id === team.id) return '-';
  const behind = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
  return behind === 0 ? '-' : Number.isInteger(behind) ? String(behind) : behind.toFixed(1);
}
