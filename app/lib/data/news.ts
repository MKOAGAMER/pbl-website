import type { Article, Author } from '@/types/news';

export const mockAuthors: Author[] = [
  {
    id: 'a1',
    name: 'Sarah Mitchell',
    avatar: '/authors/sarah.png',
    role: 'Senior Writer',
    bio: 'Covering PBL since 2020. Former college basketball player.',
  },
  {
    id: 'a2',
    name: 'Marcus Thompson',
    avatar: '/authors/marcus.png',
    role: 'Lead Analyst',
    bio: 'Statistics expert and former NBA scout.',
  },
  {
    id: 'a3',
    name: 'Elena Rodriguez',
    avatar: '/authors/elena.png',
    role: 'Staff Writer',
    bio: 'Passionate about women\'s basketball and international prospects.',
  },
  {
    id: 'a4',
    name: 'James Chen',
    avatar: '/authors/james.png',
    role: 'Deputy Editor',
    bio: 'Breaking news and trade deadline specialist.',
  },
];

export const mockArticles: Article[] = [
  {
    id: 'art1',
    title: 'PBL Pre-Season Tournament Completed: Toronto Terror Crowned Champions',
    slug: 'pbl-pre-season-tournament-completed-toronto-terror-crowned-champions',
    excerpt: 'Congratulations to the Toronto Terror for defeating Houston Hustle in 2 games. I would like to announce that your preseason playoff MVP is Marcus Johnson!',
    content: `
      <p>The 2026 PBL Pre-Season Tournament has concluded with the Toronto Terror emerging as champions after a decisive 2-0 series victory over the Houston Hustle.</p>

      <p>Game 1 saw the Terror dominate from the opening tip, with Tyler Chen orchestrating the offense to perfection. The Terror's defense stifled the Hustle's high-powered attack, holding them to just 68 points.</p>

      <h2>Series MVP: Marcus Johnson</h2>
      <p>Philadelphia Glory guard Marcus Johnson was named the tournament MVP after averaging 31.5 points, 6.2 rebounds, and 5.8 assists across the two games. His clutch performance in Game 2, where he dropped 38 points including the game-winning three-pointer with 3.2 seconds remaining, cemented his status as the league's premier scorer.</p>

      <h2>Looking Ahead</h2>
      <p>The regular season tips off next week with all 24 teams in action. The Terror will look to carry their momentum into the season opener against the Chicago Cyclones, while the Hustle will aim to bounce back against the Los Angeles Legends.</p>
    `,
    image: '/news/preseason-champions.jpg',
    author: mockAuthors[0],
    publishedAt: '2026-01-04T14:30:00Z',
    updatedAt: '2026-01-04T16:45:00Z',
    category: 'Tournament',
    tags: ['Pre-Season', 'Toronto Terror', 'Champions', 'MVP'],
    featured: true,
    views: 15420,
  },
  {
    id: 'art2',
    title: 'Practical Basketball Asia League Announces 2026 Schedule',
    slug: 'practical-basketball-league-announces-2026-schedule',
    excerpt: 'The PBL has officially released the complete 2026 regular season schedule featuring 82 games per team, new rivalry matchups, and expanded national TV coverage.',
    content: `
      <p>The Practical Basketball Asia League unveiled its 2026 regular season schedule today, featuring 82 games per team across a 26-week season.</p>

      <h2>Key Highlights</h2>
      <ul>
        <li>Opening Night: October 22, 2026 - Philadelphia Glory vs. Toronto Terror</li>
        <li>Christmas Day Quintuple Header: 5 games on national TV</li>
        <li>All-Star Weekend: February 13-15, 2027 in Las Vegas</li>
        <li>Trade Deadline: February 6, 2027</li>
        <li>Playoffs Begin: April 15, 2027</li>
      </ul>

      <h2>New Rivalry Series</h2>
      <p>The league has designated 12 "Rivalry Series" matchups that will air on national television, including the Atlantic Showdown (PHI vs TOR), Pacific Coast Battle (LAL vs GSW), and the Texas Two-Step (HOU vs DAL).</p>
    `,
    image: '/news/2026-schedule.jpg',
    author: mockAuthors[3],
    publishedAt: '2026-01-02T10:00:00Z',
    category: 'League News',
    tags: ['Schedule', '2026 Season', 'National TV'],
    featured: false,
    views: 8932,
  },
  {
    id: 'art3',
    title: 'Rising Star: Jordan Williams Dominates Paint for Portland Vipers',
    slug: 'rising-star-jordan-williams-dominates-paint-portland-vipers',
    excerpt: 'Second-year forward Jordan Williams is making a name for himself as one of the league\'s most dominant interior players, averaging a double-double through 15 games.',
    content: `
      <p>Portland Vipers forward Jordan Williams has emerged as one of the most improved players in the PBL this season, transforming from a role player into a legitimate All-Star candidate.</p>

      <h2>Statistical Breakout</h2>
      <p>Through 15 games, Williams is averaging 22.3 points and 12.8 rebounds per game while shooting 54.2% from the field. His 8.4 offensive rebounds per game lead the league by a wide margin.</p>

      <h2>Coach\'s Perspective</h2>
      <p>"Jordan's motor is unmatched," said Vipers head coach. "He attacks every possession like it's his last. That kind of energy is contagious and elevates everyone around him."</p>

      <h2>Contract Implications</h2>
      <p>With his breakout season, Williams is now eligible for a contract extension worth up to $180 million over 5 years. The Vipers front office has indicated they intend to lock him up long-term.</p>
    `,
    image: '/news/jordan-williams-breakout.jpg',
    author: mockAuthors[2],
    publishedAt: '2025-12-28T09:15:00Z',
    category: 'Player Spotlight',
    tags: ['Jordan Williams', 'Portland Vipers', 'Breakout', 'All-Star'],
    featured: false,
    views: 6245,
  },
  {
    id: 'art4',
    title: 'PBL All-Star Voting Opens: Fans Can Vote Daily Starting Today',
    slug: 'pbl-all-star-voting-opens-fans-can-vote-daily-starting-today',
    excerpt: 'The 2027 PBL All-Star Game fan voting has officially opened. Fans can vote once per day for their favorite players across all positions.',
    content: `
      <p>Fan voting for the 2027 PBL All-Star Game officially opened at 12:00 PM EST today. Fans can vote once every 24 hours for their favorite players at each position.</p>

      <h2>Current Front-Runners</h2>
      <p>Early returns show Marcus Johnson (PHI), Giannis Antetokounmpo (MIL), and Luka Doncic (DAL) leading their respective conference frontcourt positions. In the backcourt, Tyler Chen (TOR) and Stephen Curry (GSW) hold narrow leads.</p>

      <h2>Voting Details</h2>
      <ul>
        <li>Voting Period: January 1 - January 28, 2027</li>
        <li>One vote per fan per day</li>
        <li>Fan vote accounts for 50% of selection</li>
        <li>Player vote: 25%, Media vote: 25%</li>
      </ul>
    `,
    image: '/news/all-star-voting.jpg',
    author: mockAuthors[1],
    publishedAt: '2025-12-25T12:00:00Z',
    category: 'All-Star',
    tags: ['All-Star', 'Voting', '2027'],
    featured: false,
    views: 11203,
  },
  {
    id: 'art5',
    title: 'Trade Deadline Preview: 5 Teams That Could Shake Up the League',
    slug: 'trade-deadline-preview-5-teams-could-shake-up-league',
    excerpt: 'With the February 6 trade deadline approaching, several teams are expected to be active buyers or sellers. Here are the five teams to watch.',
    content: `
      <p>The PBL trade deadline is just weeks away, and the rumor mill is heating up. Here are five teams that could make franchise-altering moves:</p>

      <h2>1. Houston Hustle (Buyers)</h2>
      <p>Despite a strong start, the Hustle lack perimeter shooting. They've been linked to several wing players on expiring contracts.</p>

      <h2>2. Detroit Destroyers (Sellers)</h2>
      <p>At 5-10, the Destroyers are expected to move veterans for draft capital and young assets.</p>

      <h2>3. Miami Magic (Buyers)</h2>
      <p>The Magic need a secondary playmaker alongside their star guard. They have the assets to make a splash.</p>

      <h2>4. San Antonio Strikers (Sellers)</h2>
      <p>Rebuilding San Antonio has multiple veterans on expiring deals that contenders covet.</p>

      <h2>5. Oklahoma City Outlaws (Could Go Either Way)</h2>
      <p>OKC has a surplus of young talent and draft picks. They could package assets for a star or continue developing their core.</p>
    `,
    image: '/news/trade-deadline-preview.jpg',
    author: mockAuthors[3],
    publishedAt: '2025-12-20T15:30:00Z',
    category: 'Trade Rumors',
    tags: ['Trade Deadline', 'Rumors', 'Buyers', 'Sellers'],
    featured: false,
    views: 9876,
  },
  {
    id: 'art6',
    title: 'Elevate League Championship: Boston Blaze Complete Historic Comeback',
    slug: 'elevate-league-championship-boston-blaze-complete-historic-comeback',
    excerpt: 'Down 0-2 in the finals, the Boston Blaze rattled off 4 straight wins to capture their first Elevate League championship since 2019.',
    content: `
      <p>In one of the most remarkable comebacks in professional basketball history, the Boston Blaze defeated the Golden State Guardians in 6 games after trailing 0-2 in the Elevate League Finals.</p>

      <h2>The Turnaround</h2>
      <p>After losing the first two games in Golden State by a combined 28 points, the Blaze returned home and won Games 3 and 4 by double digits. The momentum shifted completely, and Boston closed out the series with a 12-point victory in Game 6.</p>

      <h2>Finals MVP: Jaylen Brown</h2>
      <p>Blaze wing Jaylen Brown averaged 28.7 points, 7.2 rebounds, and 4.8 assists in the series, including a 42-point masterpiece in the clinching Game 6.</p>
    `,
    image: '/news/blaze-championship.jpg',
    author: mockAuthors[0],
    publishedAt: '2025-12-15T22:00:00Z',
    category: 'Elevate League',
    tags: ['Championship', 'Boston Blaze', 'Comeback', 'Finals MVP'],
    featured: true,
    views: 22104,
  },
];

export const getFeaturedArticles = (limit: number = 2): Article[] => {
  return mockArticles.filter((article) => article.featured).slice(0, limit);
};

export const getLatestArticles = (limit: number = 10): Article[] => {
  return mockArticles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
};

export const getArticleBySlug = (slug: string): Article | undefined => {
  return mockArticles.find((article) => article.slug === slug);
};

export const getArticlesByCategory = (category: string, limit?: number): Article[] => {
  const articles = mockArticles
    .filter((article) => article.category === category)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return limit ? articles.slice(0, limit) : articles;
};

export const getAllCategories = (): string[] => {
  return [...new Set(mockArticles.map((article) => article.category))];
};
