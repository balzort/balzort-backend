import type { FastifyInstance } from "fastify";
import { PuzzleController } from "../controllers/puzzle.controller.js";
import { UserController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export async function puzzleRoutes(app: FastifyInstance): Promise<void> {

  app.get("/puzzles/history/:wallet", UserController.getHistory);


  app.post(
    "/puzzles/submit",
    { preHandler: [authenticate] },
    PuzzleController.submitResult
  );
}