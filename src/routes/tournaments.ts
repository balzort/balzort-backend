import type { FastifyInstance } from "fastify";
import { TournamentController } from "../controllers/tournament.controller.js";

export async function tournamentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tournaments", TournamentController.getAll);
  app.get("/tournaments/:id", TournamentController.getOne);
  app.get("/tournaments/:id/leaderboard", TournamentController.getTournamentLeaderboard);
  app.get("/tournaments/player/:wallet", TournamentController.getPlayerTournaments);
}