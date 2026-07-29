import type { Metadata } from 'next';
import { getSiteData } from '@/lib/league-data';
import { SearchHub } from './SearchHub';
export const metadata: Metadata = { title: 'Search', description: 'Search PBAL players, teams and Roblox usernames.' };
export default async function SearchPage() { const data = await getSiteData(); return <SearchHub players={data.players} teams={data.teams} />; }
