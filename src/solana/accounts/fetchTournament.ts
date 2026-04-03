import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { program } from "../program.js";
import { SEEDS, PROGRAM_ID } from "../../utils/constants.js";

export interface TournamentData {
  address: string;
  authority: string;
  tokenMint: string;
  entryFee: bigint;
  prizePool: bigint;
  netPrizePool: bigint;
  treasuryFeeBps: number;
  difficulty: number;
  numTubes: number;
  ballsPerTube: number;
  startTime: number;
  endTime: number;
  totalEntries: number;
  totalCompleters: number;
  cumulativeWeight: bigint;
  isClosed: boolean;
  tournamentId: bigint;
  bump: number;
}

/**
 * Derive Tournament PDA.
 * Seeds: ["tournament", tournamentId (u64 le)]
 */
export function getTournamentPda(tournamentId: bigint): PublicKey {
  const idBuf = Buffer.alloc(8);
  new BN(tournamentId.toString()).toArrayLike(Buffer, "le", 8).copy(idBuf);
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.TOURNAMENT, idBuf],
    PROGRAM_ID
  );
  return pda;
}

export async function fetchTournament(tournamentId: bigint): Promise<TournamentData | null> {
  try {
    const pda = getTournamentPda(tournamentId);
    return await fetchTournamentByAddress(pda.toBase58());
  } catch (err: any) {
    if (err?.message?.includes("Account does not exist")) return null;
    throw err;
  }
}

/**
 * Fetch Tournament directly by its known pubkey (from Helius event).
 */
export async function fetchTournamentByAddress(address: string): Promise<TournamentData | null> {
  try {
    const pk = new PublicKey(address);
    const account = await program.account.tournament.fetch(pk);

    return {
      address,
      authority: account.authority.toBase58(),
      tokenMint: account.tokenMint.toBase58(),
      entryFee: BigInt(account.entryFee.toString()),
      prizePool: BigInt(account.prizePool.toString()),
      netPrizePool: BigInt(account.netPrizePool.toString()),
      treasuryFeeBps: account.treasuryFeeBps,
      difficulty: account.difficulty,
      numTubes: account.numTubes,
      ballsPerTube: account.ballsPerTube,
      startTime: account.startTime.toNumber(),
      endTime: account.endTime.toNumber(),
      totalEntries: account.totalEntries,
      totalCompleters: account.totalCompleters,
      cumulativeWeight: BigInt(account.cumulativeWeight.toString()),
      isClosed: account.isClosed,
      tournamentId: BigInt(account.tournamentId.toString()),
      bump: account.bump,
    };
  } catch (err: any) {
    if (err?.message?.includes("Account does not exist")) return null;
    throw err;
  }
}

/**
 * Fetch all open tournaments by scanning program accounts.
 * Used by the cron job to sync active tournaments.
 */
export async function fetchAllOpenTournaments(): Promise<TournamentData[]> {
  const accounts = await program.account.tournament.all([
    {
      memcmp: {
        // is_closed byte is at offset 8 (discriminator) + field offsets
        // We filter for is_closed = 0 (false)
        offset: 8 + 32 + 8 + 8 + 8 + 2 + 1 + 8 + 8 + 4 + 4 + 16, // after all fields before is_closed
        bytes: "1", // false = 0x00, encoded as base58
      },
    },
  ]);

  return accounts
    .map((a) => {
      const account = a.account;
      return {
        address: a.publicKey.toBase58(),
        authority: account.authority.toBase58(),
        tokenMint: account.tokenMint.toBase58(),
        entryFee: BigInt(account.entryFee.toString()),
        prizePool: BigInt(account.prizePool.toString()),
        netPrizePool: BigInt(account.netPrizePool.toString()),
        treasuryFeeBps: account.treasuryFeeBps,
        difficulty: account.difficulty,
        numTubes: account.numTubes,
        ballsPerTube: account.ballsPerTube,
        startTime: account.startTime.toNumber(),
        endTime: account.endTime.toNumber(),
        totalEntries: account.totalEntries,
        totalCompleters: account.totalCompleters,
        cumulativeWeight: BigInt(account.cumulativeWeight.toString()),
        isClosed: account.isClosed,
        tournamentId: BigInt(account.tournamentId.toString()),
        bump: account.bump,
      } as TournamentData;
    })
    .filter((t) => !t.isClosed);
}
