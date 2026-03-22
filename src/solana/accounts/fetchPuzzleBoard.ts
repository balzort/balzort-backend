import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { program } from "../program.js";
import { SEEDS, PROGRAM_ID } from "../../utils/constants.js";

export interface PuzzleBoardData {
  address: string;
  numTubes: number;
  numColors: number;
  maxCapacity: number;
  balls: number[];      // flat array [120]
  tubeLengths: number[]; // [12]
  vrfSeed: number[];    // [32]
  undoFrom: number;
  undoTo: number;
  undoBall: number;
  hasUndo: boolean;
}

/**
 * Derive PuzzleBoard PDA.
 * Seeds: ["puzzle_board", playerPda, nonceBytes (u64 le)]
 */
export function getPuzzleBoardPda(playerPda: PublicKey, nonce: bigint): PublicKey {
  const nonceBuf = Buffer.alloc(8);
  new BN(nonce.toString()).toArrayLike(Buffer, "le", 8).copy(nonceBuf);
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.PUZZLE_BOARD, playerPda.toBuffer(), nonceBuf],
    PROGRAM_ID
  );
  return pda;
}

export async function fetchPuzzleBoard(
  playerPda: string,
  nonce: bigint
): Promise<PuzzleBoardData | null> {
  try {
    const pda = getPuzzleBoardPda(new PublicKey(playerPda), nonce);
    const account = await program.account.puzzleBoard.fetch(pda);

    return {
      address: pda.toBase58(),
      numTubes: account.numTubes,
      numColors: account.numColors,
      maxCapacity: account.maxCapacity,
      balls: Array.from(account.balls as unknown as ArrayLike<number>),
      tubeLengths: Array.from(account.tubeLengths as unknown as ArrayLike<number>),
      vrfSeed: Array.from(account.vrfSeed as unknown as ArrayLike<number>),
      undoFrom: account.undoFrom,
      undoTo: account.undoTo,
      undoBall: account.undoBall,
      hasUndo: account.hasUndo,
    };
  } catch (err: any) {
    if (err?.message?.includes("Account does not exist")) return null;
    throw err;
  }
}

/**
 * Fetch PuzzleBoard directly by its known pubkey (from Helius event).
 */
export async function fetchPuzzleBoardByAddress(address: string): Promise<PuzzleBoardData | null> {
  try {
    const pk = new PublicKey(address);
    const account = await program.account.puzzleBoard.fetch(pk);

    return {
      address,
      numTubes: account.numTubes,
      numColors: account.numColors,
      maxCapacity: account.maxCapacity,
      balls: Array.from(account.balls as unknown as ArrayLike<number>),
      tubeLengths: Array.from(account.tubeLengths as unknown as ArrayLike<number>),
      vrfSeed: Array.from(account.vrfSeed as unknown as ArrayLike<number>),
      undoFrom: account.undoFrom,
      undoTo: account.undoTo,
      undoBall: account.undoBall,
      hasUndo: account.hasUndo,
    };
  } catch (err: any) {
    if (err?.message?.includes("Account does not exist")) return null;
    throw err;
  }
}
