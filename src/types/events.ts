// ─── Helius Enhanced Transaction ─────────────────────────────────────────────

export interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: unknown[];
}

export interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface HeliusInstruction {
  accounts: string[];
  data: string;
  programId: string;
  innerInstructions: unknown[];
}

export interface HeliusEnhancedTx {
  signature: string;
  slot: number;
  timestamp: number;
  fee: number;
  feePayer: string;
  computeUnitsConsumed: number;
  transactionError: unknown | null;
  type: string;
  source: string;
  accountData: HeliusAccountData[];
  nativeTransfers: HeliusNativeTransfer[];
  tokenTransfers: unknown[];
  instructions: HeliusInstruction[];
  innerInstructions: unknown[];
  events: Record<string, unknown>;
}

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
