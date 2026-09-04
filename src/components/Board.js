import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { GRID, COLORS, SAFE_RING_CELLS, AT_HOME } from "../game/constants";
import {
  RING_CELLS,
  HOME_COLUMNS,
  YARD_CELLS,
  progressToCell,
  ringIndexOf,
} from "../game/boardPath";

// Build a lookup of which cells are "special" (colored) for painting.
function buildCellMeta() {
  const meta = {}; // "r,c" -> { type, color }
  const set = (r, c, type, color) => (meta[`${r},${c}`] = { type, color });

  // Ring cells default to path color.
  RING_CELLS.forEach(([r, c], idx) => {
    set(r, c, "ring", COLORS.path);
    if (SAFE_RING_CELLS.includes(idx)) meta[`${r},${c}`].safe = true;
  });

  // Home columns colored per player.
  Object.entries(HOME_COLUMNS).forEach(([color, cells]) => {
    cells.forEach(([r, c]) => set(r, c, "home", COLORS[color]));
  });

  // Entry cells colored per player.
  const entries = { red: 0, green: 13, yellow: 26, blue: 39 };
  Object.entries(entries).forEach(([color, idx]) => {
    const [r, c] = RING_CELLS[idx];
    set(r, c, "entry", COLORS[color]);
  });

  return meta;
}

const CELL_META = buildCellMeta();

// The four large colored corner yards.
const YARD_REGIONS = [
  { color: "red", r0: 0, c0: 0 },
  { color: "green", r0: 0, c0: 9 },
  { color: "blue", r0: 9, c0: 0 },
  { color: "yellow", r0: 9, c0: 9 },
];

export default function Board({ state, size, highlightedTokens, onTokenPress }) {
  const cell = size / GRID;

  // Map every token to its pixel position.
  const tokenDots = [];
  Object.entries(state.tokens).forEach(([color, progresses]) => {
    progresses.forEach((progress, tokenIndex) => {
      const [r, c] = progressToCell(color, progress, tokenIndex);
      const key = `${color}-${tokenIndex}`;
      const highlighted = highlightedTokens?.some(
        (h) => h.color === color && h.tokenIndex === tokenIndex
      );
      tokenDots.push({ color, tokenIndex, r, c, key, highlighted, progress });
    });
  });

  // Stack offset so multiple tokens on the same cell don't fully overlap.
  const cellOccupants = {};
  tokenDots.forEach((t) => {
    const k = `${t.r},${t.c}`;
    cellOccupants[k] = (cellOccupants[k] || 0) + 1;
    t.stackIdx = cellOccupants[k] - 1;
  });

  return (
    <View style={[styles.board, { width: size, height: size }]}>
      {/* Corner yards */}
      {YARD_REGIONS.map((y) => (
        <View
          key={y.color}
          style={{
            position: "absolute",
            left: y.c0 * cell,
            top: y.r0 * cell,
            width: cell * 6,
            height: cell * 6,
            backgroundColor: COLORS[y.color + "Soft"],
            borderWidth: 2,
            borderColor: COLORS[y.color],
            borderRadius: 8,
          }}
        >
          <View style={styles.yardInner}>
            {YARD_CELLS[y.color].map(([r, c], i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: (c - y.c0) * cell - cell * 0.15,
                  top: (r - y.r0) * cell - cell * 0.15,
                  width: cell * 1.3,
                  height: cell * 1.3,
                  borderRadius: cell,
                  backgroundColor: "#fff",
                  borderWidth: 2,
                  borderColor: COLORS[y.color],
                }}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Path cells (ring + home columns) */}
      {Object.entries(CELL_META).map(([k, m]) => {
        const [r, c] = k.split(",").map(Number);
        return (
          <View
            key={k}
            style={{
              position: "absolute",
              left: c * cell,
              top: r * cell,
              width: cell,
              height: cell,
              backgroundColor: m.color,
              borderWidth: 0.5,
              borderColor: COLORS.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {m.safe ? <Text style={{ fontSize: cell * 0.5 }}>★</Text> : null}
          </View>
        );
      })}

      {/* Center triangle / home */}
      <View
        style={{
          position: "absolute",
          left: 6 * cell,
          top: 6 * cell,
          width: cell * 3,
          height: cell * 3,
          backgroundColor: COLORS.dark,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: cell * 1.2 }}>🏁</Text>
      </View>

      {/* Tokens */}
      {tokenDots.map((t) => {
        const offset = t.stackIdx * (cell * 0.18);
        const dot = (
          <View
            style={[
              styles.token,
              {
                width: cell * 0.72,
                height: cell * 0.72,
                borderRadius: cell,
                backgroundColor: COLORS[t.color],
                borderColor: t.highlighted ? "#fff" : "rgba(0,0,0,0.3)",
                borderWidth: t.highlighted ? 3 : 2,
              },
              t.highlighted && styles.tokenGlow,
            ]}
          >
            <Text style={{ color: "#fff", fontSize: cell * 0.35, fontWeight: "800" }}>
              {t.tokenIndex + 1}
            </Text>
          </View>
        );
        return (
          <Pressable
            key={t.key}
            disabled={!t.highlighted}
            onPress={() => onTokenPress?.(t.color, t.tokenIndex)}
            style={{
              position: "absolute",
              left: t.c * cell + cell * 0.14 + offset,
              top: t.r * cell + cell * 0.14 - offset,
              zIndex: t.highlighted ? 20 : 10 + t.stackIdx,
            }}
          >
            {dot}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: COLORS.board,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.dark,
    overflow: "hidden",
  },
  yardInner: { flex: 1 },
  token: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  tokenGlow: {
    shadowColor: "#fbbf24",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 8,
  },
});
