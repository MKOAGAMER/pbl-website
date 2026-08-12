import type { Metadata } from 'next';
import { getSiteData } from '@/lib/league-data';
import { isTournamentOnlyMode } from '@/lib/league-data';
import { StandingsBoard } from './StandingsBoard';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Trophy } from 'lucide-react';

export const metadata: Metadata = { title: 'Standings', description: 'Current PBAL standings, records and championship race.' };
export default async function StandingsPage() { const data = await getSiteData(); if (isTournamentOnlyMode(data)) return <main className="site-shell py-20"><EmptyState icon={Trophy} title="League standings are not active" description="This site is currently running tournament-only competitions. View group standings and brackets on the Tournaments page." action={{ href: '/tournaments', label: 'View tournaments' }} /></main>; return <StandingsBoard teams={data.teams} season={data.season.name} />; }
