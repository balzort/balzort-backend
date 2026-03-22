
import { connection, PROGRAM_ID } from "../config/solana.js";
import { TransactionModel } from "../models/Transaction.js";
import type { TxType } from "../models/Transaction.js";
import type { ParsedTransactionWithMeta, ConfirmedSignatureInfo } from "@solana/web3.js";

const POLL_INTERVAL_MS = 15_000;
const GROUP_SIZE       = 10;
const MAX_RETRIES      = 5;
const RETRY_BASE_MS    = 1_000;
const FETCH_DELAY_MS   = 150;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export class TransactionIndexer {
  private isRunning = false;
  private lastSeenSignature: string | null = null;
  private timer: NodeJS.Timeout | null = null;

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.initLastSeenSignature();

    console.log(`\n📡 [TransactionIndexer] Starting...`);
    console.log(`   Resume signature: ${this.lastSeenSignature ?? "None (first run, will backfill all)"}`);

    await this.backfill();

    console.log(`\n🔄 [TransactionIndexer] Backfill complete. Polling every ${POLL_INTERVAL_MS / 1000}s.\n`);
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log("🛑 [TransactionIndexer] Stopped.");
  }



  private async initLastSeenSignature() {
    try {
      const row = await TransactionModel.getLatestSignature();
      if (row) this.lastSeenSignature = row.signature;
    } catch (err: any) {
      console.warn(`⚠️  [TransactionIndexer] Could not load resume point: ${err.message}`);
    }
  }



  private async backfill() {
    console.log(`🔍 [TransactionIndexer] Fetching transaction signatures...`);

    const allSignatures = await this.fetchAllSignatures();

    if (allSignatures.length === 0) {
      console.log(`✅ [TransactionIndexer] No new transactions to backfill.`);
      return;
    }

    allSignatures.reverse(); // oldest-first
    const total = allSignatures.length;
    console.log(`📦 [TransactionIndexer] Found ${total} transaction(s) to process.\n`);

    let processed = 0;

    for (let g = 0; g < total; g += GROUP_SIZE) {
      const group      = allSignatures.slice(g, g + GROUP_SIZE);
      const groupNum   = Math.floor(g / GROUP_SIZE) + 1;
      const totalGroups = Math.ceil(total / GROUP_SIZE);

      console.log(`── Group ${groupNum}/${totalGroups} ── Fetching ${group.length} transaction(s)...`);

      for (const sigInfo of group) {
        const sig = sigInfo.signature;
        const tx  = await this.fetchWithRetry(sig);

        if (tx) {
          await this.processTransaction(sig, tx);
          this.lastSeenSignature = sig;
          processed++;
        }

        await sleep(FETCH_DELAY_MS);
      }

      console.log(`   ✅ Group ${groupNum}/${totalGroups} done. Progress: ${processed}/${total}\n`);
    }

    console.log(`🎉 [TransactionIndexer] Backfill finished! ${processed}/${total} transaction(s) saved.\n`);
  }

  private async fetchAllSignatures(): Promise<ConfirmedSignatureInfo[]> {
    const all: ConfirmedSignatureInfo[] = [];
    let before: string | undefined;

    while (true) {
      const opts: { limit: number; before?: string; until?: string } = { limit: 1000 };
      if (before) opts.before = before;
      if (this.lastSeenSignature) opts.until = this.lastSeenSignature;

      const batch = await connection.getSignaturesForAddress(PROGRAM_ID, opts);
      if (batch.length === 0) break;

      all.push(...batch);
      before = batch[batch.length - 1]!.signature;
      console.log(`   ... fetched ${all.length} signature(s) so far`);
      await sleep(200);
    }

    return all;
  }



  private async poll() {
    try {
      const opts: { limit: number; until?: string } = { limit: 50 };
      if (this.lastSeenSignature) opts.until = this.lastSeenSignature;

      const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, opts);
      if (signatures.length === 0) return;

      signatures.reverse(); // oldest-first

      console.log(`🆕 [TransactionIndexer] ${signatures.length} new transaction(s) detected.`);

      for (const sigInfo of signatures) {
        const sig = sigInfo.signature;
        const tx  = await this.fetchWithRetry(sig);

        if (tx) {
          await this.processTransaction(sig, tx);
          this.lastSeenSignature = sig;
        }

        await sleep(FETCH_DELAY_MS);
      }

      console.log(`   ✅ Processed ${signatures.length} new transaction(s).`);
    } catch (err: any) {
      console.error(`❌ [TransactionIndexer] Polling error: ${err.message}`);
    }
  }



  private async fetchWithRetry(signature: string): Promise<ParsedTransactionWithMeta | null> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const tx = await connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });

        if (!tx) {
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
            await sleep(delay);
            continue;
          }
          return null;
        }

        return tx;
      } catch (err: any) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
          console.warn(`   ⚠️  Fetch failed for ${signature.slice(0, 12)}...: ${err.message} — retrying in ${delay}ms`);
          await sleep(delay);
        } else {
          console.error(`   ❌ Failed to fetch ${signature.slice(0, 12)}... after ${MAX_RETRIES} attempts`);
          return null;
        }
      }
    }
    return null;
  }



  private async processTransaction(signature: string, tx: ParsedTransactionWithMeta) {
    try {
      const feePayer = tx.transaction.message.accountKeys.find(a => a.signer)?.pubkey.toString();
      const isError  = !!tx.meta?.err;

      const allTypes  = this.inferTxTypesFromLogs(tx.meta?.logMessages ?? []);
      const gameTypes = allTypes.filter(t => t !== "idl_management" && t !== "program_upgrade" && t !== "unknown");

      if (gameTypes.length === 0) return;

      for (let i = 0; i < gameTypes.length; i++) {
        const txType = gameTypes[i]!;
        // Append index suffix when a single tx has multiple instructions
        // to satisfy the unique constraint on `signature`.
        const rowSig = gameTypes.length > 1 ? `${signature}-${i}` : signature;

        const payload: any = {
          signature: rowSig,
          tx_type:   txType,
          status:    isError ? "failed" : "success",
          slot:      tx.slot,
          block_time: tx.blockTime || Math.floor(Date.now() / 1000),
        };

        if (feePayer)                          payload.player_wallet           = feePayer;
        if (tx.meta?.fee !== undefined)        payload.fee_lamports            = tx.meta.fee;
        if (tx.meta?.computeUnitsConsumed !== undefined)
          payload.compute_units_consumed = tx.meta.computeUnitsConsumed;

        await TransactionModel.record(payload);
      }
    } catch (err: any) {
      console.error(`   ❌ Failed to save tx ${signature.slice(0, 12)}...: ${err.message}`);
    }
  }



  private static readonly LOG_TO_TYPE: [string, TxType][] = [
    ["Instruction: InitializeGame",           "initialize_game"],
    ["Instruction: UpdateGame",               "update_game"],
    ["Instruction: CreatePlayer",             "create_player"],
    ["Instruction: InitPuzzle",               "init_puzzle"],
    ["Instruction: ConsumeRandomness",        "consume_randomness"],
    ["Instruction: StartPuzzle",              "start_puzzle"],
    ["Instruction: ApplyMove",                "apply_move"],
    ["Instruction: ApplyUndo",                "apply_undo"],
    ["Instruction: FinalizePuzzle",           "finalize_puzzle"],
    ["Instruction: AbandonPuzzle",            "abandon_puzzle"],
    ["Instruction: CreatePuzzlePermissions",  "create_puzzle_permissions"],
    ["Instruction: DelegatePuzzlePermissions","delegate_puzzle_permissions"],
    ["Instruction: DelegatePuzzle",           "delegate_puzzle"],
    ["Instruction: UndelegatePuzzle",         "undelegate_puzzle"],
    ["Instruction: OpenSession",              "open_session"],
    ["Instruction: CloseSession",             "close_session"],
    ["Instruction: CreateTournament",         "create_tournament"],
    ["Instruction: JoinTournament",           "join_tournament"],
    ["Instruction: RecordTournamentResult",   "record_tournament_result"],
    ["Instruction: CloseTournament",          "close_tournament"],
    ["Instruction: ClaimPrize",               "claim_prize"],
    ["Instruction: IdlWrite",                 "idl_management"],
    ["Instruction: IdlCreateBuffer",          "idl_management"],
    ["Instruction: IdlCloseBuffer",           "idl_management"],
    ["Instruction: IdlSetAuthority",          "idl_management"],
    ["Program BPFLoaderUpgrade",              "program_upgrade"],
  ];

  private inferTxTypesFromLogs(logs: string[]): TxType[] {
    const types: TxType[] = [];

    for (const log of logs) {
      for (const [pattern, txType] of TransactionIndexer.LOG_TO_TYPE) {
        if (log.includes(pattern)) {
          types.push(txType);
        }
      }
    }

    return Array.from(new Set(types));
  }
}

export const transactionIndexer = new TransactionIndexer();