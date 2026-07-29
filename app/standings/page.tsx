import type { Metadata } from 'next';
import { getSiteData } from '@/lib/league-data';
import { StandingsBoard } from './StandingsBoard';

export const metadata: Metadata = { title: 'Standings', description: 'Current PBAL standings, records and championship race.' };
export default async function StandingsPage() { const data = await getSiteData(); return <StandingsBoard teams={data.teams} season={data.season.name} />; }
