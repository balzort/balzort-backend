import cron from "node-cron";
import { TournamentModel } from "../models/Tournament.js";
import { fetchGame, getGamePda } from "../solana/accounts/fetchGame.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, TokenAccountNotFoundError } from "@solana/spl-token";
import { PublicKey, TransactionInstruction, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { connection } from "../config/solana.js";
import { program } from "../solana/program.js";
import { getServerWallet } from "../config/serverWallet.js";
import { CRON } from "../utils/constants.js";
import BN from "bn.js";
import { WebSocketService } from "../services/websocket.service.js";

/**
 * Every 1 minute: check if any open tournaments have their end_time elapsed.
 * Because `CloseTournament` is a permissionless crank, the server
 * will automatically close them using the server wallet as the transaction payer.
 */
export function startCloseTournaments(): void {
  cron.schedule(CRON.SYNC_TOURNAMENTS, async () => {
    try {
      const openTournaments = await TournamentModel.findUnclosedTournaments();
      const nowSecs = Math.floor(Date.now() / 1000);
      
      const endedTournaments = openTournaments.filter(t => (new Date(t.end_time).getTime() / 1000) <= nowSecs && !t.is_closed);
      if (endedTournaments.length === 0) return;

      const serverWallet = getServerWallet();
      const gameRef = await fetchGame();
      if (!gameRef) return;
      const gamePda = getGamePda();

      let closedCount = 0;

      for (const t of endedTournaments) {
        try {
          console.log(`[closeTournaments] Attempting to auto-close tournament ${t.on_chain_address}`);
          const tournamentPubkey = new PublicKey(t.on_chain_address);
          const tokenMintPubkey = new PublicKey(t.token_mint ?? "");

          const mintInfo = await connection.getAccountInfo(tokenMintPubkey);
          if (!mintInfo) throw new Error("Mint not found");
          const tokenProgramId = mintInfo.owner;

          const treasuryTokenAccountPubkey = await getAssociatedTokenAddress(
            tokenMintPubkey,
            new PublicKey(gameRef.treasury),
            true,
            tokenProgramId
          );

          const { SEEDS, PROGRAM_ID } = await import("../utils/constants.js");
          const idBuf = Buffer.alloc(8);
          new BN(t.on_chain_id).toArrayLike(Buffer, "le", 8).copy(idBuf);
          const [vaultPda] = PublicKey.findProgramAddressSync(
            [SEEDS.TOURNAMENT_VAULT, idBuf],
            PROGRAM_ID
          );

          let createAtaIx: TransactionInstruction | null = null;
          try {
            await getAccount(connection, treasuryTokenAccountPubkey, "confirmed", tokenProgramId);
          } catch (e: any) {
            if (e instanceof TokenAccountNotFoundError || e.name === "TokenAccountNotFoundError" || e.name === "TokenInvalidAccountOwnerError") {
              createAtaIx = createAssociatedTokenAccountInstruction(
                serverWallet.publicKey, // payer
                treasuryTokenAccountPubkey, // ata
                new PublicKey(gameRef.treasury), // owner
                tokenMintPubkey, // mint
                tokenProgramId
              );
            }
          }

          const ix = await program.methods
            .closeTournament()
            .accountsPartial({
              payer: serverWallet.publicKey,
              tournament: tournamentPubkey,
              tournamentVault: vaultPda,
              game: gamePda,
              treasuryTokenAccount: treasuryTokenAccountPubkey,
              tokenMint: tokenMintPubkey,
              tokenProgram: tokenProgramId,
            })
            .instruction();

          const instructions = [];
          if (createAtaIx) instructions.push(createAtaIx);
          instructions.push(ix);

          const { blockhash } = await connection.getLatestBlockhash("confirmed");
          const messageV0 = new TransactionMessage({
            payerKey: serverWallet.publicKey,
            recentBlockhash: blockhash,
            instructions,
          }).compileToV0Message();

          const tx = new VersionedTransaction(messageV0);
          tx.sign([serverWallet]);

          const sig = await connection.sendTransaction(tx);
          console.log(`[closeTournaments] Sent close tx ${sig} for tournament ${t.on_chain_address}`);
          closedCount++;

          // Broadcast real-time events so frontends and admin update instantly
          WebSocketService.broadcast("tournament_closed", {
            on_chain_address: t.on_chain_address,
          });
          WebSocketService.broadcast("platform_stats_changed", {});

          // Small delay so we don't spam RPC
          await new Promise(r => setTimeout(r, 1000));
        } catch (err: any) {
          console.error(`[closeTournaments] Failed to close ${t.on_chain_address}:`, err.message);
        }
      }

      if (closedCount > 0) {
        console.log(`[closeTournaments] Successfully sent close transactions for ${closedCount} tournaments.`);
      }

    } catch (e: any) {
      console.error("[closeTournaments] Error:", e.message);
    }
  });

  console.log("✅ Cron: closeTournaments registered (every 1 min)");
}
