import type { Metadata } from 'next';
import { Newspaper } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import { NewsCard } from '@/app/components/ui/NewsCard';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { EmptyState } from '@/app/components/ui/EmptyState';

export const metadata: Metadata = {
  title: 'News',
  description: 'League news, match previews, player stories and community updates from the PBL.',
};

export default async function NewsPage() {
  const data = await getSiteData();
  const featured = data.news.filter((post) => post.featured);
  const leadPost = featured[0] ?? data.news[0];
  const remaining = data.news.filter((post) => post.id !== leadPost?.id);
  const categories = [...new Set(data.news.map((post) => post.category))];

  return (
    <>
      <PageIntro
        eyebrow="PBL newsroom"
        title="Stories beyond the scoreboard."
        description="Official announcements, match previews, weekly awards and the people shaping the Practical Basketball Asia League."
      />
      <div className="site-shell py-12 sm:py-16">
        {categories.length > 0 && (
          <div className="hide-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 rounded-full bg-[var(--orange)] px-4 py-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-black">
              All stories
            </span>
            {categories.map((category) => (
              <span key={category} className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                {category}
              </span>
            ))}
          </div>
        )}

        {!leadPost ? (
          <EmptyState icon={Newspaper} title="No stories published" description="Published league stories will appear here once an editor adds them in the admin dashboard." />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <NewsCard post={leadPost} featured className="lg:col-span-2" />
            {remaining.map((post) => <NewsCard key={post.id} post={post} />)}
          </div>
        )}
      </div>
    </>
  );
}
