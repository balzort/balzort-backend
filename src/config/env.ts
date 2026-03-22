import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Privy
  PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),
  PRIVY_VERIFICATION_KEY: z.string().min(1),

  // Solana
  RPC_URL: z.string().url(),
  PROGRAM_ID: z.string().default("7F8bQvi3ppn4i7APswRX23hUFuq41dtkguy8aWLLtic8"),

  // Helius
  HELIUS_WEBHOOK_SECRET: z.string().min(1),

  // Admin
  ADMIN_WALLETS: z.string().default(""),

  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const adminWallets: string[] = env.ADMIN_WALLETS
  ? env.ADMIN_WALLETS.split(",").map((w) => w.trim()).filter(Boolean)
  : [];
