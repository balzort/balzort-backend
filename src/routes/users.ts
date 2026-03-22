import type { FastifyInstance } from "fastify";
import { UserController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {

  // Public — token is verified inside the controller itself
  app.post("/users/sync", UserController.syncUser);

  // Public — wallet address is the only identifier needed
  app.get("/users/:wallet", UserController.getProfile);
  app.get("/users/:wallet/history", UserController.getHistory);

  // Authenticated — require Bearer token in Authorization header
  app.patch(
    "/users/profile",
    { preHandler: [authenticate] },
    UserController.updateProfile
  );

  app.patch(
    "/users/player-account",
    { preHandler: [authenticate] },
    UserController.markPlayerAccount
  );

  // Authenticated — builds & server-signs the create_player tx.
  // Server wallet pays fees; embedded wallet signs on the frontend via Privy.
  app.post(
    "/users/prepare-player-tx",
    { preHandler: [authenticate] },
    UserController.preparePlayerTx
  );
}
