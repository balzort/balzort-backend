import type { FastifyRequest, FastifyReply } from "fastify";
import { TournamentModel } from "../models/Tournament.js";
import { TournamentEntryModel } from "../models/TournamentEntry.js";
import { handleApiError } from "../utils/errorHandler.js";
import { sendSuccess, sendNotFound } from "../utils/response.js";
import {
  tournamentQuerySchema,
  tournamentIdParamSchema,
  walletParamSchema,
} from "../utils/validator.js";
import { difficultyLabel } from "../utils/constants.js";

export class TournamentController {
  /**
   * GET /tournaments
   * List all tournaments with optional filters.
   */
  static async getAll(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = tournamentQuerySchema.parse(req.query);

      const { data, total } = await TournamentModel.findAll(
        query.page,
        query.limit,
        query.difficulty,
        query.active_only,
      );

      const enriched = data.map((t) => ({
        ...t,
        difficulty_label: difficultyLabel(t.difficulty),
      }));

      return reply.send({
        success: true,
        data: enriched,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
      });
    } catch (error) {
      return handleApiError(reply, error, "TournamentController.getAll");
    }
  }

  /**
   * GET /tournaments/:id
   * Tournament details by DB id or on-chain address.
   */
  static async getOne(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = tournamentIdParamSchema.parse(req.params);


      let tournament = await TournamentModel.findById(id);
      if (!tournament) {
        tournament = await TournamentModel.findByOnChainAddress(id);
      }

      if (!tournament) return sendNotFound(reply, "Tournament");

      return sendSuccess(reply, {
        tournament: {
          ...tournament,
          difficulty_label: difficultyLabel(tournament.difficulty),
        },
      });
    } catch (error) {
      return handleApiError(reply, error, "TournamentController.getOne");
    }
  }

  /**
   * GET /tournaments/:id/leaderboard
   * Returns all entries for a tournament sorted by parimutuel weight.
   */
  static async getTournamentLeaderboard(
    req: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { id } = tournamentIdParamSchema.parse(req.params);

      let tournament = await TournamentModel.findById(id);
      if (!tournament) {
        tournament = await TournamentModel.findByOnChainAddress(id);
      }
      if (!tournament) return sendNotFound(reply, "Tournament");

      const entries = await TournamentEntryModel.findByTournament(
        tournament.on_chain_address,
      );

      const ranked = entries.map((e, i) => ({
        rank: i + 1,
        player_wallet: e.player_wallet,
        parimutuel_weight: e.parimutuel_weight,
        elapsed_secs: e.elapsed_secs,
        move_count: e.move_count,
        completed: e.completed,
        has_claimed: e.has_claimed,
        prize_claimed: e.prize_claimed,
      }));

      return sendSuccess(reply, {
        tournament_address: tournament.on_chain_address,
        entries: ranked,
      });
    } catch (error) {
      return handleApiError(
        reply,
        error,
        "TournamentController.getTournamentLeaderboard",
      );
    }
  }

  /**
   * GET /tournaments/player/:wallet
   * All tournaments a player has entered.
   */
  static async getPlayerTournaments(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { wallet } = walletParamSchema.parse(req.params);
      const entries = await TournamentEntryModel.findByPlayer(wallet);

      return sendSuccess(reply, { entries });
    } catch (error) {
      return handleApiError(
        reply,
        error,
        "TournamentController.getPlayerTournaments",
      );
    }
  }
}
