import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const footerLinks = [
  { href: '/games', label: 'Games' },
  { href: '/standings', label: 'Standings' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/players', label: 'Players' },
  { href: '/news', label: 'News' },
  { href: '/accolades', label: 'Accolades' },
  { href: '/staff', label: 'Staff' },
  { href: '/links', label: 'Links' },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--line)] bg-[var(--page-deep)]">
      <div className="site-shell grid gap-12 py-14 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <p className="eyebrow">Built for the game</p>
          <p className="display-type mt-5 max-w-2xl text-4xl sm:text-5xl">
            Every possession.<br />One league archive.
          </p>
          <p className="mt-5 max-w-lg text-sm leading-6 text-[var(--ink-soft)]">
            The official source for PBL schedules, results, standings, player profiles and league stories.
          </p>
        </div>

        <div className="md:text-right">
          <div className="flex flex-wrap gap-x-5 gap-y-3 md:justify-end">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-bold text-[var(--ink-soft)] transition hover:text-[var(--orange-soft)]">
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            href="/links"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] transition hover:border-[var(--orange)] hover:text-[var(--orange-soft)]"
          >
            Join the community <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="site-shell flex flex-col gap-2 py-5 text-xs text-[var(--ink-faint)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Practical Basketball League</span>
          <span>Asia/Bangkok · All match times shown in ICT</span>
        </div>
      </div>
    </footer>
  );
}
