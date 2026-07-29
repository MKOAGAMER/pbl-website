import type { Metadata } from 'next';
import { LegalDocument } from '../legal/LegalDocument';
export const metadata: Metadata = { title: 'Terms of Use', description: 'PBAL terms of use.' };
export default function TermsPage() { return <LegalDocument kind="terms" />; }
