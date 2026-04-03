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

  // Prepare joinTournament tx
  app.post("/game/prepare-join-tournament", auth, GameController.prepareJoinTournament);

  // Prepare recordTournamentResult tx (session key signs — no popup)
  app.post("/game/prepare-record-tournament-result", auth, GameController.prepareRecordTournamentResult);

  // Prepare claimPrize tx (user signs internally)
  app.post("/game/prepare-claim-prize", auth, GameController.prepareClaimPrize);
}
