import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { NewsPost } from '@/lib/league-types';
import { cn, formatPublishedDate } from '@/lib/utils';

interface NewsCardProps {
  post: NewsPost;
  featured?: boolean;
  className?: string;
}

export function NewsCard({ post, featured = false, className }: NewsCardProps) {
  return (
    <article className={cn('lift group overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)]', featured && 'md:grid md:grid-cols-[1.05fr_0.95fr]', className)}>
      <Link
        href={`/news/${post.slug}`}
        className={cn('relative isolate flex min-h-48 overflow-hidden p-5', featured && 'md:min-h-80')}
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${post.accent} 90%, #111722), #111722 72%)`,
        }}
        aria-label={`Read ${post.title}`}
      >
        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70"
          />
        )}
        {post.coverUrl && <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />}
        <span className="absolute -right-12 -top-12 h-52 w-52 rounded-full border-[32px] border-white/10" />
        <span className="absolute -bottom-24 left-6 h-48 w-48 rotate-45 rounded-[2.5rem] bg-black/15" />
        <span className="absolute inset-x-6 bottom-5 text-[clamp(3rem,9vw,7rem)] font-black leading-none tracking-[-0.09em] text-white/10">
          PBL
        </span>
        <span className="relative mt-auto rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          {post.category}
        </span>
      </Link>

      <div className="flex flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
          <span>{formatPublishedDate(post.publishedAt)}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
          <span>{post.authorName}</span>
        </div>
        <Link href={`/news/${post.slug}`}>
          <h3 className={cn('mt-4 text-balance font-black leading-[1.05] tracking-[-0.045em] transition group-hover:text-[var(--orange-soft)]', featured ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl')}>
            {post.title}
          </h3>
        </Link>
        <p className="mt-4 text-pretty text-sm leading-6 text-[var(--ink-soft)]">{post.excerpt}</p>
        <Link href={`/news/${post.slug}`} className="mt-6 inline-flex items-center gap-2 self-start text-xs font-black uppercase tracking-[0.13em] text-[var(--orange-soft)]">
          Read story <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </article>
  );
}
