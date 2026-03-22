import { Program, AnchorProvider, BorshCoder, EventParser } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { connection, PROGRAM_ID } from "../config/solana.js";
import type { Balzort } from "./idl/balzort.js";
import IDL from "./idl/balzort.json" with { type: "json" };


const provider = new AnchorProvider(
  connection,
  {
    publicKey: PublicKey.default,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  },
  { commitment: "confirmed" }
);

export const program = new Program<Balzort>(IDL as unknown as Balzort, provider);


export const eventParser = new EventParser(
  PROGRAM_ID,
  new BorshCoder(IDL as Idl)
);