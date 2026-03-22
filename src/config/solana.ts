import { Connection, PublicKey } from "@solana/web3.js";
import { env } from "./env.js";

export const connection = new Connection(env.RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60_000,
});

export const PROGRAM_ID = new PublicKey(env.PROGRAM_ID);

console.log("✅ Solana connection initialized. RPC:", env.RPC_URL.split("?")[0]);
