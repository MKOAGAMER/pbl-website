import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, UserRound } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getNewsBySlug, getSiteData } from '@/lib/league-data';
import { formatPublishedDate } from '@/lib/utils';
import { NewsCard } from '@/app/components/ui/NewsCard';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);
  if (!post) return { title: 'Story not found' };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: 'article' },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const [post, data] = await Promise.all([getNewsBySlug(slug), getSiteData()]);
  if (!post) notFound();

  const related = data.news.filter((item) => item.id !== post.id).slice(0, 2);

  return (
    <>
      <article>
        <header className="relative overflow-hidden border-b border-[var(--line)] py-14 sm:py-20">
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-35 texture-dots [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="site-shell relative">
            <Link href="/news" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-soft)] transition hover:text-[var(--orange-soft)]">
              <ArrowLeft className="h-4 w-4" /> Back to newsroom
            </Link>
            <div className="mt-10 max-w-5xl">
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--orange-soft)]">{post.category}</span>
              <h1 className="display-type mt-6 text-balance text-5xl sm:text-6xl lg:text-7xl">{post.title}</h1>
              <p className="mt-7 max-w-3xl text-pretty text-lg leading-8 text-[var(--ink-soft)]">{post.excerpt}</p>
              <div className="mt-8 flex flex-wrap items-center gap-5 text-xs font-bold uppercase tracking-[0.09em] text-[var(--ink-faint)]">
                <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {formatPublishedDate(post.publishedAt)}</span>
                <span className="flex items-center gap-2"><UserRound className="h-4 w-4" /> {post.authorName}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="site-shell grid gap-10 py-12 lg:grid-cols-[minmax(0,46rem)_1fr] lg:py-16">
          <div className="space-y-6 text-pretty text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
            {post.content.split(/\n\n+/).map((paragraph, index) => (
              <p key={`${post.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
          <aside className="h-fit rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 lg:sticky lg:top-24">
            <p className="eyebrow">Story details</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-4"><dt className="text-[var(--ink-faint)]">Category</dt><dd className="font-bold">{post.category}</dd></div>
              <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-4"><dt className="text-[var(--ink-faint)]">Published</dt><dd className="font-bold">{formatPublishedDate(post.publishedAt)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--ink-faint)]">By</dt><dd className="font-bold">{post.authorName}</dd></div>
            </dl>
            <Link href="/games" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--orange)] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black">
              Match center <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-[var(--line)] py-12 sm:py-16">
          <div className="site-shell">
            <p className="eyebrow">Keep reading</p>
            <h2 className="display-type mt-3 text-3xl sm:text-4xl">More from PBL</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {related.map((item) => <NewsCard key={item.id} post={item} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

