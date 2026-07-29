import type { Metadata } from 'next';
import { LegalDocument } from '../legal/LegalDocument';
export const metadata: Metadata = { title: 'Privacy Policy', description: 'PBAL privacy policy.' };
export default function PrivacyPage() { return <LegalDocument kind="privacy" />; }

