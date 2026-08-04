'use client';

import { ExternalLink, Music2, Power, Radio, X } from 'lucide-react';
import { useState } from 'react';
import styles from './spotify-player.module.css';

const ALBUM_URL = 'https://open.spotify.com/album/5UBETmTHsqERFsbAz8zrpJ';
const EMBED_URL = 'https://open.spotify.com/embed/album/5UBETmTHsqERFsbAz8zrpJ?utm_source=generator&theme=0';

export function SpotifyPlayer() {
  const [enabled, setEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const startPlayer = () => {
    setEnabled(true);
    setExpanded(true);
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
          {enabled && <button type="button" onClick={() => { setEnabled(false); setExpanded(false); }} aria-label="ปิดเพลง"><Power /></button>}
          {expanded && <button type="button" onClick={() => setExpanded(false)} aria-label="ย่อเครื่องเล่น"><X /></button>}
        </div>
      </div>

      {!enabled && <button type="button" className={styles.enableButton} onClick={startPlayer}><Music2 /> เปิดเครื่องเล่นเพลง</button>}
      {enabled && (
        <div className={styles.embedWrap} aria-hidden={!expanded}>
          <iframe
            title="Spotify Embed: Practical Basketball Original Soundtrack"
            src={EMBED_URL}
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            tabIndex={expanded ? 0 : -1}
          />
          <p>เลือกเพลง เล่น/หยุด และปรับเสียงได้จาก Spotify player</p>
        </div>
      )}
    </aside>
  );
}
