import { RaceHome } from './components/home/RaceHome';
import { getSiteData } from '@/lib/league-data';
import { getPublicTournaments } from '@/lib/tournament-data';

export default async function HomePage() {
  const [data, tournaments] = await Promise.all([getSiteData(), getPublicTournaments()]);
  return <RaceHome data={data} tournaments={tournaments} />;
}
