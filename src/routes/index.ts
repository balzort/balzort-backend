import type { FastifyInstance } from "fastify";
import { userRoutes } from "./users.js";
import { puzzleRoutes } from "./puzzles.js";
import { tournamentRoutes } from "./tournaments.js";
import { leaderboardRoutes } from "./leaderboard.js";
import { liveRoutes } from "./live.js";
import { webhookRoutes } from "./webhooks.js";
import { statusPageRoute } from "./statusPage.js";
import { gameRoutes } from "./game.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(userRoutes, { prefix: "/api" });
  await app.register(gameRoutes, { prefix: "/api" });
  await app.register(puzzleRoutes, { prefix: "/api" });
  await app.register(tournamentRoutes, { prefix: "/api" });
  await app.register(leaderboardRoutes, { prefix: "/api" });
  await app.register(liveRoutes);
  await app.register(webhookRoutes, { prefix: "/api" });
  await app.register(statusPageRoute);
}