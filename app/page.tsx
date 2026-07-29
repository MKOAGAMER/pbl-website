import { RaceHome } from './components/home/RaceHome';
import { getSiteData } from '@/lib/league-data';

export default async function HomePage() {
  const data = await getSiteData();
  return <RaceHome data={data} />;
}
