// ─────────────────────────────────────────────────────────────
// Simple greedy bot. Picks a move by heuristic priority:
//   1. Capture an opponent.
//   2. Move a token into its home column / finish.
//   3. Bring a token out of the yard (on a 6).
//   4. Advance the furthest token.
// Also decides whether to carry a 6 (always carries unless it would
// be the risky third six).
// ─────────────────────────────────────────────────────────────

import { legalMoves, comboMoves } from "./logic";
import { ringIndexOf } from "./boardPath";
import { HOME_ENTRY_OFFSET, FINISHED, MAX_SIXES, SAFE_RING_CELLS } from "./constants";

export function botShouldCarry(state) {
  // Carry unless carrying would trigger the third-six forfeit risk.
  return state.lastRoll === 6 && state.sixCount < MAX_SIXES - 1;
}

export function botChooseMove(state) {
  const player = state.turn;
  const all = [...legalMoves(state, player), ...comboMoves(state, player)];
  if (all.length === 0) return null;

  const opponentRings = new Set();
  Object.keys(state.tokens).forEach((color) => {
    if (color === player) return;
    state.tokens[color].forEach((p) => {
      const r = ringIndexOf(color, p);
      if (r !== null && !SAFE_RING_CELLS.includes(r)) opponentRings.add(r);
    });
  });

  const scored = all.map((m) => {
    let score = 0;
    const destRing = ringIndexOf(player, m.to);
    if (destRing !== null && opponentRings.has(destRing)) score += 100; // capture
    if (m.to === FINISHED) score += 80; // finish
    if (m.to >= HOME_ENTRY_OFFSET) score += 40; // enter home column
    if (m.from === -1) score += 30; // leave yard
    score += m.to; // general progress
    return { move: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}
