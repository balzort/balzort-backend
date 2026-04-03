import type { FastifyInstance } from "fastify";
import { AdminController } from "../controllers/admin.controller.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";

const adminAuth = { preHandler: [adminMiddleware] };

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Identity / bootstrap
  app.get("/admin/me", adminAuth, AdminController.getMe);

  // Game management
  app.post("/admin/prepare-update-game", adminAuth, AdminController.prepareUpdateGame);

  // Tournament management
  app.post("/admin/prepare-create-tournament", adminAuth, AdminController.prepareCreateTournament);
  app.post("/admin/sync-tournament", adminAuth, AdminController.syncTournament);
  app.post("/admin/prepare-close-tournament", adminAuth, AdminController.prepareCloseTournament);
  app.post("/admin/prepare-withdraw-treasury", adminAuth, AdminController.prepareWithdrawTreasury);

  // Platform overview
  app.get("/admin/stats", adminAuth, AdminController.getPlatformStats);
  app.get("/admin/activity", adminAuth, AdminController.getActivityFeed);

  // Player lookup
  app.get("/admin/player-lookup", adminAuth, AdminController.getPlayerLookup);
}