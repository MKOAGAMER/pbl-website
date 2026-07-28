import Link from 'next/link';
import { ArrowRight, CalendarDays, DatabaseZap, Radio, Trophy, Users } from 'lucide-react';
import { EmptyState } from './components/ui/EmptyState';
import { GameCard } from './components/ui/GameCard';
import { NewsCard } from './components/ui/NewsCard';
import { SectionHeading } from './components/ui/SectionHeading';
import { StatCard } from './components/ui/StatCard';
import { StatLeaderCard } from './components/ui/StatLeaderCard';
import { TeamLogo } from './components/ui/TeamLogo';
import { getSiteData } from '@/lib/league-data';
import { rankTeamsByStanding } from '@/lib/utils';

export default async function HomePage() {
  const data = await getSiteData();

  if (data.source === 'unavailable') {
    return (
      <section className="site-shell grid min-h-[65vh] place-items-center py-16">
        <EmptyState
          icon={DatabaseZap}
          title="League data is temporarily unavailable"
          description="No schedules, scores or standings are being substituted. Please try again after the league database connection is restored."
        />
      </section>
    );
  }

  const upcomingGames = data.games
    .filter((game) => game.status === 'scheduled' || game.status === 'live')
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const latestResults = data.games
    .filter((game) => game.status === 'final')
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const featuredGame = upcomingGames[0] ?? latestResults[0];
  const rankedTeams = rankTeamsByStanding(data.teams);
  const leaders = [
    { label: 'PPG', key: 'pointsPerGame' as const },
    { label: 'RPG', key: 'reboundsPerGame' as const },
    { label: 'APG', key: 'assistsPerGame' as const },
  ].map((stat) => ({
    ...stat,
    players: [...data.players]
      .sort((a, b) => b.stats[stat.key] - a.stats[stat.key])
      .slice(0, 3),
  }));

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-[var(--line)]">
        <div className="absolute inset-0 subtle-grid opacity-30 [mask-image:linear-gradient(to_bottom,black_15%,transparent_88%)]" />
        <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -right-28 bottom-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="site-shell relative grid min-h-[calc(100vh-4.5rem)] gap-12 py-16 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:py-20">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.13em] text-[var(--ink-soft)]">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
              {data.season.name} · Live league hub
            </div>
            <h1 className="display-type mt-7 max-w-4xl text-balance text-[clamp(3.8rem,9vw,7.8rem)]">
              The game<br />lives <span className="text-[var(--orange)]">here.</span>
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-[var(--ink-soft)] sm:text-lg">
              Follow every PBL matchup, result, roster move and breakout performance from one official source.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/games"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--orange)] px-6 text-xs font-black uppercase tracking-[0.13em] text-black transition hover:bg-[var(--orange-soft)]"
              >
                View schedule <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/standings"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-6 text-xs font-black uppercase tracking-[0.13em] transition hover:border-[var(--orange)]"
              >
                League table
              </Link>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-[var(--line)] pt-6">
              <HeroMetric value={data.teams.length} label="Teams" />
              <HeroMetric value={data.players.length} label="Players" />
              <HeroMetric value={data.games.length} label="Games" />
            </div>
          </div>

          <div className="relative mx-auto min-w-0 w-full max-w-xl lg:justify-self-end">
            <div className="absolute -inset-5 rotate-3 rounded-[2.25rem] border border-[var(--line)] bg-[var(--surface)]/30" />
            <div className="absolute -inset-2 -rotate-2 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)]/50" />
            <div className="surface-card relative overflow-hidden rounded-[1.8rem] p-3">
              <div className="mb-3 flex items-center justify-between px-2 pt-2">
                <span className="eyebrow">Next on court</span>
                <span className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                  <Radio className="h-3.5 w-3.5" /> PBL Broadcast
                </span>
              </div>
              {featuredGame ? (
                <GameCard game={featuredGame} teams={data.teams} compact className="border-0 bg-[var(--surface-raised)]" />
              ) : (
                <div className="rounded-[1.5rem] bg-[var(--surface-raised)] p-10 text-center text-sm text-[var(--ink-soft)]">
                  The next matchup will be announced soon.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell py-16 sm:py-20">
        <SectionHeading
          eyebrow="Match center"
          title="Next up & latest finals"
          description="Schedules and scores update from the same league database used by staff and stat keepers."
          href="/games"
          linkLabel="Full schedule"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {upcomingGames.slice(0, 2).map((game) => (
            <GameCard key={game.id} game={game} teams={data.teams} />
          ))}
          {latestResults.slice(0, 2).map((game) => (
            <GameCard key={game.id} game={game} teams={data.teams} />
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--page-deep)] py-16 sm:py-20">
        <div className="site-shell">
          <div className="grid gap-10 xl:grid-cols-[0.82fr_1.18fr]">
            <div>
              <SectionHeading
                eyebrow="League table"
                title="The race right now"
                description="Win percentage determines position, followed by total wins, fewer losses and then team name."
                href="/standings"
                linkLabel="All standings"
              />
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
                <div className="grid grid-cols-[2rem_1fr_auto] gap-3 border-b border-[var(--line)] px-4 py-3 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  <span>#</span><span>Club</span><span>W–L</span>
                </div>
                {rankedTeams.slice(0, 5).map((team, index) => (
                  <Link key={team.id} href={`/teams/${team.slug}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-[var(--line)] px-4 py-3.5 last:border-0 hover:bg-[var(--surface-raised)]">
                    <span className="number-tabular text-sm font-black text-[var(--ink-faint)]">{String(index + 1).padStart(2, '0')}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <TeamLogo team={team} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{team.name}</span>
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">{team.conference}</span>
                      </span>
                    </span>
                    <span className="number-tabular font-black">{team.wins}–{team.losses}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <SectionHeading
                eyebrow="Stat leaders"
                title="Setting the pace"
                description="Season averages for eligible players across scoring, rebounding and playmaking."
                href="/stats"
                linkLabel="All leaders"
              />
              <div className="grid gap-4 md:grid-cols-3">
                {leaders.map((group) => (
                  <div key={group.key} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-raised)] p-3">
                    <p className="mb-3 px-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--orange-soft)]">{group.label} leaders</p>
                    <div className="space-y-2">
                      {group.players.map((player, index) => {
                        const team = data.teams.find((item) => item.id === player.teamId);
                        if (!team) return null;
                        return (
                          <StatLeaderCard
                            key={player.id}
                            player={player}
                            team={team}
                            rank={index + 1}
                            label={group.label}
                            value={player.stats[group.key].toFixed(1)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell py-16 sm:py-20">
        <SectionHeading eyebrow="League stories" title="News from around PBL" href="/news" linkLabel="Newsroom" />
        {data.news.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2">
            <NewsCard post={data.news[0]} featured className="lg:col-span-2" />
            {data.news.slice(1, 3).map((post) => <NewsCard key={post.id} post={post} />)}
          </div>
        )}
      </section>

      <section className="site-shell pb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value={data.teams.length} label="Active teams" detail="Across two conferences" icon={Trophy} accent="orange" />
          <StatCard value={data.players.length} label="Registered players" detail="Current season rosters" icon={Users} accent="blue" />
          <StatCard value={latestResults.length} label="Final games" detail={data.season.name} icon={CalendarDays} accent="mint" />
          <StatCard value={upcomingGames.length} label="Upcoming" detail="Scheduled matchups" icon={Radio} accent="orange" />
        </div>
      </section>
    </>
  );
}

function HeroMetric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <span className="number-tabular block text-2xl font-black tracking-[-0.06em] sm:text-3xl">{value}</span>
      <span className="mt-1 block text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-faint)]">{label}</span>
    </div>
  );
}
