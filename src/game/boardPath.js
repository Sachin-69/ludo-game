// ─────────────────────────────────────────────────────────────
// Maps abstract token progress -> physical (row, col) on the 15x15
// grid. Coordinates are [row, col], 0-indexed, top-left origin.
//
// RING_CELLS: the 52 shared-ring cells in clockwise order starting
// at RED's entry cell. Index 0 == red entry.
//
// HOME_COLUMNS: each player's 6 private cells leading to the center,
// ordered from the ring toward the middle.
// ─────────────────────────────────────────────────────────────

// The 52 ring cells in clockwise travel order, index 0 = red start.
// Hand-laid to match a standard Ludo cross layout.
export const RING_CELLS = [
  // Red arm (starts on left, moving right along row 6)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // top / green approach
  [0, 7],
  // Green arm (moving down column 8)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // right / yellow approach
  [7, 14],
  // Yellow arm (moving left along row 8)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // bottom / blue approach
  [14, 7],
  // Blue arm (moving up column 6)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // left / back to red approach
  [7, 0],
];

// Private home columns (6 cells each), from ring side toward center.
export const HOME_COLUMNS = {
  red: [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
  ],
  green: [
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
  ],
  yellow: [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8],
  ],
  blue: [
    [13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7],
  ],
};

// The four yard (parking) cells for each player's un-started tokens.
export const YARD_CELLS = {
  red: [
    [2, 2], [2, 3], [3, 2], [3, 3],
  ],
  green: [
    [2, 11], [2, 12], [3, 11], [3, 12],
  ],
  yellow: [
    [11, 11], [11, 12], [12, 11], [12, 12],
  ],
  blue: [
    [11, 2], [11, 3], [12, 2], [12, 3],
  ],
};

import { START_INDEX, HOME_ENTRY_OFFSET, RING_LEN, AT_HOME, FINISHED } from "./constants";

// Convert a token's (player, progress) into a grid [row, col].
// progress: AT_HOME (-1) => in yard; 0..50 => on ring; 51..56 => home column; 57 => finished (center).
export function progressToCell(player, progress, tokenIndex) {
  if (progress === AT_HOME) {
    return YARD_CELLS[player][tokenIndex];
  }
  if (progress >= HOME_ENTRY_OFFSET) {
    // In home column. progress 51 -> column[0] ... 56 -> column[5], 57 -> center
    const colIdx = progress - HOME_ENTRY_OFFSET; // 0..5, or 6 for center
    if (colIdx >= HOME_COLUMNS[player].length) {
      return [7, 7]; // center / finished
    }
    return HOME_COLUMNS[player][colIdx];
  }
  // On the shared ring.
  const ringIdx = (START_INDEX[player] + progress) % RING_LEN;
  return RING_CELLS[ringIdx];
}

// The absolute ring index a token occupies (for capture checks).
// Returns null if the token is not on the shared ring.
export function ringIndexOf(player, progress) {
  if (progress < 0 || progress >= HOME_ENTRY_OFFSET) return null;
  return (START_INDEX[player] + progress) % RING_LEN;
}

// Returns the ordered list of [row,col] cells a token passes THROUGH,
// step by step, moving from `fromProgress` to `toProgress`. Used to
// animate the hop-by-hop movement. Excludes the starting cell, includes
// the destination. Handles leaving the yard (fromProgress === AT_HOME).
export function pathCells(player, fromProgress, toProgress, tokenIndex) {
  const cells = [];
  // Leaving the yard: single hop onto the entry cell (progress 0).
  if (fromProgress === AT_HOME) {
    cells.push(progressToCell(player, 0, tokenIndex));
    // If somehow the destination is beyond 0, continue stepping.
    for (let p = 1; p <= toProgress; p++) {
      cells.push(progressToCell(player, p, tokenIndex));
    }
    return cells;
  }
  for (let p = fromProgress + 1; p <= toProgress; p++) {
    cells.push(progressToCell(player, p, tokenIndex));
  }
  return cells;
}
