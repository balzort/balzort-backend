import { Keypair } from "@solana/web3.js";

/**
 * Loads the server wallet keypair from the SERVER_WALLET_PRIVATE_KEY env var.
 *
 * To generate one and print the values you need:
 *   node -e "
 *     const { Keypair } = require('@solana/web3.js');
 *     const kp = Keypair.generate();
 *     console.log('Public key :', kp.publicKey.toBase58());
 *     console.log('Private key:', JSON.stringify(Array.from(kp.secretKey)));
 *   "
 *
 * Add to your .env:
 *   SERVER_WALLET_PRIVATE_KEY=[1,2,3,...]
 *
 * Fund with devnet SOL — each createPlayer tx costs ~0.0025 SOL:
 *   solana airdrop 1 <PUBLIC_KEY> --url devnet
 */

let _cached: Keypair | null = null;

export function getServerWallet(): Keypair {
  if (_cached) return _cached;

  const raw = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "[serverWallet] SERVER_WALLET_PRIVATE_KEY is not set. " +
        "Generate a keypair and add its secret key array to .env."
    );
  }

  try {
    const secretKey = Uint8Array.from(JSON.parse(raw));
    _cached = Keypair.fromSecretKey(secretKey);
    console.log(`✅ [serverWallet] Loaded. Public key: ${_cached.publicKey.toBase58()}`);
    return _cached;
  } catch (err: any) {
    throw new Error(
      `[serverWallet] Failed to parse SERVER_WALLET_PRIVATE_KEY: ${err.message}`
    );
  }
}
