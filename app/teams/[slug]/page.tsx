import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarX2,
  MapPin,
  Percent,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { GameCard } from '@/app/components/ui/GameCard';
import { SectionHeading } from '@/app/components/ui/SectionHeading';
import { StatCard } from '@/app/components/ui/StatCard';
import { TeamLogo } from '@/app/components/ui/TeamLogo';
import { PlayerAvatar } from '@/app/components/ui/PlayerAvatar';
import { MedalBadges } from '@/app/components/ui/MedalBadges';
import { getSiteData, getTeamBySlug } from '@/lib/league-data';
import { winPercentage } from '@/lib/utils';
import { getTeamSeasonHistory } from '@/lib/league-history';
import { TeamSeasonHistoryTable } from '@/app/components/ui/SeasonHistory';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);

  if (!team) return { title: 'Team not found' };

  return {
    title: team.name,
    description: `${team.description} View the ${team.name} roster, record and upcoming PBL games.`,
    openGraph: {
      title: team.name,
      description: `${team.wins}-${team.losses} in the ${team.conference} Conference.`,
      type: 'website',
    },
  };
}

export default async function TeamDetailPage({ params }: Props) {
  const { slug } = await params;
  const [team, data] = await Promise.all([getTeamBySlug(slug), getSiteData()]);

  if (!team) notFound();

  const seasonHistory = await getTeamSeasonHistory(team, data.season);

  const roster = data.players
    .filter((player) => player.teamId === team.id)
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber || a.displayName.localeCompare(b.displayName));
  const teamAccolades = data.accolades.filter((item) => item.teamId === team.id);
  const conferenceTable = data.teams
    .filter((item) => item.conference === team.conference)
    .sort((a, b) => winPercentage(b.wins, b.losses) - winPercentage(a.wins, a.losses) || b.wins - a.wins);
  const conferenceRank = conferenceTable.findIndex((item) => item.id === team.id) + 1;
  const validTeamGames = data.games.filter(
    (game) =>
      (game.homeTeamId === team.id || game.awayTeamId === team.id)
      && data.teams.some((item) => item.id === game.homeTeamId)
      && data.teams.some((item) => item.id === game.awayTeamId),
  );
  const upcomingGames = validTeamGames
    .filter((game) => game.status === 'scheduled' || game.status === 'live')
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const completedGames = validTeamGames
    .filter((game) => game.status === 'final')
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const featuredGames = [...upcomingGames, ...completedGames].slice(0, 4);
  const totalGames = team.wins + team.losses;
  const winPct = winPercentage(team.wins, team.losses);

  return (
    <>
      <header className="relative isolate overflow-hidden border-b border-[var(--line)] py-12 sm:py-16">
        <div className="absolute inset-0 subtle-grid opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div
          className="absolute -right-28 -top-36 -z-10 h-[30rem] w-[30rem] rounded-full opacity-20 blur-[90px]"
          style={{ backgroundColor: team.primaryColor }}
        />
        <div className="site-shell relative">
          <Link
            href="/teams"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-soft)] transition hover:text-[var(--orange-soft)]"
          >
            <ArrowLeft className="h-4 w-4" /> All teams
          </Link>

          <div className="mt-9 grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="relative w-fit">
              <TeamLogo team={team} size="xl" className="!h-28 !w-28 sm:!h-36 sm:!w-36 sm:!rounded-[2.2rem] sm:!text-2xl" />
              <MedalBadges accolades={teamAccolades} size="lg" className="absolute -bottom-4 left-1" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">
                <span>{team.conference} Conference</span>
                <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {team.city}</span>
              </div>
              <h1 className="display-type mt-4 max-w-4xl text-balance text-5xl sm:text-6xl lg:text-7xl">{team.name}</h1>
              <p className="mt-5 max-w-2xl text-pretty text-sm leading-7 text-[var(--ink-soft)] sm:text-base">{team.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:min-w-52">
              <HeroMetric label="Record" value={`${team.wins}-${team.losses}`} />
              <HeroMetric label={`${team.conference} rank`} value={conferenceRank > 0 ? `#${conferenceRank}` : '-'} />
            </div>
          </div>
        </div>
      </header>

      <div className="site-shell py-12 sm:py-16">
        <section aria-labelledby="team-overview-heading">
          <SectionHeading
            eyebrow={data.season.name}
            title="Season snapshot"
            description="Current regular-season record and active roster information."
          />
          <h2 id="team-overview-heading" className="sr-only">Team overview</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard value={team.wins} label="Wins" detail={`${totalGames} games played`} icon={Trophy} accent="orange" />
            <StatCard value={team.losses} label="Losses" detail={team.losses === 1 ? '1 recorded loss' : `${team.losses} recorded losses`} icon={Shield} accent="blue" />
            <StatCard value={`${(winPct * 100).toFixed(1)}%`} label="Win percentage" detail={`${team.conference} Conference`} icon={Percent} accent="mint" />
            <StatCard value={roster.length} label="Active roster" detail="Published players" icon={Users} accent="orange" />
          </div>
        </section>

        <section className="mt-14 sm:mt-16" aria-labelledby="team-roster-heading">
          <SectionHeading
            eyebrow="Team personnel"
            title="Active roster"
            description={`Players currently registered to ${team.shortName}. Select a player to view the full profile and season numbers.`}
            href="/players"
            linkLabel="All players"
          />
          <h2 id="team-roster-heading" className="sr-only">Active roster</h2>

          {roster.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Roster not published yet"
              description="Players will appear here after league staff assign them to this team."
            />
          ) : (
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
              <div className="hidden grid-cols-[3rem_minmax(0,1fr)_6rem_17rem_2rem] gap-4 border-b border-[var(--line)] px-5 py-3 text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)] md:grid">
                <span>No.</span><span>Player</span><span>Pos.</span><span>Season averages</span><span />
              </div>
              {roster.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.slug}`}
                  className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] px-4 py-4 transition last:border-0 hover:bg-[var(--surface-raised)] md:grid-cols-[3rem_minmax(0,1fr)_6rem_17rem_2rem] md:gap-4 md:px-5"
                >
                  <span className="number-tabular text-lg font-black text-[var(--ink-faint)]">#{player.jerseyNumber}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <PlayerAvatar src={player.avatarUrl} name={player.displayName} size="sm" className="!h-10 !w-10" primaryColor={team.primaryColor} secondaryColor={team.secondaryColor} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black transition group-hover:text-[var(--orange-soft)]">{player.displayName}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--ink-faint)]">@{player.robloxUsername}</span>
                    </span>
                  </span>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-center text-[0.65rem] font-black uppercase tracking-[0.1em] text-[var(--ink-soft)]">{player.positions.join(' / ')}</span>
                  <span className="hidden grid-cols-3 gap-3 md:grid">
                    <RosterMetric label="PPG" value={player.stats.pointsPerGame.toFixed(1)} />
                    <RosterMetric label="RPG" value={player.stats.reboundsPerGame.toFixed(1)} />
                    <RosterMetric label="APG" value={player.stats.assistsPerGame.toFixed(1)} />
                  </span>
                  <ArrowRight className="hidden h-4 w-4 text-[var(--ink-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--orange-soft)] md:block" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <TeamSeasonHistoryTable entries={seasonHistory} />

        <section className="mt-14 sm:mt-16">
          <SectionHeading
            eyebrow="Match center"
            title="Team schedule"
            description="Upcoming assignments appear first, followed by the latest completed games."
            href="/games"
            linkLabel="Full schedule"
          />
          {featuredGames.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="No team games yet"
              description="Scheduled and completed games for this team will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {featuredGames.map((game) => <GameCard key={game.id} game={game} teams={data.teams} />)}
            </div>
          )}
        </section>

        <div className="mt-12 flex justify-center">
          <Link
            href="/standings"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-5 text-xs font-black uppercase tracking-[0.12em] transition hover:border-[var(--orange)]"
          >
            View league standings <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--surface)]/80 p-4 backdrop-blur-sm">
      <span className="number-tabular block text-3xl font-black tracking-[-0.06em]">{value}</span>
      <span className="mt-1 block text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{label}</span>
    </div>
  );
}

function RosterMetric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="number-tabular block text-sm font-black">{value}</span>
      <span className="block text-[0.55rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span>
    </span>
  );
}
