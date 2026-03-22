import type { FastifyRequest, FastifyReply } from "fastify";
import { PuzzleResultModel } from "../models/PuzzleResult.js";
import { PlayerModel } from "../models/Player.js";
import { TransactionModel } from "../models/Transaction.js";
import { fetchPuzzleStatsByAddress } from "../solana/accounts/fetchPuzzleStats.js";
import { handleApiError } from "../utils/errorHandler.js";
import { sendSuccess, sendError, sendNotFound } from "../utils/response.js";
import { puzzleResultSchema, walletParamSchema } from "../utils/validator.js";
import type { AuthUser } from "../middleware/auth.middleware.js";
import { getPrimaryWallet } from "../middleware/auth.middleware.js";
import { PUZZLE_STATUS } from "../utils/constants.js";

export class PuzzleController {
  /**
   * POST /puzzles/result
   * Frontend calls this after a finalize_puzzle or abandon_puzzle tx confirms.
   * We read the on-chain PuzzleStats account directly to get authoritative data
   * — never trust the client's numbers.
   */
  static async submitResult(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (req as any).user as AuthUser;
      const playerWallet = getPrimaryWallet(user);

      if (!playerWallet) {
        return sendError(reply, "No wallet associated with this account.", 400);
      }

      const body = puzzleResultSchema.parse(req.body);


      const exists = await PuzzleResultModel.existsByStatsAccount(body.puzzle_stats);
      if (exists) {
        return sendSuccess(reply, { message: "Already recorded." });
      }


      const statsAccount = await fetchPuzzleStatsByAddress(body.puzzle_stats);

      if (!statsAccount) {
        return sendNotFound(reply, "PuzzleStats account");
      }

      const isFinalized =
        statsAccount.status === PUZZLE_STATUS.FINALIZED ||
        statsAccount.status === PUZZLE_STATUS.SOLVED;
      const isAbandoned = statsAccount.status === PUZZLE_STATUS.ABANDONED;

      if (!isFinalized && !isAbandoned) {
        return sendError(reply, "Puzzle is not yet finalized or abandoned on-chain.", 400);
      }

      const elapsedSecs =
        statsAccount.completedAt > 0
          ? statsAccount.completedAt - statsAccount.startedAt
          : 0;


      const result = await PuzzleResultModel.create({
        player_wallet: playerWallet,
        puzzle_board_pubkey: body.puzzle_board,
        puzzle_stats_pubkey: body.puzzle_stats,
        difficulty: statsAccount.difficulty,
        num_tubes: statsAccount.numTubes,
        balls_per_tube: statsAccount.ballsPerTube,
        move_count: statsAccount.moveCount,
        undo_count: statsAccount.undoCount,
        elapsed_secs: elapsedSecs,
        final_score: Number(statsAccount.finalScore),
        is_abandoned: isAbandoned,
        is_solved: statsAccount.isSolved,
        tx_signature: body.tx_signature,
      });


      if (statsAccount.isSolved) {
        await PlayerModel.incrementSolved(playerWallet, Number(statsAccount.finalScore));
      }


      await TransactionModel.record({
        signature: body.tx_signature,
        player_wallet: playerWallet,
        tx_type: isAbandoned ? "abandon_puzzle" : "finalize_puzzle",
        status: "success",
      });

      return sendSuccess(reply, { result }, 201);
    } catch (error) {
      return handleApiError(reply, error, "PuzzleController.submitResult");
    }
  }

  /**
   * GET /puzzles/board/:address
   * Returns the live on-chain PuzzleStats for a given stats account address.
   * Useful for the frontend to poll during active play.
   */
  static async getStats(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { wallet: address } = walletParamSchema.parse(req.params);
      const stats = await fetchPuzzleStatsByAddress(address);

      if (!stats) return sendNotFound(reply, "PuzzleStats account");
      return sendSuccess(reply, { stats });
    } catch (error) {
      return handleApiError(reply, error, "PuzzleController.getStats");
    }
  }
}
