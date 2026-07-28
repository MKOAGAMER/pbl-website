import type { Metadata } from 'next';
import { BriefcaseBusiness, UserRound } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { initials } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'League Staff',
  description: 'Meet the competition, media and community staff behind the PBL.',
};

export default async function StaffPage() {
  const data = await getSiteData();
  const departments = [...new Set(data.staff.map((member) => member.department))];

  return (
    <>
      <PageIntro eyebrow="League office" title="The team behind the teams." description="Competition operations, statistics, media and community staff working together to keep every PBL season moving." />
      <div className="site-shell py-12 sm:py-16">
        {data.staff.length === 0 ? (
          <EmptyState icon={BriefcaseBusiness} title="Staff directory coming soon" description="League staff profiles will appear here after they are published." />
        ) : (
          <div className="space-y-12">
            {departments.map((department) => (
              <section key={department}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[var(--line)]" />
                  <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-faint)]">{department}</h2>
                  <span className="h-px flex-1 bg-[var(--line)]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.staff.filter((member) => member.department === department).map((member) => (
                    <article key={member.id} className="lift flex items-center gap-4 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5">
                      <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--surface-soft)] text-sm font-black text-[var(--orange-soft)]">
                        {member.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={member.avatarUrl} alt={member.name} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
                        ) : initials(member.name)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-black">{member.name}</h3>
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">{member.role}</p>
                        {member.robloxUsername && <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]"><UserRound className="h-3.5 w-3.5" /> @{member.robloxUsername}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
