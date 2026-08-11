'use client';

import { ExternalLink, Music2, Power, Radio, X } from 'lucide-react';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './spotify-player.module.css';

const ALBUM_URL = 'https://open.spotify.com/album/5UBETmTHsqERFsbAz8zrpJ';

type SpotifyEvent = { data?: { duration?: number; position?: number; isPaused?: boolean } };
type SpotifyController = {
  play: () => void;
  pause: () => void;
  destroy: () => void;
  loadEntity: (url: string) => void;
  addListener: (event: string, callback: (event: SpotifyEvent) => void) => void;
};
type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { url: string; width: string; height: number },
    callback: (controller: SpotifyController) => void,
  ) => void;
};
type SpotifyWindow = Window & typeof globalThis & {
  onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  __pbalSpotifyIframeApi?: SpotifyIframeApi;
};

export function SpotifyPlayer() {
  const [enabled, setEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyController | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initializePlayer = useCallback(() => {
    const spotifyWindow = window as SpotifyWindow;
    if (!enabled || controllerRef.current || !embedRef.current || !spotifyWindow.__pbalSpotifyIframeApi) return;
    spotifyWindow.__pbalSpotifyIframeApi.createController(embedRef.current, {
      url: ALBUM_URL,
      width: '100%',
      height: 352,
    }, (controller) => {
      controllerRef.current = controller;
      controller.addListener('playback_started', () => {
        if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      });
      controller.addListener('playback_update', (event) => {
        const duration = event.data?.duration ?? 0;
        const position = event.data?.position ?? 0;
        if (!event.data?.isPaused || duration <= 0 || position < duration - 500 || loopTimerRef.current) return;
        // Spotify briefly pauses between album tracks. The next playback_started
        // event clears this timer; if it never arrives, the album has ended and
        // is loaded again from track one.
        loopTimerRef.current = setTimeout(() => {
          controller.loadEntity(ALBUM_URL);
          controller.play();
          loopTimerRef.current = null;
        }, 1500);
      });
      controller.play();
    });
  }, [enabled]);

  useEffect(() => {
    const spotifyWindow = window as SpotifyWindow;
    spotifyWindow.onSpotifyIframeApiReady = (api) => {
      spotifyWindow.__pbalSpotifyIframeApi = api;
      initializePlayer();
    };
    initializePlayer();
    return () => {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [initializePlayer]);

  const startPlayer = () => {
    setEnabled(true);
    setExpanded(true);
  };

  const stopPlayer = () => {
    controllerRef.current?.pause();
    controllerRef.current?.destroy();
    controllerRef.current = null;
    setEnabled(false);
    setExpanded(false);
  };

  return (
    <>
      <Script src="https://open.spotify.com/embed/iframe-api/v1" strategy="afterInteractive" onReady={initializePlayer} />
      <aside className={`${styles.player} ${expanded ? styles.expanded : ''}`} aria-label="Practical Basketball soundtrack">
        <div className={styles.header}>
          <button type="button" className={styles.albumButton} onClick={enabled ? () => setExpanded((value) => !value) : startPlayer}>
            <span className={styles.albumIcon}>{enabled ? <Radio /> : <Music2 />}</span>
            <span><small>PBAL SOUNDTRACK</small><strong>Practical Basketball OST</strong></span>
          </button>
          <div className={styles.actions}>
            <a href={ALBUM_URL} target="_blank" rel="noreferrer" aria-label="เปิดอัลบั้มใน Spotify"><ExternalLink /></a>
            {enabled && <button type="button" onClick={stopPlayer} aria-label="ปิดเพลง"><Power /></button>}
            {expanded && <button type="button" onClick={() => setExpanded(false)} aria-label="ย่อเครื่องเล่น"><X /></button>}
          </div>
        </div>

        {!enabled && <button type="button" className={styles.enableButton} onClick={startPlayer}><Music2 /> เปิดเครื่องเล่นเพลง</button>}
        {enabled && (
          <div className={styles.embedWrap} aria-hidden={!expanded}>
            <div ref={embedRef} className={styles.embedHost} />
            <p>ระบบเริ่มเล่นและวนอัลบั้มอัตโนมัติ · ควบคุมเสียงได้จาก Spotify player</p>
          </div>
        )}
      </aside>
    </>
  );
}
