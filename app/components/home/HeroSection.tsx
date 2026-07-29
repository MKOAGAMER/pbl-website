'use client';

import Link from 'next/link';
import { Play, ChevronRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[70vh] mb-8 overflow-hidden rounded-lg">
      {/* Video Background */}
      <video
        autoPlay
        loop
        playsInline
        preload="auto"
        className="absolute top-0 left-0 w-full h-full object-cover"
        style={{ pointerEvents: 'none' }}
        poster="/hero-poster.jpg"
      >
        <source src="/videos/hero-background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[70vh] px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
          Practical Basketball Asia League
        </h1>
        <p className="text-xl sm:text-2xl text-gray-100 max-w-3xl drop-shadow-lg">
          Experience the most competitive basketball league. Watch highlights, follow your favorite teams,
          and witness elite competition.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/games"
            className="flex items-center gap-2 px-8 py-3 bg-eba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Play className="w-5 h-5" />
            View Schedule
          </Link>
          <Link
            href="/teams"
            className="flex items-center gap-2 px-8 py-3 border border-white/20 hover:border-white/40 text-white rounded-lg font-medium transition-colors"
          >
            Teams
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
