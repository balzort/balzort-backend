import { PrivyClient, verifyAccessToken } from "@privy-io/node";
import { env } from "./env.js";

export const privy = new PrivyClient({
  appId: env.PRIVY_APP_ID,
  appSecret: env.PRIVY_APP_SECRET,
});

export { verifyAccessToken };
console.log("✅ Privy Server SDK Initialized.");
