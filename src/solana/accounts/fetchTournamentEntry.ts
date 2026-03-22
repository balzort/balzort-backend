import { PublicKey } from "@solana/web3.js";
import { program } from "../program.js";
import { SEEDS, PROGRAM_ID } from "../../utils/constants.js";

export interface TournamentEntryData {
  address: string;
  tournament: string;
  player: string;
  entryDeposit: bigint;
  parimutuelWeight: bigint;
  completed: boolean;
  hasClaimed: boolean;
  bump: number;
}

/**
 * Derive TournamentEntry PDA.
 * Seeds: ["tournament_entry", tournamentPda, playerPubkey]
 */
export function getTournamentEntryPda(
  tournamentPda: PublicKey,
  player: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [SEEDS.TOURNAMENT_ENTRY, tournamentPda.toBuffer(), player.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export async function fetchTournamentEntry(
  tournamentAddress: string,
  playerWallet: string
): Promise<TournamentEntryData | null> {
  try {
    const tournamentPk = new PublicKey(tournamentAddress);
    const playerPk = new PublicKey(playerWallet);
    const pda = getTournamentEntryPda(tournamentPk, playerPk);
    const account = await program.account.tournamentEntry.fetch(pda);

    return {
      address: pda.toBase58(),
      tournament: account.tournament.toBase58(),
      player: account.player.toBase58(),
      entryDeposit: BigInt(account.entryDeposit.toString()),
      parimutuelWeight: BigInt(account.parimutuelWeight.toString()),
      completed: account.completed,
      hasClaimed: account.hasClaimed,
      bump: account.bump,
    };
  } catch (err: any) {
    if (err?.message?.includes("Account does not exist")) return null;
    throw err;
  }
}

/**
 * Fetch all entries for a given tournament.
 */
export async function fetchEntriesForTournament(
  tournamentAddress: string
): Promise<TournamentEntryData[]> {
  const tournamentPk = new PublicKey(tournamentAddress);

  const accounts = await program.account.tournamentEntry.all([
    {
      memcmp: {
        offset: 8, // skip discriminator, first field is tournament pubkey
        bytes: tournamentPk.toBase58(),
      },
    },
  ]);

  return accounts.map((a) => ({
    address: a.publicKey.toBase58(),
    tournament: a.account.tournament.toBase58(),
    player: a.account.player.toBase58(),
    entryDeposit: BigInt(a.account.entryDeposit.toString()),
    parimutuelWeight: BigInt(a.account.parimutuelWeight.toString()),
    completed: a.account.completed,
    hasClaimed: a.account.hasClaimed,
    bump: a.account.bump,
  }));
}
