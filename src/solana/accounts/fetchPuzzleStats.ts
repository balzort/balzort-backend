import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { program } from "../program.js";
import { SEEDS, PROGRAM_ID, PUZZLE_STATUS } from "../../utils/constants.js";

export interface PuzzleStatsData {
  address: string;
  status: number;
  difficulty: number;
  numTubes: number;
  ballsPerTube: number;
  moveCount: number;
  undoCount: number;
  startedAt: number;
  completedAt: number;
  isSolved: boolean;
  finalScore: bigint;
}

/**
 * Derive PuzzleStats PDA.
 * Seeds: ["puzzle_stats", playerPda, nonceBytes (u64 le)]
 */
export function getPuzzleStatsPda(playerPda: PublicKey, nonce: bigint): PublicKey {
  const nonceBuf = Buffer.alloc(8);
  new BN(nonce.toString()).toArrayLike(Buffer, "le", 8).copy(nonceBuf);
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.PUZZLE_STATS, playerPda.toBuffer(), nonceBuf],
    PROGRAM_ID
  );
  return pda;
}

export async function fetchPuzzleStats(
  playerPda: string,
  nonce: bigint
): Promise<PuzzleStatsData | null> {
  try {
    const pda = getPuzzleStatsPda(new PublicKey(playerPda), nonce);
    return await fetchPuzzleStatsByAddress(pda.toBase58());
  } catch (err: any) {
    if (err?.message?.includes("Account does not exist")) return null;
    throw err;
  }
}

/**
 * Fetch PuzzleStats directly by its known pubkey (from Helius event).
 */
export async function fetchPuzzleStatsByAddress(address: string): Promise<PuzzleStatsData | null> {
  try {
    const pk = new PublicKey(address);
    const account = await program.account.puzzleStats.fetch(pk);

    return {
      address,
      status: account.status,
      difficulty: account.difficulty,
      numTubes: account.numTubes,
      ballsPerTube: account.ballsPerTube,
      moveCount: account.moveCount,
      undoCount: account.undoCount,
      startedAt: account.startedAt.toNumber(),
      completedAt: account.completedAt.toNumber(),
      isSolved: account.isSolved,
      finalScore: BigInt(account.finalScore.toString()),
    };
  } catch (err: any) {
    if (err?.message?.includes("Account does not exist")) return null;
    throw err;
  }
}

export function isFinalized(stats: PuzzleStatsData): boolean {
  return stats.status === PUZZLE_STATUS.FINALIZED || stats.status === PUZZLE_STATUS.SOLVED;
}

export function isAbandoned(stats: PuzzleStatsData): boolean {
  return stats.status === PUZZLE_STATUS.ABANDONED;
}
