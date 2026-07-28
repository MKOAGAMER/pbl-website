export const adminSuccessMessages = {
  'season-created': 'Season created. You can now add teams and schedule games.',
  'season-updated': 'Season status and visibility updated.',
  'team-created': 'Team created and added to the selected season.',
  'team-updated': 'Team profile updated.',
  'player-created': 'Player created and added to the selected roster.',
  'roster-assigned': 'Player added to the selected roster.',
  'game-created': 'Game scheduled.',
  'score-live': 'Live score updated.',
  'score-final': 'Final score saved.',
  'stats-saved': 'Player box score saved.',
  'story-published': 'Story published.',
  'story-drafted': 'Draft saved.',
  'role-updated': 'Staff role updated.',
} as const;

export const adminErrorMessages = {
  forbidden: 'You do not have permission for that action.',
  'invalid-season': 'Check the season fields and try again.',
  'invalid-team': 'Check the team fields and try again.',
  'invalid-player': 'Check the player fields and try again.',
  'invalid-roster': 'Check the roster selection and jersey number.',
  'invalid-game': 'Check the matchup, date and teams, then try again.',
  'same-team': 'Home and away teams must be different.',
  'invalid-result': 'Check the score and game status.',
  'start-before-final': 'Start a scheduled game as live before marking it final.',
  'final-reopen-forbidden': 'Only editors and administrators can reopen a final game as live.',
  'invalid-game-state': 'Postponed and cancelled games cannot be scored from the score desk.',
  'tied-final': 'A final basketball game cannot end in a tie.',
  'invalid-stats': 'Check the player stat line and try again.',
  'shooting-line': 'Made shots cannot exceed attempts, and three-pointers must be field goals.',
  'points-mismatch': 'Points do not match the entered shooting line.',
  'game-not-found': 'The selected game was not found or is not accessible.',
  'game-not-scoreable': 'Box scores can only be entered while a game is live. Reopen a final game before correcting it.',
  'roster-not-found': 'The player is not on a roster for this game season.',
  'wrong-game-team': 'The player is not assigned to either team in this game.',
  'invalid-story': 'Check the story fields and try again.',
  'invalid-role': 'Check the account role and managed team.',
  'database-write': 'Supabase could not save the change. Check for duplicates or conflicting data and try again.',
} as const;

export type AdminSuccessCode = keyof typeof adminSuccessMessages;
export type AdminErrorCode = keyof typeof adminErrorMessages;

export function getAdminSuccess(code: string | undefined) {
  return code && code in adminSuccessMessages
    ? adminSuccessMessages[code as AdminSuccessCode]
    : null;
}

export function getAdminError(code: string | undefined) {
  return code && code in adminErrorMessages
    ? adminErrorMessages[code as AdminErrorCode]
    : null;
}
