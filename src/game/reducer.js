// ─────────────────────────────────────────────────────────────
// The game reducer: given the current state + an action, returns the
// next state. This is where the CARRY-THE-6 rule is enforced.
//
// Carry-the-6 flow (as specified):
//   1. Player rolls. If it's a 6, they may CHOOSE to "carry" it.
//   2. Carrying banks the 6 and lets them roll AGAIN.
//   3. They now hold multiple dice (the 6 plus the new roll). They may
//      either apply each die to a token separately, OR combine the sum
//      onto ONE token (6 + X).
//   4. If the new roll is ALSO a 6, they may keep carrying — up to the
//      three-6s limit. Rolling a third 6 forfeits the entire turn.
//   5. If they decline to carry, they simply move with the dice held.
// ─────────────────────────────────────────────────────────────

import { MAX_SIXES } from "./constants";
import {
  rollDie,
  applyMove,
  legalMoves,
  comboMoves,
  hasAnyMove,
  nextPlayer,
  createInitialState,
  cap,
} from "./logic";

export const ACTIONS = {
  ROLL: "ROLL",
  CARRY: "CARRY", // player chooses to carry a 6 and re-roll
  DECLINE_CARRY: "DECLINE_CARRY", // stop carrying, move with dice in hand
  MOVE: "MOVE", // apply a chosen move
  END_TURN: "END_TURN", // pass to next player (auto when no moves)
  RESET: "RESET",
};

export function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.RESET:
      return createInitialState(action.players, action.isBot);

    case ACTIONS.ROLL: {
      if (!state.awaitingRoll) return state;
      const die = action.forced ?? rollDie();
      let sixCount = die === 6 ? state.sixCount + 1 : state.sixCount;

      // Three sixes in a row => forfeit the whole turn.
      if (die === 6 && sixCount >= MAX_SIXES) {
        return endTurn({
          ...state,
          lastRoll: die,
          sixCount: 0,
          pendingDice: [],
          carrying: false,
          message: `${cap(state.turn)} rolled three 6s — turn forfeited!`,
        });
      }

      const pendingDice = [...state.pendingDice, die];
      const next = {
        ...state,
        lastRoll: die,
        sixCount,
        pendingDice,
        awaitingRoll: false,
        message:
          die === 6
            ? `${cap(state.turn)} rolled a 6! Carry it and roll again, or move.`
            : `${cap(state.turn)} rolled a ${die}.`,
      };

      // If the player has no legal move at all with the dice in hand
      // AND cannot carry (die !== 6), the turn ends automatically.
      const canMove =
        hasAnyMove(next, state.turn) ||
        comboMoves(next, state.turn).length > 0;
      const canCarry = die === 6 && sixCount < MAX_SIXES;

      if (!canMove && !canCarry) {
        return endTurn({
          ...next,
          message: `${cap(state.turn)} rolled a ${die} — no moves available.`,
        });
      }
      return next;
    }

    case ACTIONS.CARRY: {
      // Only valid if the last roll was a 6 and we haven't hit the cap.
      if (state.lastRoll !== 6) return state;
      if (state.sixCount >= MAX_SIXES) return state;
      return {
        ...state,
        carrying: true,
        awaitingRoll: true, // roll again
        message: `${cap(state.turn)} carried the 6 — roll again!`,
      };
    }

    case ACTIONS.DECLINE_CARRY: {
      // Stop carrying; player will now move with the dice in hand.
      return {
        ...state,
        carrying: false,
        awaitingRoll: false,
        message: `${cap(state.turn)} will move with the dice in hand.`,
      };
    }

    case ACTIONS.MOVE: {
      const moved = applyMove(state, state.turn, action.move);

      // If dice remain to spend, the same player keeps moving.
      if (moved.pendingDice.length > 0) {
        // Ensure at least one legal move remains with leftover dice.
        const stillMovable =
          hasAnyMove(moved, state.turn) ||
          comboMoves(moved, state.turn).length > 0;
        if (stillMovable) {
          return { ...moved, awaitingRoll: false };
        }
        // Leftover dice are unusable — discard and finish the turn
        // (unless a bonus turn was earned).
      }

      // No dice left. Bonus turn (capture/finish) => roll again.
      if (moved.bonusTurn) {
        return {
          ...moved,
          pendingDice: [],
          awaitingRoll: true,
          sixCount: 0,
          carrying: false,
          message: `${moved.message} Bonus roll!`,
        };
      }

      return endTurn(moved);
    }

    case ACTIONS.END_TURN:
      return endTurn(state);

    default:
      return state;
  }
}

// Pass play to the next eligible player and reset per-turn dice state.
function endTurn(state) {
  const turn = nextPlayer(state);
  return {
    ...state,
    turn,
    pendingDice: [],
    lastRoll: null,
    sixCount: 0,
    carrying: false,
    awaitingRoll: true,
    bonusTurn: false,
    message: state.message
      ? `${state.message}  Next: ${cap(turn)}.`
      : `${cap(turn)}'s turn.`,
  };
}
