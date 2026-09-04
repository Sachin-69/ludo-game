import React, { useRef, useEffect } from "react";
import { View, Pressable, Text, StyleSheet, Animated, Easing } from "react-native";
import { GRID, COLORS, SAFE_RING_CELLS } from "../game/constants";
import {
  RING_CELLS,
  HOME_COLUMNS,
  YARD_CELLS,
  progressToCell,
  pathCells,
} from "../game/boardPath";

// Build a lookup of which cells are "special" (colored) for painting.
function buildCellMeta() {
  const meta = {}; // "r,c" -> { type, color }
  const set = (r, c, type, color) => (meta[`${r},${c}`] = { type, color });

  RING_CELLS.forEach(([r, c], idx) => {
    set(r, c, "ring", COLORS.path);
    if (SAFE_RING_CELLS.includes(idx)) meta[`${r},${c}`].safe = true;
  });

  Object.entries(HOME_COLUMNS).forEach(([color, cells]) => {
    cells.forEach(([r, c]) => set(r, c, "home", COLORS[color]));
  });

  const entries = { red: 0, green: 13, yellow: 26, blue: 39 };
  Object.entries(entries).forEach(([color, idx]) => {
    const [r, c] = RING_CELLS[idx];
    set(r, c, "entry", COLORS[color]);
  });

  return meta;
}

const CELL_META = buildCellMeta();

const YARD_REGIONS = [
  { color: "red", r0: 0, c0: 0 },
  { color: "green", r0: 0, c0: 9 },
  { color: "blue", r0: 9, c0: 0 },
  { color: "yellow", r0: 9, c0: 9 },
];

// Per-hop animation duration (ms). Kept short so it's fast but visible.
const HOP_MS = 110;

// ── Single animated token ────────────────────────────────────
function AnimatedToken({
  color,
  tokenIndex,
  progress,
  cell,
  stackOffset,
  highlighted,
  onPress,
  onAnimStart,
  onAnimEnd,
}) {
  const pos = useRef(new Animated.ValueXY(cellToXY(progressToCell(color, progress, tokenIndex), cell))).current;
  const prevProgress = useRef(progress);
  const bounce = useRef(new Animated.Value(1)).current;

  // Compute pixel position of a [row,col] cell.
  function cellToXYlocal(rc) {
    return cellToXY(rc, cell);
  }

  useEffect(() => {
    const from = prevProgress.current;
    const to = progress;
    if (from === to) {
      // No move, but cell size may have changed — snap.
      pos.setValue(cellToXYlocal(progressToCell(color, to, tokenIndex)));
      return;
    }

    // Capture / send-home (to yard) or large jump backwards: snap instantly.
    const goingHome = to === -1;
    if (goingHome || to < from) {
      pos.setValue(cellToXYlocal(progressToCell(color, to, tokenIndex)));
      prevProgress.current = to;
      return;
    }

    // Build the hop-by-hop path and animate through it.
    const trail = pathCells(color, from, to, tokenIndex);
    if (trail.length === 0) {
      prevProgress.current = to;
      return;
    }

    onAnimStart?.();
    const steps = trail.map((rc) =>
      Animated.timing(pos, {
        toValue: cellToXYlocal(rc),
        duration: HOP_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    // Little landing bounce at the end.
    const land = Animated.sequence([
      Animated.timing(bounce, { toValue: 1.25, duration: 90, useNativeDriver: false }),
      Animated.spring(bounce, { toValue: 1, friction: 4, useNativeDriver: false }),
    ]);

    Animated.sequence([...steps, land]).start(() => {
      prevProgress.current = to;
      onAnimEnd?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, cell]);

  const dotSize = cell * 0.72;

  return (
    <Animated.View
      style={{
        position: "absolute",
        transform: [
          { translateX: Animated.add(pos.x, new Animated.Value(stackOffset)) },
          { translateY: Animated.add(pos.y, new Animated.Value(-stackOffset)) },
        ],
        zIndex: highlighted ? 30 : 10,
      }}
    >
      <Pressable disabled={!highlighted} onPress={() => onPress?.(color, tokenIndex)}>
        <Animated.View
          style={[
            styles.token,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize,
              backgroundColor: COLORS[color],
              borderColor: highlighted ? "#fff" : "rgba(0,0,0,0.35)",
              borderWidth: highlighted ? 3 : 2,
              transform: [{ scale: bounce }],
            },
            highlighted && styles.tokenGlow,
          ]}
        >
          {/* glossy highlight dot */}
          <View
            style={{
              position: "absolute",
              top: dotSize * 0.14,
              left: dotSize * 0.2,
              width: dotSize * 0.3,
              height: dotSize * 0.3,
              borderRadius: dotSize,
              backgroundColor: "rgba(255,255,255,0.55)",
            }}
          />
          <Text style={{ color: "#fff", fontSize: dotSize * 0.45, fontWeight: "800" }}>
            {tokenIndex + 1}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// [row,col] -> {x,y} top-left pixel of the token within its cell.
function cellToXY([r, c], cell) {
  return { x: c * cell + cell * 0.14, y: r * cell + cell * 0.14 };
}

export default function Board({
  state,
  size,
  highlightedTokens,
  onTokenPress,
  onAnimStart,
  onAnimEnd,
  diceSlot, // optional React node rendered at active player's corner
}) {
  const cell = size / GRID;

  // Determine stack offsets so co-located tokens don't fully overlap.
  const occ = {};
  const tokenList = [];
  Object.entries(state.tokens).forEach(([color, progresses]) => {
    progresses.forEach((progress, tokenIndex) => {
      const rc = progressToCell(color, progress, tokenIndex);
      const k = `${rc[0]},${rc[1]}`;
      occ[k] = (occ[k] || 0) + 1;
      const stackIdx = occ[k] - 1;
      const highlighted = highlightedTokens?.some(
        (h) => h.color === color && h.tokenIndex === tokenIndex
      );
      tokenList.push({ color, tokenIndex, progress, stackIdx, highlighted });
    });
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
            borderRadius: 10,
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

      {/* Path cells */}
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
            {m.safe ? (
              <Text style={{ fontSize: cell * 0.5, color: "#94a3b8" }}>★</Text>
            ) : null}
          </View>
        );
      })}

      {/* Center home */}
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
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: cell * 1.2 }}>🏁</Text>
      </View>

      {/* Tokens (animated) */}
      {tokenList.map((t) => (
        <AnimatedToken
          key={`${t.color}-${t.tokenIndex}`}
          color={t.color}
          tokenIndex={t.tokenIndex}
          progress={t.progress}
          cell={cell}
          stackOffset={t.stackIdx * (cell * 0.2)}
          highlighted={t.highlighted}
          onPress={onTokenPress}
          onAnimStart={onAnimStart}
          onAnimEnd={onAnimEnd}
        />
      ))}

      {/* Floating dice slot at active player's corner */}
      {diceSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: COLORS.board,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.dark,
    overflow: "hidden",
  },
  yardInner: { flex: 1 },
  token: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  tokenGlow: {
    shadowColor: "#fbbf24",
    shadowOpacity: 0.95,
    shadowRadius: 7,
    elevation: 10,
  },
});
