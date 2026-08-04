import type { Metadata } from 'next';
import controlsJson from './practical_basketball_controls.json';
import { ControlLab } from './ControlLab';
import type { ControlData } from './types';

export const metadata: Metadata = {
  title: 'Control Lab',
  description: 'Interactive 3D controls guide and challenge mode for Practical Basketball.',
};

export default function ControlsPage() {
  return <ControlLab data={controlsJson as ControlData} />;
}
