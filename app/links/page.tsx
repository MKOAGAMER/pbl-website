import type { Metadata } from 'next';
import { ArrowUpRight, ExternalLink, Gamepad2, Globe2, MessageCircle, Users } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { EmptyState } from '@/app/components/ui/EmptyState';

export const metadata: Metadata = {
  title: 'Community Links',
  description: 'Official PBL Roblox, Discord, broadcast and community links.',
};

const iconByKind = {
  community: Users,
  game: Gamepad2,
  social: MessageCircle,
  resource: Globe2,
};

export default async function LinksPage() {
  const data = await getSiteData();

  return (
    <>
      <PageIntro eyebrow="Official channels" title="Find PBL everywhere." description="Use these verified destinations for league games, announcements, broadcasts, support and community events." />
      <div className="site-shell py-12 sm:py-16">
        {data.links.length === 0 ? (
          <EmptyState icon={ExternalLink} title="No links published" description="Official community destinations will appear here after league staff add them." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.links.map((link, index) => {
              const Icon = iconByKind[link.kind];
              return (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="lift group relative isolate min-h-52 overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)] p-6"
                >
                  <span className="absolute -right-10 -top-14 text-[10rem] font-black leading-none tracking-[-0.1em] text-[var(--ink)]/[0.025]">0{index + 1}</span>
                  <div className="relative flex h-full flex-col">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-soft)] text-[var(--orange-soft)]"><Icon className="h-5 w-5" /></span>
                    <h2 className="mt-8 text-2xl font-black tracking-[-0.04em]">{link.label}</h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ink-soft)]">{link.description}</p>
                    <span className="mt-auto flex items-center gap-2 pt-6 text-xs font-black uppercase tracking-[0.13em] text-[var(--orange-soft)]">
                      Open official link <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
        <div className="mt-8 rounded-[1.4rem] border border-[var(--line)] bg-[var(--page-deep)] p-5 text-sm leading-6 text-[var(--ink-soft)]">
          <strong className="text-[var(--ink)]">Safety note:</strong> PBL staff will never ask for your password or Roblox cookie. Verify that links appear on this page before signing in anywhere.
        </div>
      </div>
    </>
  );
}

