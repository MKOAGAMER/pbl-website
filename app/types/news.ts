export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  author: Author;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  featured: boolean;
  views: number;
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
  role: string;
  bio?: string;
}

export interface NewsCardProps {
  article: Article;
  variant?: 'featured' | 'default' | 'compact';
  className?: string;
}

export interface NewsSectionProps {
  articles: Article[];
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  className?: string;
}