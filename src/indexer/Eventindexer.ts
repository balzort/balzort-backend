import type {
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { connection, PROGRAM_ID } from "../config/solana.js";
import { eventParser } from "../solana/program.js";
import { routeEvent } from "./eventRouter.js";
import { ActivityModel } from "../models/Activity.js";

const POLL_INTERVAL_MS = 12_000;
const GROUP_SIZE = 10;
const MAX_RETRIES = 5;
const RETRY_BASE_MS = 1_000;
const SIG_FETCH_DELAY = 200;
const TX_FETCH_DELAY = 150;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class EventIndexer {
  private isRunning = false;
  private lastSeenSig: string | null = null;
  private timer: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.loadCursor();

    console.log(`\n🔎 [EventIndexer] Starting...`);
    console.log(
      `   Cursor: ${this.lastSeenSig ?? "None (first run — full backfill)"}`,
    );

    await this.backfill();

    console.log(
      `\n🔔 [EventIndexer] Backfill done. Polling every ${
        POLL_INTERVAL_MS / 1000
      }s for new events.\n`,
    );
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log("🛑 [EventIndexer] Stopped.");
  }

  private async loadCursor(): Promise<void> {
    try {
      const sig = await ActivityModel.getLatestSignature();
      if (sig) this.lastSeenSig = sig;
    } catch (err: any) {
      console.warn(`⚠️  [EventIndexer] Could not load cursor: ${err.message}`);
    }
  }

  private async backfill(): Promise<void> {
    console.log(`🔍 [EventIndexer] Fetching signatures from chain...`);

    const allSigs = await this.fetchAllSignatures();

    if (allSigs.length === 0) {
      console.log(`✅ [EventIndexer] No new signatures to backfill.`);
      return;
    }

    // getSignaturesForAddress returns newest-first → reverse to oldest-first
    allSigs.reverse();

    const total = allSigs.length;
    console.log(`📦 [EventIndexer] ${total} signature(s) to process.\n`);

    let processed = 0;

    for (let g = 0; g < total; g += GROUP_SIZE) {
      const group = allSigs.slice(g, g + GROUP_SIZE);
      const groupNum = Math.floor(g / GROUP_SIZE) + 1;
      const totalGroups = Math.ceil(total / GROUP_SIZE);

      console.log(
        `── Group ${groupNum}/${totalGroups} ── ${group.length} signature(s)...`,
      );

      for (const sigInfo of group) {
        await this.processSig(sigInfo.signature, sigInfo.blockTime);
        processed++;
        await sleep(TX_FETCH_DELAY);
      }

      console.log(
        `   ✅ Group ${groupNum}/${totalGroups} done. Progress: ${processed}/${total}\n`,
      );
    }

    console.log(
      `🎉 [EventIndexer] Backfill complete! ${processed}/${total} signatures processed.\n`,
    );
  }

  private async fetchAllSignatures(): Promise<ConfirmedSignatureInfo[]> {
    const all: ConfirmedSignatureInfo[] = [];
    let before: string | undefined;

    while (true) {
      const opts: { limit: number; before?: string; until?: string } = {
        limit: 1000,
      };
      if (before) opts.before = before;
      if (this.lastSeenSig) opts.until = this.lastSeenSig;

      const batch = await connection.getSignaturesForAddress(PROGRAM_ID, opts);
      if (batch.length === 0) break;

      all.push(...batch);
      before = batch[batch.length - 1]!.signature;

      console.log(`   ... ${all.length} signature(s) fetched so far`);
      await sleep(SIG_FETCH_DELAY);
    }

    return all;
  }

  private async poll(): Promise<void> {
    try {
      const opts: { limit: number; until?: string } = { limit: 50 };
      if (this.lastSeenSig) opts.until = this.lastSeenSig;

      const sigs = await connection.getSignaturesForAddress(PROGRAM_ID, opts);
      if (sigs.length === 0) return;

      sigs.reverse(); // oldest-first

      console.log(
        `🆕 [EventIndexer] ${sigs.length} new signature(s) detected.`,
      );

      for (const sigInfo of sigs) {
        await this.processSig(sigInfo.signature, sigInfo.blockTime);
        await sleep(TX_FETCH_DELAY);
      }

      console.log(`   ✅ Processed ${sigs.length} new signature(s).`);
    } catch (err: any) {
      console.error(`❌ [EventIndexer] Poll error: ${err.message}`);
    }
  }

  private async processSig(
    sig: string,
    blockTimeHint: number | null | undefined,
  ): Promise<void> {
    try {
      const tx = await this.fetchWithRetry(sig);

      // Advance in-memory cursor regardless so we don't get stuck
      this.lastSeenSig = sig;

      if (!tx || tx.meta?.err) return;

      const logs = tx.meta?.logMessages ?? [];
      const blockTime =
        tx.blockTime ?? blockTimeHint ?? Math.floor(Date.now() / 1000);

      if (logs.length === 0) return;

      const eventsIter = eventParser.parseLogs(logs);
      let count = 0;

      for (const event of eventsIter) {
        let routed = false;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            await routeEvent(event, sig, blockTime);
            routed = true;
            count++;
            break;
          } catch (err: any) {
            if (attempt < MAX_RETRIES) {
              const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
              console.warn(
                `   ⚠️  [EventIndexer] ${event.name} failed (attempt ${attempt}/${MAX_RETRIES}): ${err.message} — retrying in ${delay}ms`,
              );
              await sleep(delay);
            } else {
              console.error(
                `   ❌ [EventIndexer] Giving up on ${event.name} in ${sig.slice(
                  0,
                  8,
                )}... after ${MAX_RETRIES} attempts: ${err.message}`,
              );
            }
          }
        }

        if (!routed) {
          console.error(
            `   ❌ [EventIndexer] ${
              event.name
            } was NOT saved for sig ${sig.slice(0, 8)}...`,
          );
        }
      }

      if (count > 0) {
        console.log(
          `   📨 [EventIndexer] ${count} event(s) from ${sig.slice(0, 8)}...`,
        );
      }
    } catch (err: any) {
      console.error(
        `[EventIndexer] processSig error for ${sig.slice(0, 8)}...: ${
          err.message
        }`,
      );
    }
  }

  private async fetchWithRetry(
    sig: string,
  ): Promise<ParsedTransactionWithMeta | null> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const tx = await connection.getParsedTransaction(sig, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });

        if (!tx) {
          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_BASE_MS * Math.pow(2, attempt - 1));
            continue;
          }
          return null;
        }

        return tx;
      } catch (err: any) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
          console.warn(
            `   ⚠️  [EventIndexer] Fetch failed for ${sig.slice(0, 8)}...: ${
              err.message
            } — retrying in ${delay}ms`,
          );
          await sleep(delay);
        } else {
          console.error(
            `   ❌ [EventIndexer] Giving up on ${sig.slice(
              0,
              8,
            )}... after ${MAX_RETRIES} attempts`,
          );
          return null;
        }
      }
    }
    return null;
  }
}

export const eventIndexer = new EventIndexer();
