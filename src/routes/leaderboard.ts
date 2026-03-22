import type { FastifyInstance } from "fastify";
import { LeaderboardController } from "../controllers/leaderboard.controller.js";

export async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/leaderboard/global", LeaderboardController.getGlobal);
  app.get("/leaderboard/:difficulty", LeaderboardController.getByDifficulty);
}