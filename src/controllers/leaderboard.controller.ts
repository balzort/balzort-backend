import type { FastifyRequest, FastifyReply } from "fastify";
import { LeaderboardModel } from "../models/Leaderboard.js";
import { handleApiError } from "../utils/errorHandler.js";
import { sendSuccess } from "../utils/response.js";
import { leaderboardQuerySchema, difficultyParamSchema } from "../utils/validator.js";

export class LeaderboardController {
  /**
   * GET /leaderboard/global
   */
  static async getGlobal(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { page, limit } = leaderboardQuerySchema.parse(req.query);
      const offset = (page - 1) * limit;
      const { entries, total } = await LeaderboardModel.getGlobal(limit, offset);

      return reply.send({
        success: true,
        data: entries,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return handleApiError(reply, error, "LeaderboardController.getGlobal");
    }
  }

  /**
   * GET /leaderboard/:difficulty  (0 = easy, 1 = medium, 2 = hard)
   */
  static async getByDifficulty(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { difficulty } = difficultyParamSchema.parse(req.params);
      const { page, limit } = leaderboardQuerySchema.parse(req.query);
      const offset = (page - 1) * limit;
      const { entries, total } = await LeaderboardModel.getByDifficulty(difficulty, limit, offset);

      return reply.send({
        success: true,
        data: entries,
        difficulty,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      return handleApiError(reply, error, "LeaderboardController.getByDifficulty");
    }
  }
}
