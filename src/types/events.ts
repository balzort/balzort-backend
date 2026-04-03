// ─── Anchor Event Payloads (from IDL types section) ──────────────────────────

export interface PuzzleFinalizedEvent {
  player: string;
  puzzleBoard: string;
  puzzleStats: string;
  moveCount: number;
  undoCount: number;
  difficulty: number;
  timestamp: number;
}

export interface PuzzleAbandonedEvent {
  player: string;
  puzzleBoard: string;
  puzzleStats: string;
  moveCount: number;
  undoCount: number;
  difficulty: number;
  timestamp: number;
}

export interface PuzzleInitializedEvent {
  player: string;
  puzzleBoard: string;
  puzzleStats: string;
  numTubes: number;
  ballsPerTube: number;
  difficulty: number;
  timestamp: number;
}

export interface TournamentCreatedEvent {
  tournament: string;
  authority: string;
  entryFee: bigint;
  difficulty: number;
  endTime: number;
  treasuryFeeBps: number;
  timestamp: number;
}

export interface TournamentJoinedEvent {
  tournament: string;
  player: string;
  timestamp: number;
}

export interface TournamentClosedEvent {
  tournament: string;
  totalEntries: number;
  totalCompleters: number;
  prizePool: bigint;
  timestamp: number;
}

export interface TournamentResultRecordedEvent {
  tournament: string;
  player: string;
  weight: bigint;
  elapsedSecs: bigint;
  moveCount: number;
  timestamp: number;
}

export interface PrizeClaimedEvent {
  tournament: string;
  player: string;
  amount: bigint;
  timestamp: number;
}
