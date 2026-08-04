'use client';

import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Gamepad2,
  Hand,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Search,
  Target,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  challengePool,
  deviceButtons,
  entriesForScheme,
  handLabel,
  isAmbiguous,
  parseMoveTokens,
} from './control-utils';
import type { ControlData, ControlSchemeId, MoveEntry } from './types';
import styles from './control-lab.module.css';

const ControlScene = dynamic(() => import('./ControlScene'), {
  ssr: false,
  loading: () => (
    <div className={styles.sceneLoading}>
      <span />
      กำลังประกอบโมเดล 3D…
    </div>
  ),
});

type ChallengePhase = 'browse' | 'setup' | 'countdown' | 'playing' | 'results';
type ChallengeKind = 'practice' | 'timeAttack';
type Difficulty = 'easy' | 'hard';

type Feedback = {
  type: 'correct' | 'wrong';
  message: string;
  points?: number;
};

type LeaderboardEntry = {
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  accuracy: number;
  bestStreak: number;
  averageResponseMs: number;
  correct: number;
  wrong: number;
  playedAt: string;
};

type ChallengeSession = {
  phase: ChallengePhase;
  pool: MoveEntry[];
  current: MoveEntry | null;
  expected: string[];
  inputIndex: number;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  completed: number;
  responseTimes: number[];
  mistakes: Record<string, number>;
  timeLeft: number;
  countdown: number;
  feedback: Feedback | null;
  paused: boolean;
  lastWrong: string | null;
};

const initialSession: ChallengeSession = {
  phase: 'browse',
  pool: [],
  current: null,
  expected: [],
  inputIndex: 0,
  score: 0,
  correct: 0,
  wrong: 0,
  streak: 0,
  bestStreak: 0,
  completed: 0,
  responseTimes: [],
  mistakes: {},
  timeLeft: 60,
  countdown: 3,
  feedback: null,
  paused: false,
  lastWrong: null,
};

function randomEntry(pool: MoveEntry[], previousId?: string) {
  if (pool.length === 1) return pool[0];
  const choices = previousId ? pool.filter((entry) => entry.id !== previousId) : pool;
  return choices[Math.floor(Math.random() * choices.length)] ?? pool[0];
}

function eventToken(event: KeyboardEvent) {
  if (event.key === ' ') return 'Space';
  if (event.key === 'Shift') return 'Shift';
  if (/^Digit[1-4]$/.test(event.code)) return event.code.slice(-1);
  if (/^[a-z]$/i.test(event.key)) return event.key.toUpperCase();
  return null;
}

function accuracy(correct: number, wrong: number) {
  const attempts = correct + wrong;
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function ControlLab({ data }: { data: ControlData }) {
  const firstScheme = data.control_schemes[0];
  const firstEntries = entriesForScheme(firstScheme);
  const [schemeId, setSchemeId] = useState<ControlSchemeId>(firstScheme.id);
  const [categoryName, setCategoryName] = useState(firstScheme.categories[0].category);
  const [selectedEntry, setSelectedEntry] = useState<MoveEntry>(firstEntries[0]);
  const [query, setQuery] = useState('');
  const [autoPreview, setAutoPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<'moves' | 'model'>('moves');

  const [session, setSession] = useState<ChallengeSession>(initialSession);
  const [challengeKind, setChallengeKind] = useState<ChallengeKind>('practice');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [challengeCategory, setChallengeCategory] = useState(categoryName);
  const [practiceCount, setPracticeCount] = useState(10);
  const [attackDuration, setAttackDuration] = useState(60);
  const [retryOnError, setRetryOnError] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [highScore, setHighScore] = useState(0);
  const [recordToBeat, setRecordToBeat] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'saving' | 'saved' | 'login' | 'error'>('idle');

  const questionStartedAt = useRef(0);
  const pauseStartedAt = useRef(0);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitInputRef = useRef<(token: string) => void>(() => undefined);
  const submittedSessionRef = useRef<string | null>(null);

  const activeScheme = useMemo(
    () => data.control_schemes.find((scheme) => scheme.id === schemeId) ?? firstScheme,
    [data.control_schemes, firstScheme, schemeId],
  );
  const allEntries = useMemo(() => entriesForScheme(activeScheme), [activeScheme]);
  const categoryEntries = useMemo(
    () => allEntries.filter((entry) => entry.category === categoryName),
    [allEntries, categoryName],
  );
  const shownEntries = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return categoryEntries;
    return allEntries.filter((entry) =>
      `${entry.move.name} ${entry.move.keys} ${entry.category}`.toLocaleLowerCase().includes(needle),
    );
  }, [allEntries, categoryEntries, query]);
  const selectedTokens = useMemo(
    () => parseMoveTokens(selectedEntry.move.keys, schemeId),
    [schemeId, selectedEntry],
  );

  const moveCount = useMemo(
    () => data.control_schemes.reduce((sum, scheme) => sum + entriesForScheme(scheme).length, 0),
    [data.control_schemes],
  );

  const clearTransition = useCallback(() => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
  }, []);

  useEffect(() => clearTransition, [clearTransition]);

  const chooseEntry = useCallback((entry: MoveEntry) => {
    setSelectedEntry(entry);
    setPreviewIndex(0);
    setPreviewPlaying(true);
  }, []);

  const chooseScheme = (nextId: ControlSchemeId) => {
    const nextScheme = data.control_schemes.find((scheme) => scheme.id === nextId);
    if (!nextScheme) return;
    const nextCategory = nextScheme.categories[0].category;
    const nextEntry = entriesForScheme(nextScheme)[0];
    setSchemeId(nextId);
    setCategoryName(nextCategory);
    setChallengeCategory(nextCategory);
    setQuery('');
    chooseEntry(nextEntry);
  };

  const chooseCategory = (nextCategory: string) => {
    const nextEntry = allEntries.find((entry) => entry.category === nextCategory);
    if (!nextEntry) return;
    setCategoryName(nextCategory);
    setChallengeCategory(nextCategory);
    setQuery('');
    chooseEntry(nextEntry);
  };

  useEffect(() => {
    if (session.phase !== 'browse' || !previewPlaying || selectedTokens.length < 2) return;
    const timer = window.setTimeout(() => {
      setPreviewIndex((current) => {
        if (current >= selectedTokens.length - 1) {
          setPreviewPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 680);
    return () => window.clearTimeout(timer);
  }, [previewIndex, previewPlaying, selectedTokens.length, session.phase]);

  useEffect(() => {
    if (!autoPreview || session.phase !== 'browse' || query) return;
    const timer = window.setInterval(() => {
      setSelectedEntry((current) => {
        const index = categoryEntries.findIndex((entry) => entry.id === current.id);
        const next = categoryEntries[(index + 1 + categoryEntries.length) % categoryEntries.length];
        if (next) {
          setPreviewIndex(0);
          setPreviewPlaying(true);
          return next;
        }
        return current;
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [autoPreview, categoryEntries, query, session.phase]);

  const highScoreKey = `pbal-control-lab:${schemeId}:${challengeCategory}`;

  useEffect(() => {
    const value = Number(window.localStorage.getItem(highScoreKey) ?? 0);
    queueMicrotask(() => setHighScore(Number.isFinite(value) ? value : 0));
  }, [highScoreKey]);

  useEffect(() => {
    if (session.phase !== 'results' || session.score <= highScore) return;
    window.localStorage.setItem(highScoreKey, String(session.score));
    queueMicrotask(() => setHighScore(session.score));
  }, [highScore, highScoreKey, session.phase, session.score]);

  const leaderboardKey = `${schemeId}:${challengeCategory}:${challengeKind}`;

  useEffect(() => {
    if (session.phase !== 'setup' && session.phase !== 'results') return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      schemeId,
      category: challengeCategory,
      mode: challengeKind,
      limit: '10',
    });
    queueMicrotask(() => setLeaderboardLoading(true));
    fetch(`/api/controls/leaderboard?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('leaderboard request failed');
        return response.json() as Promise<{ entries?: LeaderboardEntry[] }>;
      })
      .then((result) => setLeaderboard(result.entries ?? []))
      .catch(() => {
        if (!controller.signal.aborted) setLeaderboard([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLeaderboardLoading(false);
      });
    return () => controller.abort();
  }, [challengeCategory, challengeKind, leaderboardKey, schemeId, session.phase]);

  useEffect(() => {
    if (session.phase !== 'results' || session.score <= 0 || !session.current) return;
    const submissionKey = `${session.score}:${session.correct}:${session.wrong}:${schemeId}:${challengeCategory}:${challengeKind}`;
    if (submittedSessionRef.current === submissionKey) return;
    submittedSessionRef.current = submissionKey;
    setSubmissionStatus('saving');
    const payload = {
      schemeId,
      category: challengeCategory,
      mode: challengeKind,
      score: session.score,
      accuracy: accuracy(session.correct, session.wrong),
      bestStreak: session.bestStreak,
      averageResponseMs: Math.round(average(session.responseTimes) * 1000),
      correct: session.correct,
      wrong: session.wrong,
    };
    fetch('/api/controls/leaderboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (response.status === 401) {
          setSubmissionStatus('login');
          return null;
        }
        if (!response.ok) throw new Error('score submission failed');
        return response.json() as Promise<{ saved?: boolean }>;
      })
      .then((result) => {
        if (!result) return;
        setSubmissionStatus(result.saved ? 'saved' : 'idle');
        const params = new URLSearchParams({ schemeId, category: challengeCategory, mode: challengeKind, limit: '10' });
        return fetch(`/api/controls/leaderboard?${params.toString()}`).then((response) => response.json() as Promise<{ entries?: LeaderboardEntry[] }>);
      })
      .then((result) => {
        if (result?.entries) setLeaderboard(result.entries);
      })
      .catch(() => setSubmissionStatus('error'));
  }, [challengeCategory, challengeKind, schemeId, session]);

  const playTone = useCallback((kind: 'correct' | 'wrong') => {
    if (!soundOn) return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'correct' ? 'sine' : 'square';
    oscillator.frequency.setValueAtTime(kind === 'correct' ? 720 : 150, context.currentTime);
    if (kind === 'correct') oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.11);
    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
    oscillator.addEventListener('ended', () => void context.close());
  }, [soundOn]);

  const startChallenge = useCallback(() => {
    clearTransition();
    const pool = challengePool(activeScheme, challengeCategory);
    if (!pool.length) return;
    const current = randomEntry(pool);
    setAutoPreview(false);
    setRecordToBeat(highScore);
    setSubmissionStatus('idle');
    setSession({
      ...initialSession,
      phase: 'countdown',
      pool,
      current,
      expected: parseMoveTokens(current.move.keys, schemeId),
      timeLeft: challengeKind === 'timeAttack' ? attackDuration : 0,
    });
  }, [activeScheme, attackDuration, challengeCategory, challengeKind, clearTransition, highScore, schemeId]);

  useEffect(() => {
    if (session.phase !== 'countdown') return;
    const timer = window.setTimeout(() => {
      if (session.countdown > 1) {
        setSession((current) => ({ ...current, countdown: current.countdown - 1 }));
      } else {
        questionStartedAt.current = performance.now();
        setSession((current) => ({ ...current, phase: 'playing', countdown: 0 }));
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [session.countdown, session.phase]);

  useEffect(() => {
    if (session.phase !== 'playing' || challengeKind !== 'timeAttack' || session.paused) return;
    const timer = window.setInterval(() => {
      setSession((current) => {
        if (current.phase !== 'playing') return current;
        const nextTime = Math.max(0, current.timeLeft - 0.1);
        return nextTime === 0 ? { ...current, timeLeft: 0, phase: 'results', feedback: null } : { ...current, timeLeft: nextTime };
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [challengeKind, session.paused, session.phase]);

  const advanceQuestion = useCallback(() => {
    setSession((current) => {
      if (current.phase !== 'playing') return current;
      const next = randomEntry(current.pool, current.current?.id);
      questionStartedAt.current = performance.now();
      return {
        ...current,
        current: next,
        expected: parseMoveTokens(next.move.keys, schemeId),
        inputIndex: 0,
        feedback: null,
        lastWrong: null,
      };
    });
  }, [schemeId]);

  const submitInput = (token: string) => {
    if (session.phase !== 'playing' || session.paused || session.feedback || !session.current) return;
    const expected = session.expected[session.inputIndex];
    if (token === expected) {
      if (session.inputIndex < session.expected.length - 1) {
        setSession((current) => ({ ...current, inputIndex: current.inputIndex + 1, lastWrong: null }));
        return;
      }

      const elapsed = Math.max(0.05, (performance.now() - questionStartedAt.current) / 1000);
      const speedMultiplier = elapsed <= 1 ? 2 : elapsed <= 2 ? 1.5 : 1;
      const nextStreak = session.streak + 1;
      const streakMultiplier = nextStreak >= 5 ? 1 + Math.floor(nextStreak / 5) * 0.25 : 1;
      const points = Math.round(100 * speedMultiplier * streakMultiplier);
      const completed = session.completed + 1;
      const shouldFinish = challengeKind === 'practice' && completed >= practiceCount;
      playTone('correct');
      setSession((current) => ({
        ...current,
        phase: shouldFinish ? 'results' : current.phase,
        score: current.score + points,
        correct: current.correct + 1,
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
        completed,
        responseTimes: [...current.responseTimes, elapsed],
        inputIndex: current.expected.length,
        feedback: shouldFinish ? null : {
          type: 'correct',
          message: nextStreak >= 5 && nextStreak % 5 === 0 ? `🔥 ${nextStreak} Streak!` : '✅ ถูกต้อง!',
          points,
        },
      }));
      if (!shouldFinish) {
        clearTransition();
        transitionTimer.current = setTimeout(advanceQuestion, 760);
      }
      return;
    }

    playTone('wrong');
    const completed = retryOnError ? session.completed : session.completed + 1;
    const shouldFinish = challengeKind === 'practice' && !retryOnError && completed >= practiceCount;
    setSession((current) => ({
      ...current,
      phase: shouldFinish ? 'results' : current.phase,
      wrong: current.wrong + 1,
      streak: 0,
      completed,
      mistakes: { ...current.mistakes, [current.current!.id]: (current.mistakes[current.current!.id] ?? 0) + 1 },
      inputIndex: retryOnError ? 0 : current.inputIndex,
      feedback: shouldFinish ? null : { type: 'wrong', message: retryOnError ? '❌ ผิด — ลองท่าเดิมอีกครั้ง' : '❌ ผิด — ไปท่าถัดไป' },
      lastWrong: token,
    }));
    if (!shouldFinish) {
      clearTransition();
      transitionTimer.current = setTimeout(() => {
        if (retryOnError) {
          setSession((current) => ({ ...current, feedback: null, lastWrong: null, inputIndex: 0 }));
        } else {
          advanceQuestion();
        }
      }, 720);
    }
  };

  useEffect(() => {
    submitInputRef.current = submitInput;
  });

  useEffect(() => {
    if (schemeId !== 'keyboard_pc' || session.phase !== 'playing') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const token = eventToken(event);
      if (!token) return;
      event.preventDefault();
      submitInputRef.current(token);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [schemeId, session.phase]);

  const togglePause = () => {
    if (session.phase !== 'playing') return;
    if (!session.paused) {
      pauseStartedAt.current = performance.now();
    } else {
      questionStartedAt.current += performance.now() - pauseStartedAt.current;
    }
    setSession((current) => ({ ...current, paused: !current.paused }));
  };

  const returnToBrowse = () => {
    clearTransition();
    setSession((current) => ({ ...current, phase: 'browse', feedback: null, paused: false }));
  };

  const missedEntries = useMemo(
    () => Object.entries(session.mistakes)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ entry: allEntries.find((item) => item.id === id) ?? session.pool.find((item) => item.id === id), count }))
      .filter((item): item is { entry: MoveEntry; count: number } => Boolean(item.entry)),
    [allEntries, session.mistakes, session.pool],
  );

  const reviewMistake = () => {
    const first = missedEntries[0]?.entry;
    if (first) {
      setCategoryName(first.category);
      chooseEntry(first);
    }
    returnToBrowse();
  };

  const modelActiveTokens = useMemo(() => {
    if (session.phase === 'playing' || session.phase === 'countdown') {
      if (difficulty === 'hard') return [];
      return session.expected[session.inputIndex] ? [session.expected[session.inputIndex]] : [];
    }
    return selectedTokens[previewIndex] ? [selectedTokens[previewIndex]] : [];
  }, [difficulty, previewIndex, selectedTokens, session.expected, session.inputIndex, session.phase]);

  const model = (
    <div className={styles.sceneWrap}>
      <div className={styles.sceneTopline}>
        <span><span className={styles.liveDot} /> LIVE INPUT MODEL</span>
        <span>ลากเพื่อหมุน · เลื่อนเพื่อซูม</span>
      </div>
      <ControlScene
        schemeId={schemeId}
        activeTokens={modelActiveTokens}
        wrongToken={session.lastWrong}
        mutedHints={session.phase === 'playing' && difficulty === 'hard'}
      />
      <div className={styles.courtGlow} />
    </div>
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><span>PBAL TRAINING SYSTEM</span><span className={styles.version}>V2.8</span></p>
          <h1>CONTROL <em>LAB</em></h1>
          <p className={styles.subtitle}>เห็นทุกคอมโบ · จำทุกจังหวะ · กดให้เร็วกว่าเดิม</p>
        </div>
        <div className={styles.heroStats}>
          <span><strong>{moveCount}</strong> MOVES</span>
          <span><strong>3</strong> SCHEMES</span>
          <span><strong>3D</strong> LIVE</span>
        </div>
      </section>

      {session.phase === 'browse' && (
        <>
          <section className={styles.toolbar} aria-label="เลือกชุดควบคุมและหมวดท่า">
            <div className={styles.schemePicker}>
              {data.control_schemes.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  className={scheme.id === schemeId ? styles.schemeActive : ''}
                  onClick={() => chooseScheme(scheme.id)}
                  aria-pressed={scheme.id === schemeId}
                >
                  {scheme.id === 'keyboard_pc' ? <Keyboard /> : <Gamepad2 />}
                  <span>
                    <small>{scheme.id === 'keyboard_pc' ? 'DESKTOP' : scheme.id === 'controller_dpad' ? 'CLASSIC' : 'ALTERNATE'}</small>
                    {scheme.id === 'keyboard_pc' ? 'Keyboard PC' : scheme.id === 'controller_dpad' ? 'Controller · D-Pad' : 'Controller · Right Stick'}
                  </span>
                </button>
              ))}
            </div>
            <button type="button" className={styles.challengeButton} onClick={() => setSession((current) => ({ ...current, phase: 'setup' }))}>
              <Target /> เริ่มทดสอบ <span>CHALLENGE</span>
            </button>
          </section>

          <nav className={styles.categories} aria-label="หมวดท่า">
            {activeScheme.categories.map((category, index) => (
              <button
                key={category.category}
                type="button"
                className={category.category === categoryName ? styles.categoryActive : ''}
                onClick={() => chooseCategory(category.category)}
              >
                <span>0{index + 1}</span>
                {category.category.replace('Dribble Moves - ', '').replace(' (Triple Threat only)', '')}
                <small>{category.moves.length}</small>
              </button>
            ))}
          </nav>

          <div className={styles.mobileTabs}>
            <button type="button" className={mobilePanel === 'moves' ? styles.mobileTabActive : ''} onClick={() => setMobilePanel('moves')}>รายการท่า</button>
            <button type="button" className={mobilePanel === 'model' ? styles.mobileTabActive : ''} onClick={() => setMobilePanel('model')}>โมเดล 3D</button>
          </div>

          <section className={styles.workspace}>
            <div className={`${styles.movePanel} ${mobilePanel === 'moves' ? styles.mobileVisible : ''}`}>
              <div className={styles.panelHeader}>
                <div>
                  <span>MOVE DATABASE</span>
                  <h2>{query ? 'ผลการค้นหา' : categoryName}</h2>
                </div>
                <strong>{shownEntries.length.toString().padStart(2, '0')}</strong>
              </div>
              <label className={styles.searchBox}>
                <Search />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อท่า ปุ่ม หรือหมวด…" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="ล้างการค้นหา"><X /></button>}
              </label>
              <div className={styles.moveList}>
                {shownEntries.map((entry, index) => {
                  const active = entry.id === selectedEntry.id;
                  const ambiguous = isAmbiguous(entry.move);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`${styles.moveCard} ${active ? styles.moveActive : ''}`}
                      onClick={() => chooseEntry(entry)}
                      onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') chooseEntry(entry);
                      }}
                      onFocus={() => chooseEntry(entry)}
                    >
                      <span className={styles.moveNumber}>{(index + 1).toString().padStart(2, '0')}</span>
                      <span className={styles.moveInfo}>
                        {query && <small className={styles.categoryBadge}>{entry.category}</small>}
                        <strong>{entry.move.name}</strong>
                        <span className={styles.handLine}><Hand /> {handLabel(entry.move.hand)}</span>
                        {entry.move.notes && <small className={styles.moveNote}>{entry.move.notes}</small>}
                      </span>
                      <span className={styles.cardKeys}>{entry.move.keys}</span>
                      {ambiguous && <span className={styles.warningBadge} title="ข้อมูลต้นฉบับมีความกำกวม"><AlertTriangle /> SOURCE</span>}
                    </button>
                  );
                })}
                {!shownEntries.length && <div className={styles.empty}>ไม่พบท่าที่ตรงกับ “{query}”</div>}
              </div>
            </div>

            <div className={`${styles.previewPanel} ${mobilePanel === 'model' ? styles.mobileVisible : ''}`}>
              {model}
              <div className={styles.comboPanel}>
                <div className={styles.comboHeading}>
                  <div>
                    <span>NOW PREVIEWING</span>
                    <h2>{selectedEntry.move.name}</h2>
                    <p>{handLabel(selectedEntry.move.hand)} · {selectedEntry.category}</p>
                  </div>
                  <button type="button" onClick={() => { setPreviewIndex(0); setPreviewPlaying(true); }}><RotateCcw /> เล่นซ้ำ</button>
                </div>
                <ComboBar tokens={selectedTokens} progress={previewIndex} />
                <div className={styles.previewFooter}>
                  <div className={styles.sourceCombo}><small>SOURCE COMBO</small><strong>{selectedEntry.move.keys}</strong></div>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={autoPreview} onChange={(event) => setAutoPreview(event.target.checked)} />
                    <span />
                    Auto Preview
                  </label>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {session.phase === 'setup' && (
        <section className={styles.setupShell}>
          <button type="button" className={styles.backButton} onClick={returnToBrowse}><ArrowLeft /> กลับไปดูท่า</button>
          <div className={styles.setupGrid}>
            <div className={styles.setupIntro}>
              <span className={styles.modeNumber}>01</span>
              <p>CHALLENGE MODE</p>
              <h2>พร้อมวัด<br /><em>ความแม่น</em><br />หรือยัง?</h2>
              <p className={styles.setupCopy}>ระบบจะสุ่มชื่อท่าให้คุณกดคอมโบตามลำดับ ท่าที่ข้อมูลต้นฉบับกำกวมจะไม่ถูกนำมาทดสอบ</p>
              <div className={styles.highScore}><Trophy /><span>สถิติสูงสุดของคุณ<strong>{highScore.toLocaleString()} PTS</strong></span></div>
            </div>
            <div className={styles.settingsCard}>
              <SettingGroup number="01" title="รูปแบบการเล่น">
                <div className={styles.optionGrid}>
                  <OptionButton active={challengeKind === 'practice'} onClick={() => setChallengeKind('practice')} icon={<Target />} title="Practice" detail="10–20 ท่า · ไม่จับเวลารวม" />
                  <OptionButton active={challengeKind === 'timeAttack'} onClick={() => setChallengeKind('timeAttack')} icon={<Timer />} title="Time Attack" detail="ทำคะแนนให้มากที่สุด" />
                </div>
              </SettingGroup>
              <SettingGroup number="02" title="ขอบเขตโจทย์">
                <label className={styles.selectLabel}>CONTROL SCHEME
                  <select value={schemeId} onChange={(event) => chooseScheme(event.target.value as ControlSchemeId)}>
                    {data.control_schemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.label}</option>)}
                  </select>
                </label>
                <label className={styles.selectLabel}>CATEGORY
                  <select value={challengeCategory} onChange={(event) => setChallengeCategory(event.target.value)}>
                    <option value="all">ทุกหมวดคละกัน</option>
                    {activeScheme.categories.map((category) => <option key={category.category} value={category.category}>{category.category}</option>)}
                  </select>
                </label>
              </SettingGroup>
              <SettingGroup number="03" title="ความยาก">
                <div className={styles.segmented}>
                  <button type="button" className={difficulty === 'easy' ? styles.segmentActive : ''} onClick={() => setDifficulty('easy')}>EASY <small>มีคำใบ้บนโมเดล</small></button>
                  <button type="button" className={difficulty === 'hard' ? styles.segmentActive : ''} onClick={() => setDifficulty('hard')}>HARD <small>จำคอมโบเอง</small></button>
                </div>
              </SettingGroup>
              <SettingGroup number="04" title={challengeKind === 'practice' ? 'จำนวนท่า' : 'เวลารวม'}>
                <div className={styles.pillOptions}>
                  {(challengeKind === 'practice' ? [10, 20] : [60, 90]).map((value) => {
                    const active = challengeKind === 'practice' ? practiceCount === value : attackDuration === value;
                    return <button key={value} type="button" className={active ? styles.pillActive : ''} onClick={() => challengeKind === 'practice' ? setPracticeCount(value) : setAttackDuration(value)}>{value} {challengeKind === 'practice' ? 'ท่า' : 'วินาที'}</button>;
                  })}
                </div>
                <div className={styles.settingToggles}>
                  <label><input type="checkbox" checked={retryOnError} onChange={(event) => setRetryOnError(event.target.checked)} /><span /> ผิดแล้วลองท่าเดิม</label>
                  <button type="button" onClick={() => setSoundOn((value) => !value)}>{soundOn ? <Volume2 /> : <VolumeX />} เสียง {soundOn ? 'เปิด' : 'ปิด'}</button>
                </div>
              </SettingGroup>
              <LeaderboardPreview entries={leaderboard} loading={leaderboardLoading} />
              <button type="button" className={styles.startButton} onClick={startChallenge}><Play /> เริ่มทดสอบ <span>3 · 2 · 1</span></button>
            </div>
          </div>
        </section>
      )}

      {(session.phase === 'countdown' || session.phase === 'playing') && session.current && (
        <section className={styles.challengeShell}>
          <div className={styles.challengeTopbar}>
            <button type="button" onClick={returnToBrowse}><ArrowLeft /> ออกจากโหมด</button>
            <div className={styles.liveStats}>
              <span><small>SCORE</small><strong>{session.score.toLocaleString()}</strong></span>
              <span><small>ACCURACY</small><strong>{accuracy(session.correct, session.wrong)}%</strong></span>
              <span><small>STREAK</small><strong className={session.streak >= 5 ? styles.hot : ''}>{session.streak}×</strong></span>
              {challengeKind === 'timeAttack' && <span><small>TIME</small><strong>{session.timeLeft.toFixed(1)}</strong></span>}
            </div>
            <div className={styles.playControls}>
              <button type="button" onClick={() => setSoundOn((value) => !value)} aria-label="เปิดหรือปิดเสียง">{soundOn ? <Volume2 /> : <VolumeX />}</button>
              <button type="button" onClick={togglePause} aria-label="หยุดชั่วคราว">{session.paused ? <Play /> : <Pause />}</button>
            </div>
          </div>
          <div className={styles.challengeGrid}>
            <div className={styles.questionCard}>
              <div className={styles.questionMeta}><span>MOVE {(session.completed + 1).toString().padStart(2, '0')}</span><span>{session.current.category}</span></div>
              <p>กดคอมโบของท่านี้</p>
              <h2>{session.current.move.name}</h2>
              <div className={styles.handChip}><Hand /> {handLabel(session.current.move.hand)}</div>
              {difficulty === 'easy' && <p className={styles.easyHint}>EASY HINT · ดูปุ่มสีส้มบนโมเดล</p>}
              {difficulty === 'hard' && <p className={styles.hardHint}>HARD MODE · ไม่มีคำใบ้</p>}
              <ComboBar tokens={session.expected} progress={session.inputIndex} concealed={difficulty === 'hard'} />
              {schemeId !== 'keyboard_pc' && (
                <div className={styles.virtualButtons}>
                  {deviceButtons(schemeId).map((token) => (
                    <button key={token} type="button" onClick={() => submitInput(token)}>{token}</button>
                  ))}
                </div>
              )}
              {schemeId === 'keyboard_pc' && <p className={styles.keyboardNotice}><Keyboard /> กดปุ่มจริงบนคีย์บอร์ดได้เลย</p>}
              {session.feedback && <div className={`${styles.feedback} ${session.feedback.type === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}`}>{session.feedback.message}{session.feedback.points ? <strong>+{session.feedback.points}</strong> : null}</div>}
            </div>
            <div className={styles.challengeModel}>{model}</div>
          </div>
          {session.phase === 'countdown' && <div className={styles.countdown}><small>GET READY</small><strong>{session.countdown}</strong></div>}
          {session.paused && <div className={styles.pauseOverlay}><Pause /><strong>PAUSED</strong><button type="button" onClick={togglePause}>เล่นต่อ</button></div>}
        </section>
      )}

      {session.phase === 'results' && (
        <section className={styles.resultsShell}>
          <div className={styles.resultBurst}><Trophy /></div>
          <p>SESSION COMPLETE</p>
          <h2>{session.score.toLocaleString()} <small>PTS</small></h2>
          {session.score > recordToBeat && <div className={styles.newRecord}>NEW PERSONAL BEST</div>}
          <div className={styles.resultStats}>
            <span><small>ACCURACY</small><strong>{accuracy(session.correct, session.wrong)}%</strong><em>{session.correct} ถูก · {session.wrong} ผิด</em></span>
            <span><small>BEST STREAK</small><strong>{session.bestStreak}×</strong><em>คอมโบต่อเนื่อง</em></span>
            <span><small>AVG. RESPONSE</small><strong>{average(session.responseTimes).toFixed(2)}s</strong><em>ต่อท่าที่ตอบถูก</em></span>
          </div>
          <div className={styles.missedPanel}>
            <div><span>จุดที่ควรซ้อมต่อ</span><strong>{missedEntries.length ? missedEntries[0].entry.move.name : 'ยอดเยี่ยม — ไม่มีท่าที่พลาด'}</strong></div>
            {missedEntries.slice(0, 3).map(({ entry, count }) => <span key={entry.id}>{entry.move.name}<strong>{count}×</strong></span>)}
          </div>
          <LeaderboardPreview entries={leaderboard} loading={leaderboardLoading} highlightScore={session.score} submissionStatus={submissionStatus} />
          <div className={styles.resultActions}>
            <button type="button" onClick={startChallenge}><RotateCcw /> เล่นอีกครั้ง</button>
            <button type="button" className={styles.reviewButton} onClick={reviewMistake}><Target /> {missedEntries.length ? 'ย้อนดูท่าที่พลาด' : 'กลับไปดูรายการท่า'}</button>
          </div>
        </section>
      )}
    </div>
  );
}

function ComboBar({ tokens, progress, concealed = false }: { tokens: string[]; progress: number; concealed?: boolean }) {
  const visibleTokens = tokens.length ? tokens : ['—'];
  return (
    <div className={styles.comboBar}>
      <div className={styles.comboKeys}>
        {visibleTokens.map((token, index) => (
          <span key={`${token}-${index}`} className={`${index < progress ? styles.keyDone : ''} ${index === progress ? styles.keyCurrent : ''}`}>
            {index < progress ? <Check /> : concealed ? '?' : token}
          </span>
        ))}
      </div>
      <div className={styles.progressTrack}><span style={{ width: `${Math.min(100, (progress / Math.max(visibleTokens.length, 1)) * 100)}%` }} /></div>
      <small>STEP {Math.min(progress + 1, visibleTokens.length)} / {visibleTokens.length}</small>
    </div>
  );
}

function SettingGroup({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.settingGroup}>
      <div className={styles.settingTitle}><span>{number}</span><strong>{title}</strong></div>
      {children}
    </div>
  );
}

function OptionButton({ active, onClick, icon, title, detail }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; detail: string }) {
  return (
    <button type="button" className={`${styles.optionButton} ${active ? styles.optionActive : ''}`} onClick={onClick}>
      {icon}<span><strong>{title}</strong><small>{detail}</small></span>{active && <Check />}
    </button>
  );
}

function LeaderboardPreview({
  entries,
  loading,
  highlightScore,
  submissionStatus = 'idle',
}: {
  entries: LeaderboardEntry[];
  loading: boolean;
  highlightScore?: number;
  submissionStatus?: 'idle' | 'saving' | 'saved' | 'login' | 'error';
}) {
  return (
    <div className={styles.leaderboardPreview}>
      <div className={styles.leaderboardHeader}><span><Trophy /> TOP PLAYERS</span><small>{submissionStatus === 'saving' ? 'กำลังบันทึก…' : submissionStatus === 'saved' ? 'บันทึกขึ้นอันดับแล้ว' : submissionStatus === 'login' ? 'เข้าสู่ระบบเพื่อขึ้นอันดับ' : submissionStatus === 'error' ? 'บันทึกไม่สำเร็จ' : 'ONLINE BOARD'}</small></div>
      {loading && <div className={styles.leaderboardEmpty}>กำลังโหลดอันดับ…</div>}
      {!loading && !entries.length && <div className={styles.leaderboardEmpty}>ยังไม่มีสถิติออนไลน์ — เป็นคนแรกที่ขึ้นอันดับ</div>}
      {!loading && entries.length > 0 && (
        <div className={styles.leaderboardRows}>
          {entries.slice(0, 5).map((entry) => (
            <div key={`${entry.rank}-${entry.username}`} className={`${styles.leaderboardRow} ${highlightScore === entry.score ? styles.leaderboardYou : ''}`}>
              <strong className={styles.rankNumber}>{entry.rank.toString().padStart(2, '0')}</strong>
              <span className={styles.playerName}>{entry.username}</span>
              <span className={styles.playerStats}>{entry.accuracy}% · {entry.bestStreak}×</span>
              <strong className={styles.playerScore}>{entry.score.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
