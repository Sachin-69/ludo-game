// ─────────────────────────────────────────────────────────────
// Pure game logic. No React here. All functions are deterministic
// given their inputs (dice is the only randomness, isolated below).
// ─────────────────────────────────────────────────────────────

import {
  TOKENS_PER_PLAYER,
  AT_HOME,
  FINISH_STEP,
  FINISHED,
  HOME_ENTRY_OFFSET,
  SAFE_RING_CELLS,
} from "./constants";
import { ringIndexOf } from "./boardPath";

// ── State factory ────────────────────────────────────────────

// activePlayers: ordered array of colors actually playing (2-4).
// isBot: { color: boolean }
export function createInitialState(activePlayers, isBot = {}) {
  const tokens = {};
  activePlayers.forEach((color) => {
    tokens[color] = Array.from({ length: TOKENS_PER_PLAYER }, () => AT_HOME);
  });
  return {
    players: [...activePlayers],
    isBot: { ...isBot },
    tokens, // { color: [progress x4] }
    turn: activePlayers[0],
    // Dice / carry-6 turn state:
    pendingDice: [], // array of dice values available to spend this turn
    lastRoll: null, // most recent single die value
    sixCount: 0, // consecutive sixes this turn
    carrying: false, // true while player has chosen to carry a 6
    awaitingRoll: true, // true => player must roll; false => must move
    winners: [], // colors that finished all tokens, in order
    message: "",
  };
}

// ── Dice ─────────────────────────────────────────────────────

export function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

// ── Move calculation ─────────────────────────────────────────

// Given a token's current progress and a die value, compute the
// resulting progress, or null if the move is illegal.
export function computeDestination(progress, die) {
  // Token in yard: only a 6 can bring it out (lands on ring step 0).
  if (progress === AT_HOME) {
    return die === 6 ? 0 : null;
  }
  if (progress === FINISHED) return null; // already home
  const dest = progress + die;
  // Exact roll needed to finish. Overshooting the center is illegal.
  if (dest > FINISH_STEP) return null;
  return dest;
}

// List every legal (tokenIndex, die, destination) move for a player
// given the current pendingDice. Returns array of move objects.
export function legalMoves(state, player) {
  const moves = [];
  const dice = state.pendingDice;
  const progresses = state.tokens[player];
  // Deduplicate identical die values so we don't list twins twice,
  // but keep index into pendingDice for consumption.
  dice.forEach((die, dieIdx) => {
    progresses.forEach((progress, tokenIndex) => {
      const dest = computeDestination(progress, die);
      if (dest !== null) {
        moves.push({ tokenIndex, die, dieIdx, from: progress, to: dest });
      }
    });
  });
  return moves;
}

// Combined-move helper for carry-6: when a player has multiple dice,
// they may apply the SUM to a single token. This lists those combo
// moves (e.g. 6 + 4 = 10 on one token).
export function comboMoves(state, player) {
  const dice = state.pendingDice;
  if (dice.length < 2) return [];
  const sum = dice.reduce((a, b) => a + b, 0);
  const moves = [];
  state.tokens[player].forEach((progress, tokenIndex) => {
    // A combo can't bring a token out of the yard unless one die is a
    // 6 used to exit first; we keep combos for tokens already on board.
    if (progress === AT_HOME) return;
    const dest = computeDestination(progress, sum);
    if (dest !== null) {
      moves.push({
        tokenIndex,
        die: sum,
        combo: true,
        diceUsed: [...dice],
        from: progress,
        to: dest,
      });
    }
  });
  return moves;
}

// Whether the player has ANY legal move with current dice.
export function hasAnyMove(state, player) {
  return legalMoves(state, player).length > 0;
}

// ── Capture ──────────────────────────────────────────────────

function isSafeCell(ringIdx) {
  return SAFE_RING_CELLS.includes(ringIdx);
}

// After a token moves to `destProgress`, capture any opponent tokens
// sharing the same ring cell (unless that cell is safe). Mutates a
// cloned tokens map and returns { tokens, captured: [...] }.
function applyCapture(tokensMap, mover, movedTokenIndex, destProgress) {
  const captured = [];
  const destRing = ringIndexOf(mover, destProgress);
  if (destRing === null) return { captured }; // in home column, no capture
  if (isSafeCell(destRing)) return { captured }; // safe square, no capture

  Object.keys(tokensMap).forEach((color) => {
    if (color === mover) return;
    tokensMap[color].forEach((p, idx) => {
      const r = ringIndexOf(color, p);
      if (r === destRing) {
        // Send opponent back to yard.
        tokensMap[color][idx] = AT_HOME;
        captured.push({ color, tokenIndex: idx });
      }
    });
  });
  return { captured };
}

// ── Apply a move ─────────────────────────────────────────────

// Returns a NEW state after applying `move` for `player`.
// Consumes the die/dice used from pendingDice.
export function applyMove(state, player, move) {
  const tokens = cloneTokens(state.tokens);
  tokens[player][move.tokenIndex] = move.to;

  // Handle capture.
  const { captured } = applyCapture(tokens, player, move.tokenIndex, move.to);

  // Consume dice.
  let pending = [...state.pendingDice];
  if (move.combo) {
    // remove all dice used in the combo (all of them summed)
    pending = [];
  } else {
    pending.splice(move.dieIdx, 1);
  }

  // Track finishing.
  const finishedNow = move.to === FINISHED;

  let message = "";
  if (captured.length > 0) {
    message = `${cap(player)} captured ${captured.length} token${
      captured.length > 1 ? "s" : ""
    }!`;
  } else if (finishedNow) {
    message = `${cap(player)} sent a token home! 🎉`;
  }

  // Did this player just finish all tokens?
  const winners = [...state.winners];
  const allFinished = tokens[player].every((p) => p === FINISHED);
  if (allFinished && !winners.includes(player)) {
    winners.push(player);
    message = `${cap(player)} has won! 🏆`;
  }

  return {
    ...state,
    tokens,
    pendingDice: pending,
    winners,
    // A capture or a finish grants an extra roll (bonus turn).
    bonusTurn: captured.length > 0 || finishedNow,
    message,
  };
}

// ── Turn resolution ──────────────────────────────────────────

export function cloneTokens(t) {
  const c = {};
  Object.keys(t).forEach((k) => (c[k] = [...t[k]]));
  return c;
}

export function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Next player still in the game (skips finished players).
export function nextPlayer(state) {
  const list = state.players;
  const idx = list.indexOf(state.turn);
  for (let step = 1; step <= list.length; step++) {
    const cand = list[(idx + step) % list.length];
    if (!state.winners.includes(cand)) return cand;
  }
  return state.turn;
}

// Is the whole game over? (all but one player has finished, or only
// one player remains). For simplicity: game ends when players-1 have
// won, or a single winner in heads-up.
export function isGameOver(state) {
  const remaining = state.players.filter((p) => !state.winners.includes(p));
  return remaining.length <= 1 && state.winners.length >= 1;
}
