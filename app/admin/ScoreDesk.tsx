'use client';

import { useMemo, useState } from 'react';
import { formatGameDate } from '@/lib/utils';
import { updateGameResult } from './actions';
import { SubmitButton } from './SubmitButton';

type ScoreStatus = 'scheduled' | 'live' | 'final';

interface ScoreGame {
  id: string;
  scheduled_at: string;
  status: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
}

interface ScoreTeam {
  id: string;
  name: string;
  abbreviation: string;
}

interface ScoreDeskProps {
  games: ScoreGame[];
  teams: ScoreTeam[];
  canEdit: boolean;
}

function scoreStatus(value: string): ScoreStatus | null {
  const normalized = value.toLowerCase();
  return normalized === 'scheduled' || normalized === 'live' || normalized === 'final'
    ? normalized
    : null;
}

export function ScoreDesk({ games, teams, canEdit }: ScoreDeskProps) {
  const eligibleGames = useMemo(
    () => games.filter((game) => {
      const status = scoreStatus(game.status);
      return status === 'scheduled' || status === 'live' || (canEdit && status === 'final');
    }),
    [canEdit, games],
  );
  const [gameId, setGameId] = useState(eligibleGames[0]?.id ?? '');
  const selectedGame = eligibleGames.find((game) => game.id === gameId) ?? eligibleGames[0];
  const currentStatus = selectedGame ? scoreStatus(selectedGame.status) : null;
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const teamName = (id: string) => {
    const team = teamsById.get(id);
    return team?.abbreviation || team?.name || 'TBD';
  };

  if (!selectedGame || !currentStatus) return null;

  const targetStatus = currentStatus === 'live' ? null : 'live';
  const submitLabel = currentStatus === 'scheduled'
    ? 'Start live'
    : currentStatus === 'final'
      ? 'Reopen as live'
      : 'Save score';
  const guidance = currentStatus === 'scheduled'
    ? 'A scheduled game must be started as live before it can be finalized.'
    : currentStatus === 'final'
      ? 'Reopening preserves the entered score and returns the game to live for corrections.'
      : 'Update the live score, or choose Final after all player stat lines match the team totals.';

  return (
    <form
      key={selectedGame.id}
      action={updateGameResult}
      className="grid gap-4 md:grid-cols-[2fr_0.7fr_0.7fr_1fr_auto] md:items-end"
    >
      <label>
        <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">Game</span>
        <select
          name="game_id"
          required
          value={selectedGame.id}
          onChange={(event) => setGameId(event.target.value)}
          className="admin-input"
        >
          {eligibleGames.map((game) => (
            <option key={game.id} value={game.id}>
              {teamName(game.away_team_id)} @ {teamName(game.home_team_id)} · {formatGameDate(game.scheduled_at)} · {game.status}
            </option>
          ))}
        </select>
      </label>

      <ScoreInput label="Home" name="home_score" value={selectedGame.home_score ?? 0} />
      <ScoreInput label="Away" name="away_score" value={selectedGame.away_score ?? 0} />

      {currentStatus === 'live' ? (
        <label>
          <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">Status</span>
          <select name="status" defaultValue="live" className="admin-input">
            <option value="live">Live</option>
            <option value="final">Final</option>
          </select>
        </label>
      ) : (
        <div>
          <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">Next state</span>
          <div className="admin-input flex items-center">Live</div>
          <input type="hidden" name="status" value={targetStatus ?? 'live'} />
        </div>
      )}

      <SubmitButton>{submitLabel}</SubmitButton>
      <p className="text-xs leading-5 text-[var(--ink-faint)] md:col-span-5">{guidance}</p>
    </form>
  );
}

function ScoreInput({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <label>
      <span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">{label}</span>
      <input name={name} type="number" min="0" required defaultValue={value} className="admin-input" />
    </label>
  );
}
