import { PublicKey } from "@solana/web3.js";


export const PROGRAM_ID = new PublicKey(
  "7F8bQvi3ppn4i7APswRX23hUFuq41dtkguy8aWLLtic8"
);


export const SEEDS = {
  GAME: Buffer.from("game"),
  PLAYER: Buffer.from("player"),
  PUZZLE_BOARD: Buffer.from("puzzle_board"),
  PUZZLE_STATS: Buffer.from("puzzle_stats"),
  TOURNAMENT: Buffer.from("tournament"),
  TOURNAMENT_ENTRY: Buffer.from("tournament_entry"),
  TOURNAMENT_VAULT: Buffer.from("tournament_vault"),
} as const;


export const PUZZLE_STATUS = {
  INITIALIZED: 0,
  BOARD_READY: 1,
  STARTED: 2,
  SOLVED: 3,
  FINALIZED: 4,
  ABANDONED: 5,
} as const;

export type PuzzleStatus = (typeof PUZZLE_STATUS)[keyof typeof PUZZLE_STATUS];


export const DIFFICULTY = {
  0: "easy",
  1: "medium",
  2: "hard",
} as const;

export type DifficultyLevel = 0 | 1 | 2;

export function difficultyLabel(d: number): string {
  return DIFFICULTY[d as DifficultyLevel] ?? "unknown";
}


export const BASE_POINTS = 1_000;
export const SPEED_BONUS_WINDOW_SECS = 300;
export const UNDO_PENALTY = 50;
export const BPS_DENOMINATOR = 10_000;
export const MAX_TREASURY_FEE_BPS = 2_000;


export const CRON = {
  SYNC_PROTOCOL: "*/5 * * * *",
  SYNC_LEADERBOARD: "*/2 * * * *",
  SYNC_TOURNAMENTS: "*/1 * * * *",
  SYNC_PUZZLE_STATS: "*/30 * * * * *",
} as const;


export const HELIUS_EVENT_TYPES = {
  PUZZLE_FINALIZED: "PuzzleFinalized",
  PUZZLE_ABANDONED: "PuzzleAbandoned",
  PUZZLE_INITIALIZED: "PuzzleInitialized",
  PUZZLE_STARTED: "PuzzleStarted",
  TOURNAMENT_CREATED: "TournamentCreated",
  TOURNAMENT_JOINED: "TournamentJoined",
  TOURNAMENT_CLOSED: "TournamentClosed",
  TOURNAMENT_RESULT_RECORDED: "TournamentResultRecorded",
  PRIZE_CLAIMED: "PrizeClaimed",
} as const;


export const WS_EVENTS = {
  PUZZLE_SOLVED: "puzzle:solved",
  PUZZLE_ABANDONED: "puzzle:abandoned",
  TOURNAMENT_CREATED: "tournament:created",
  TOURNAMENT_JOINED: "tournament:joined",
  TOURNAMENT_CLOSED: "tournament:closed",
  LEADERBOARD_UPDATED: "leaderboard:updated",
  PRIZE_CLAIMED: "prize:claimed",
} as const;
