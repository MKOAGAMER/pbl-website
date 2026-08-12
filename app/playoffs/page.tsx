import type { Metadata } from 'next';
import { getSiteData, isTournamentOnlyMode } from '@/lib/league-data';
import { PlayoffBracket } from './PlayoffBracket';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Trophy } from 'lucide-react';
export const metadata: Metadata = { title: 'Playoffs', description: 'PBAL playoff bracket and road to the finals.' };
export default async function PlayoffsPage() { const data = await getSiteData(); if (isTournamentOnlyMode(data)) return <main className="site-shell py-20"><EmptyState icon={Trophy} title="League playoffs are not active" description="This site is currently running tournament-only competitions. Open Tournaments to follow the official bracket." action={{ href: '/tournaments', label: 'View tournaments' }} /></main>; return <PlayoffBracket teams={data.teams} />; }
