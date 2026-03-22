import { PublicKey } from "@solana/web3.js";
import { program } from "../program.js";
import { SEEDS, PROGRAM_ID } from "../../utils/constants.js";

export interface GameData {
  address: string;
  authority: string;
  treasury: string;
  treasuryFeeBps: number;
  isPaused: boolean;
  tournamentCount: bigint;
  bump: number;
}

/**
 * Derive the Game PDA address.
 * Seeds: ["game"]
 */
export function getGamePda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([SEEDS.GAME], PROGRAM_ID);
  return pda;
}

/**
 * Fetch and deserialize the Game account from the Solana chain.
 * Returns null if the account does not exist yet.
 */
export async function fetchGame(): Promise<GameData | null> {
  try {
    const pda = getGamePda();
    const account = await program.account.game.fetch(pda);

    return {
      address: pda.toBase58(),
      authority: account.authority.toBase58(),
      treasury: account.treasury.toBase58(),
      treasuryFeeBps: account.treasuryFeeBps,
      isPaused: account.isPaused,
      tournamentCount: BigInt(account.tournamentCount.toString()),
      bump: account.bump,
    };
  } catch (err: any) {
    if (err?.message?.includes("Account does not exist")) return null;
    throw err;
  }
}
