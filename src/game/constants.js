// ─────────────────────────────────────────────────────────────
// Ludo board geometry & rules constants
// The board is a 15x15 grid. The main ring has 52 cells (0..51).
// Each player has 4 tokens, an entry cell on the ring, a start
// offset, and a 6-cell private "home column" leading to the finish.
// ─────────────────────────────────────────────────────────────

export const GRID = 15; // 15 x 15 cells
export const RING_LEN = 52; // cells on the shared ring
export const HOME_COL_LEN = 6; // private column cells before the finish
export const TOKENS_PER_PLAYER = 4;

// Player identifiers / turn order (clockwise): red -> green -> yellow -> blue
export const PLAYERS = ["red", "green", "yellow", "blue"];

export const COLORS = {
  red: "#e11d48",
  green: "#16a34a",
  yellow: "#eab308",
  blue: "#2563eb",
  redSoft: "#fecdd3",
  greenSoft: "#bbf7d0",
  yellowSoft: "#fef08a",
  blueSoft: "#bfdbfe",
  board: "#f8fafc",
  line: "#cbd5e1",
  path: "#ffffff",
  dark: "#0f172a",
};

// The starting ring index where each player's token enters play.
// Standard Ludo entry cells.
export const START_INDEX = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// A token has traveled 51 ring steps from its own entry, then turns
// into the home column. HOME_ENTRY marks the ring position AFTER which
// the token diverts into the private column.
export const HOME_ENTRY_OFFSET = 51; // steps along ring before home column

// "Safe" squares — tokens here cannot be captured.
// These are the four entry cells + the four star cells (entry + 8).
export const SAFE_RING_CELLS = [
  0, 8, 13, 21, 26, 34, 39, 47,
];

// Total steps a token must travel to reach the finish:
// 51 ring steps (0..51 relative) + 6 home-column steps = 57.
// We model a token's progress as an integer "advance" from 0 (just
// entered ring) to FINISH_STEP (reached center / finished).
export const FINISH_STEP = HOME_ENTRY_OFFSET + HOME_COL_LEN; // 57

// Special progress values
export const AT_HOME = -1; // token still parked in its yard (not on board)
export const FINISHED = FINISH_STEP; // token reached the center

// Max consecutive sixes before the whole turn is forfeited.
export const MAX_SIXES = 3;
