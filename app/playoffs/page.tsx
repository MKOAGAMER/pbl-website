import type { Metadata } from 'next';
import { getSiteData } from '@/lib/league-data';
import { PlayoffBracket } from './PlayoffBracket';
export const metadata: Metadata = { title: 'Playoffs', description: 'PBAL playoff bracket and road to the finals.' };
export default async function PlayoffsPage() { const data = await getSiteData(); return <PlayoffBracket teams={data.teams} />; }

