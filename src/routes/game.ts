import type { FastifyInstance } from "fastify";
import { GameController } from "../controllers/game.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export async function gameRoutes(app: FastifyInstance): Promise<void> {
  const auth = { preHandler: [authenticate] };

  // Prepare openSession tx (server wallet funds session key + opens session)
  app.post("/game/prepare-open-session", auth, GameController.prepareOpenSession);

  // Prepare initPuzzle tx (server wallet pays rent for board + stats PDAs)
  app.post("/game/prepare-init-puzzle", auth, GameController.prepareInitPuzzle);

  // Prepare closeSession tx (closes session + frontend appends drain ix)
  app.post("/game/prepare-close-session", auth, GameController.prepareCloseSession);
}
