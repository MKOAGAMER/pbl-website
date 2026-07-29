import type { Metadata } from 'next';
import { PartnersPage } from './PartnersPage';
export const metadata: Metadata = { title: 'Partners', description: 'PBAL sponsors and partners.' };
export default function Partners() { return <PartnersPage />; }

