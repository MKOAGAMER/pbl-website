export type TradeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type TradeRecord = {
  id: string;
  playerId: string;
  playerName: string;
  playerSlug: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamAbbreviation: string;
  toTeamId: string;
  toTeamName: string;
  toTeamAbbreviation: string;
  tradeDate: string;
  status: TradeStatus;
  notes: string;
  reviewNote: string;
  requestedAt: string;
  reviewedAt: string | null;
  isOwnRequest: boolean;
};

