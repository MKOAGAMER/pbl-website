import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Medal, Trophy } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { PlayerAvatar } from '@/app/components/ui/PlayerAvatar';
import { TeamLogo } from '@/app/components/ui/TeamLogo';

export const metadata: Metadata = {
  title: 'Accolades & Records',
  description: 'PBL season awards, single-game records and historic achievements.',
};

export default async function AccoladesPage() {
  const data = await getSiteData();
  const awards = data.accolades.filter((item) => item.type !== 'record');
  const records = data.accolades.filter((item) => item.type === 'record');

  return (
    <>
      <PageIntro eyebrow="League recognition" title="Medals that tell the story." description="Achievements, championships, season awards and record performances preserved across the official PBL archive." />
      <div className="site-shell space-y-14 py-12 sm:py-16">
        {data.accolades.length === 0 ? (
          <EmptyState icon={Trophy} title="The archive is empty" description="Awards and records will appear here as the season progresses." />
        ) : (
          <>
            <AccoladeSection title="Medals & achievements" description="Recognition awarded by the league office to players and teams." items={awards} icon={Award} teams={data.teams} />
            <AccoladeSection title="Record book" description="Verified single-game and season performances." items={records} icon={Medal} teams={data.teams} />
          </>
        )}
      </div>
    </>
  );
}

function AccoladeSection({ title, description, items, icon: Icon, teams }: { title: string; description: string; items: Awaited<ReturnType<typeof getSiteData>>['accolades']; icon: typeof Award; teams: Awaited<ReturnType<typeof getSiteData>>['teams'] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-6 flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-400/10 text-[var(--orange-soft)]"><Icon className="h-5 w-5" /></span>
        <div><h2 className="display-type text-3xl sm:text-4xl">{title}</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">{description}</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const team = teams.find((entry) => entry.id === item.teamId);
          const card = (
            <article className="lift relative isolate overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
              <span className="absolute right-5 top-4 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--ink-faint)]">{item.competitionType === 'tournament' ? 'Tournament' : 'League'} · {item.season}</span>
              <div className="flex items-start gap-4 pr-14">
                {team ? <TeamLogo team={team} size="md" /> : item.playerId ? <PlayerAvatar src={item.recipientAvatarUrl} name={item.recipient} size="sm" className="!h-12 !w-12" /> : <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-soft)]"><Icon className="h-5 w-5 text-[var(--ink-faint)]" /></span>}
                <div><p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--orange-soft)]">{item.category || item.type}</p><h3 className="mt-1 text-xl font-black tracking-[-0.035em]">{item.title}</h3><p className="mt-1 text-sm font-bold text-[var(--ink-soft)]">{item.recipient}</p></div>
              </div>
              <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm leading-6 text-[var(--ink-soft)]">{item.description}</p>
            </article>
          );
          return team
            ? <Link key={item.id} href={`/teams/${team.slug}`}>{card}</Link>
            : item.playerSlug
              ? <Link key={item.id} href={`/players/${item.playerSlug}`}>{card}</Link>
              : <div key={item.id}>{card}</div>;
        })}
      </div>
    </section>
  );
}
