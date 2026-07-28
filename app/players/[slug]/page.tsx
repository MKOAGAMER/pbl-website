import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarX2,
  Crosshair,
  Gauge,
  ShieldOff,
  Target,
  UserRound,
  Users,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { GameCard } from '@/app/components/ui/GameCard';
import { SectionHeading } from '@/app/components/ui/SectionHeading';
import { StatCard } from '@/app/components/ui/StatCard';
import { TeamLogo } from '@/app/components/ui/TeamLogo';
import { getPlayerBySlug, getSiteData } from '@/lib/league-data';
import type { PlayerStats } from '@/lib/league-types';
import { initials } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };
type RankedStat = keyof Pick<PlayerStats, 'pointsPerGame' | 'reboundsPerGame' | 'assistsPerGame' | 'stealsPerGame' | 'blocksPerGame'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);

  if (!player) return { title: 'Player not found' };

  return {
    title: player.displayName,
    description: `View ${player.displayName}'s PBL profile, team and current season statistics.`,
    openGraph: {
      title: `${player.displayName} | PBL Player`,
      description: `${player.stats.pointsPerGame.toFixed(1)} PPG, ${player.stats.reboundsPerGame.toFixed(1)} RPG and ${player.stats.assistsPerGame.toFixed(1)} APG.`,
      type: 'profile',
    },
  };
}

export default async function PlayerDetailPage({ params }: Props) {
  const { slug } = await params;
  const [player, data] = await Promise.all([getPlayerBySlug(slug), getSiteData()]);

  if (!player) notFound();

  const team = data.teams.find((item) => item.id === player.teamId);
  const eligiblePlayers = data.players.filter((item) => item.stats.gamesPlayed > 0);
  const rankFor = (key: RankedStat) => {
    const index = [...eligiblePlayers]
      .sort((a, b) => b.stats[key] - a.stats[key])
      .findIndex((item) => item.id === player.id);
    return index < 0 ? null : index + 1;
  };
  const ranks = {
    pointsPerGame: rankFor('pointsPerGame'),
    reboundsPerGame: rankFor('reboundsPerGame'),
    assistsPerGame: rankFor('assistsPerGame'),
  };
  const teammates = data.players
    .filter((item) => item.teamId === player.teamId && item.id !== player.id)
    .sort((a, b) => b.stats.pointsPerGame - a.stats.pointsPerGame)
    .slice(0, 4);
  const teamGames = team
    ? data.games
      .filter(
        (game) =>
          (game.homeTeamId === team.id || game.awayTeamId === team.id)
          && data.teams.some((item) => item.id === game.homeTeamId)
          && data.teams.some((item) => item.id === game.awayTeamId),
      )
      .sort((a, b) => {
        const aUpcoming = a.status === 'scheduled' || a.status === 'live';
        const bUpcoming = b.status === 'scheduled' || b.status === 'live';
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return aUpcoming
          ? new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
          : new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
      })
      .slice(0, 2)
    : [];
  const primaryColor = team?.primaryColor ?? '#ff6b22';
  const secondaryColor = team?.secondaryColor ?? '#ffb067';

  return (
    <>
      <header className="relative isolate overflow-hidden border-b border-[var(--line)] py-12 sm:py-16">
        <div className="absolute inset-0 texture-dots opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div
          className="absolute -right-24 -top-40 -z-10 h-[32rem] w-[32rem] rounded-full opacity-20 blur-[100px]"
          style={{ backgroundColor: primaryColor }}
        />
        <div className="site-shell relative">
          <Link
            href="/players"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-soft)] transition hover:text-[var(--orange-soft)]"
          >
            <ArrowLeft className="h-4 w-4" /> Player directory
          </Link>

          <div className="mt-9 grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="relative w-fit">
              <span
                className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-[2rem] border border-white/20 text-3xl font-black text-white shadow-2xl sm:h-36 sm:w-36 sm:rounded-[2.35rem] sm:text-4xl"
                style={{ background: `linear-gradient(145deg, ${primaryColor}, ${secondaryColor})` }}
              >
                {player.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.avatarUrl} alt={player.displayName} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
                ) : initials(player.displayName)}
              </span>
              <span className="number-tabular absolute -bottom-2 -right-2 grid h-11 min-w-11 place-items-center rounded-xl border-4 border-[var(--page)] bg-[var(--surface-raised)] px-2 text-sm font-black">
                #{player.jerseyNumber}
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">
                <span>{player.position}</span>
                <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
                <span className={player.isActive ? 'text-emerald-300' : ''}>{player.isActive ? 'Active roster' : 'Inactive'}</span>
              </div>
              <h1 className="display-type mt-4 max-w-4xl text-balance text-5xl sm:text-6xl lg:text-7xl">{player.displayName}</h1>
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--ink-soft)]">
                <UserRound className="h-4 w-4 text-[var(--ink-faint)]" /> @{player.robloxUsername}
              </p>
              {team && (
                <Link href={`/teams/${team.slug}`} className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.11em] text-[var(--orange-soft)]">
                  <TeamLogo team={team} size="sm" className="!h-7 !w-7 !rounded-lg !text-[0.45rem]" />
                  {team.name} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 lg:min-w-64">
              <HeroMetric label="PPG" value={player.stats.pointsPerGame.toFixed(1)} rank={ranks.pointsPerGame} />
              <HeroMetric label="RPG" value={player.stats.reboundsPerGame.toFixed(1)} rank={ranks.reboundsPerGame} />
              <HeroMetric label="APG" value={player.stats.assistsPerGame.toFixed(1)} rank={ranks.assistsPerGame} />
            </div>
          </div>
        </div>
      </header>

      <div className="site-shell py-12 sm:py-16">
        <section>
          <SectionHeading
            eyebrow={data.season.name}
            title="Season averages"
            description={`${player.stats.gamesPlayed} games played. Leaderboard ranks include players with at least one recorded game.`}
            href="/stats"
            linkLabel="All league stats"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard value={player.stats.pointsPerGame.toFixed(1)} label="Points per game" detail={rankLabel(ranks.pointsPerGame)} icon={Target} accent="orange" />
            <StatCard value={player.stats.reboundsPerGame.toFixed(1)} label="Rebounds per game" detail={rankLabel(ranks.reboundsPerGame)} icon={Activity} accent="blue" />
            <StatCard value={player.stats.assistsPerGame.toFixed(1)} label="Assists per game" detail={rankLabel(ranks.assistsPerGame)} icon={Crosshair} accent="mint" />
            <StatCard value={player.stats.gamesPlayed} label="Games played" detail={data.season.name} icon={Gauge} accent="orange" />
          </div>
        </section>

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] sm:mt-16">
          <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
            <p className="eyebrow">Player profile</p>
            <h2 className="display-type mt-4 text-3xl sm:text-4xl">About {player.displayName}</h2>
            <p className="mt-5 text-pretty text-sm leading-7 text-[var(--ink-soft)] sm:text-base">{player.bio}</p>

            <dl className="mt-7 grid gap-px overflow-hidden rounded-[1.2rem] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
              <ProfileFact label="Roblox username" value={`@${player.robloxUsername}`} />
              <ProfileFact label="Position" value={player.position} />
              <ProfileFact label="Jersey number" value={`#${player.jerseyNumber}`} />
              <ProfileFact label="Roster status" value={player.isActive ? 'Active' : 'Inactive'} />
            </dl>
          </section>

          <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
            <p className="eyebrow">Advanced line</p>
            <h2 className="display-type mt-4 text-3xl sm:text-4xl">Defense & shooting</h2>
            <dl className="mt-7 space-y-1">
              <DetailedStat label="Steals per game" value={player.stats.stealsPerGame.toFixed(1)} />
              <DetailedStat label="Blocks per game" value={player.stats.blocksPerGame.toFixed(1)} />
              <DetailedStat label="Field goal percentage" value={`${player.stats.fieldGoalPct.toFixed(1)}%`} />
              <DetailedStat label="Three-point percentage" value={`${player.stats.threePointPct.toFixed(1)}%`} />
            </dl>
          </section>
        </div>

        <section className="mt-14 sm:mt-16">
          <SectionHeading
            eyebrow="Current club"
            title="Team context"
            description="Open the team page for the full roster, or follow the club's latest matchups below."
          />
          {!team ? (
            <EmptyState
              icon={ShieldOff}
              title="No team assignment"
              description="This player is not currently linked to a published league team."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
              <Link
                href={`/teams/${team.slug}`}
                className="lift group relative isolate flex min-h-60 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6"
              >
                <span
                  className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full opacity-20 blur-3xl"
                  style={{ backgroundColor: team.primaryColor }}
                />
                <TeamLogo team={team} size="lg" />
                <span className="mt-auto pt-8">
                  <span className="block text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">{team.conference} Conference</span>
                  <span className="mt-2 flex items-end justify-between gap-4">
                    <span className="text-2xl font-black tracking-[-0.045em] transition group-hover:text-[var(--orange-soft)]">{team.name}</span>
                    <ArrowRight className="mb-1 h-5 w-5 text-[var(--orange-soft)] transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
              {teamGames.length === 0 ? (
                <EmptyState
                  icon={CalendarX2}
                  title="No team games yet"
                  description="The latest matchup will appear here once a game is scheduled."
                />
              ) : (
                <div className="grid gap-4">
                  {teamGames.map((game) => <GameCard key={game.id} game={game} teams={data.teams} compact />)}
                </div>
              )}
            </div>
          )}
        </section>

        {team && (
          <section className="mt-14 sm:mt-16">
            <SectionHeading
              eyebrow="Locker room"
              title="More teammates"
              href={`/teams/${team.slug}`}
              linkLabel="Full roster"
            />
            {teammates.length === 0 ? (
              <EmptyState icon={Users} title="No teammates published" description="Additional roster profiles will appear here once assigned." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {teammates.map((teammate) => (
                  <Link key={teammate.id} href={`/players/${teammate.slug}`} className="lift group rounded-[1.3rem] border border-[var(--line)] bg-[var(--surface)] p-4">
                    <span className="flex items-center gap-3">
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-black text-white"
                        style={{ background: `linear-gradient(145deg, ${team.primaryColor}, ${team.secondaryColor})` }}
                      >
                        {initials(teammate.displayName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black transition group-hover:text-[var(--orange-soft)]">{teammate.displayName}</span>
                        <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">#{teammate.jerseyNumber} - {teammate.position}</span>
                      </span>
                    </span>
                    <span className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-[var(--ink-soft)]">
                      <span>{teammate.stats.pointsPerGame.toFixed(1)} PPG</span>
                      <ArrowRight className="h-4 w-4 text-[var(--orange-soft)]" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function rankLabel(rank: number | null) {
  return rank ? `No. ${rank} in the league` : 'Not yet ranked';
}

function HeroMetric({ label, value, rank }: { label: string; value: string; rank: number | null }) {
  return (
    <div className="rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface)]/80 p-3 text-center backdrop-blur-sm">
      <span className="number-tabular block text-2xl font-black tracking-[-0.06em]">{value}</span>
      <span className="mt-1 block text-[0.55rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{label}</span>
      <span className="mt-2 block text-[0.58rem] font-bold text-[var(--orange-soft)]">{rank ? `#${rank}` : '-'}</span>
    </div>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-raised)] p-4">
      <dt className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{label}</dt>
      <dd className="mt-2 text-sm font-black">{value}</dd>
    </div>
  );
}

function DetailedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-4 last:border-0">
      <dt className="text-sm text-[var(--ink-soft)]">{label}</dt>
      <dd className="number-tabular text-xl font-black tracking-[-0.04em] text-[var(--orange-soft)]">{value}</dd>
    </div>
  );
}
