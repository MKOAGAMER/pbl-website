'use client';

import Link from 'next/link';
import { Newspaper, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NewsCard } from '../ui/NewsCard';
import { getFeaturedArticles, getLatestArticles } from '../../lib/data/news';
import type { Article } from '../../types/news';

interface LatestNewsProps {
  articles?: Article[];
  featuredArticles?: Article[];
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  className?: string;
}

export function LatestNews({
  featuredArticles,
  articles,
  title = 'Latest News',
  subtitle,
  showViewAll = true,
  viewAllHref = '/news',
  className,
}: LatestNewsProps) {
  const featured = featuredArticles || getFeaturedArticles(2);
  const latest = articles || getLatestArticles(10);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Newspaper className="w-6 h-6 text-eba-blue" />
          {title}
        </h2>
        {showViewAll && (
          <Link
            href={viewAllHref}
            className="text-eba-blue hover:text-blue-600 flex items-center text-sm"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Featured Article */}
      {featured.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {featured.map((article, index) => (
            <NewsCard key={article.id} article={article} variant="featured" />
          ))}
        </div>
      )}

      {/* Latest Articles */}
      {latest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {latest.map((article) => (
            <NewsCard key={article.id} article={article} variant="default" />
          ))}
        </div>
      )}
    </div>
  );
}