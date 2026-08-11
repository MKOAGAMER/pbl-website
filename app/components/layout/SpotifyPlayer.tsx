'use client';

import { ExternalLink, Music2, Power, Radio, X } from 'lucide-react';
import { useState } from 'react';
import styles from './spotify-player.module.css';

const ALBUM_URL = 'https://open.spotify.com/album/5UBETmTHsqERFsbAz8zrpJ';
const EMBED_URL = 'https://open.spotify.com/embed/album/5UBETmTHsqERFsbAz8zrpJ?utm_source=generator&theme=0&autoplay=1';

export function SpotifyPlayer() {
  const [enabled, setEnabled] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const startPlayer = () => {
    setEnabled(true);
    setExpanded(true);
  };

  const stopPlayer = () => {
    setEnabled(false);
    setExpanded(false);
  };

  return (
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
          <iframe
            title="Practical Basketball OST on Spotify"
            src={EMBED_URL}
            width="100%"
            height="352"
            loading="eager"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
          <p>Spotify จะเล่นต่อเนื่องตามลำดับอัลบั้ม · หากเบราว์เซอร์บล็อกเสียงอัตโนมัติ ให้กด Play หนึ่งครั้ง</p>
        </div>
      )}
    </aside>
  );
}
