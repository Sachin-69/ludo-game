import React, { useRef, useEffect } from "react";
import { View, Pressable, Text, StyleSheet, Animated, Easing, Image } from "react-native";
import { GRID, COLORS, SAFE_RING_CELLS } from "../game/constants";
import {
  RING_CELLS,
  HOME_COLUMNS,
  YARD_CELLS,
  progressToCell,
  pathCells,
} from "../game/boardPath";
import { PAWN_IMAGES } from "../assets";

// ── Build painted-cell metadata (matches the grid math exactly) ──
function buildCellMeta() {
  const meta = {};
  const set = (r, c, color, extra = {}) =>
    (meta[`${r},${c}`] = { color, ...extra });

  RING_CELLS.forEach(([r, c], idx) => {
    set(r, c, COLORS.path);
    if (SAFE_RING_CELLS.includes(idx)) meta[`${r},${c}`].safe = true;
  });

  Object.entries(HOME_COLUMNS).forEach(([color, cells]) => {
    cells.forEach(([r, c]) => set(r, c, COLORS[color]));
  });

  const entries = { red: 0, green: 13, yellow: 26, blue: 39 };
  Object.entries(entries).forEach(([color, idx]) => {
    const [r, c] = RING_CELLS[idx];
    set(r, c, COLORS[color], { entry: true });
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

const HOP_MS = 110;

// ── Animated pawn (custom image) ─────────────────────────────
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
  const pos = useRef(
    new Animated.ValueXY(cellToXY(progressToCell(color, progress, tokenIndex), cell))
  ).current;
  const prevProgress = useRef(progress);
  const bounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const from = prevProgress.current;
    const to = progress;
    if (from === to) {
      pos.setValue(cellToXY(progressToCell(color, to, tokenIndex), cell));
      return;
    }
    const goingHome = to === -1;
    if (goingHome || to < from) {
      pos.setValue(cellToXY(progressToCell(color, to, tokenIndex), cell));
      prevProgress.current = to;
      return;
    }
    const trail = pathCells(color, from, to, tokenIndex);
    if (trail.length === 0) {
      prevProgress.current = to;
      return;
    }
    onAnimStart?.();
    const steps = trail.map((rc) =>
      Animated.timing(pos, {
        toValue: cellToXY(rc, cell),
        duration: HOP_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    const land = Animated.sequence([
      Animated.timing(bounce, { toValue: 1.22, duration: 90, useNativeDriver: false }),
      Animated.spring(bounce, { toValue: 1, friction: 4, useNativeDriver: false }),
    ]);
    Animated.sequence([...steps, land]).start(() => {
      prevProgress.current = to;
      onAnimEnd?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, cell]);

  // Pawn fits inside a cell (slightly smaller) so it never overlaps.
  const pawnSize = cell * 0.86;
  const inset = (cell - pawnSize) / 2;

  return (
    <Animated.View
      style={{
        position: "absolute",
        transform: [
          { translateX: Animated.add(pos.x, new Animated.Value(stackOffset + inset)) },
          { translateY: Animated.add(pos.y, new Animated.Value(-stackOffset + inset)) },
        ],
        zIndex: highlighted ? 30 : 10,
      }}
    >
      <Pressable disabled={!highlighted} onPress={() => onPress?.(color, tokenIndex)}>
        <Animated.View
          style={[
            { width: pawnSize, height: pawnSize, transform: [{ scale: bounce }] },
            highlighted && styles.highlight,
          ]}
        >
          <Image
            source={PAWN_IMAGES[color]}
            style={{ width: pawnSize, height: pawnSize }}
            resizeMode="contain"
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function cellToXY([r, c], cell) {
  return { x: c * cell, y: r * cell };
}

export default function Board({
  state,
  size,
  highlightedTokens,
  onTokenPress,
  onAnimStart,
  onAnimEnd,
  diceSlot,
}) {
  const cell = size / GRID;

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
            borderRadius: 12,
          }}
        >
          {/* Inner white pad */}
          <View
            style={{
              position: "absolute",
              left: cell * 0.9,
              top: cell * 0.9,
              width: cell * 4.2,
              height: cell * 4.2,
              backgroundColor: "#fff",
              borderRadius: 10,
              borderWidth: 2,
              borderColor: COLORS[y.color],
            }}
          />
          {YARD_CELLS[y.color].map(([r, c], i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: (c - y.c0) * cell + cell * 0.05,
                top: (r - y.r0) * cell + cell * 0.05,
                width: cell * 0.9,
                height: cell * 0.9,
                borderRadius: cell,
                backgroundColor: "#fff",
                borderWidth: 2.5,
                borderColor: COLORS[y.color],
              }}
            />
          ))}
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
            {m.safe && !m.entry ? (
              <Text style={{ fontSize: cell * 0.5, color: "#94a3b8" }}>★</Text>
            ) : null}
          </View>
        );
      })}

      {/* Center home with 4 triangles */}
      <View
        style={{
          position: "absolute",
          left: 6 * cell,
          top: 6 * cell,
          width: cell * 3,
          height: cell * 3,
          overflow: "hidden",
        }}
      >
        {/* red top */}
        <View style={triangle(cell * 3, "top", COLORS.red)} />
        {/* blue left */}
        <View style={triangle(cell * 3, "left", COLORS.blue)} />
        {/* yellow bottom */}
        <View style={triangle(cell * 3, "bottom", COLORS.yellow)} />
        {/* green right */}
        <View style={triangle(cell * 3, "right", COLORS.green)} />
      </View>

      {/* Pawns */}
      {tokenList.map((t) => (
        <AnimatedToken
          key={`${t.color}-${t.tokenIndex}`}
          color={t.color}
          tokenIndex={t.tokenIndex}
          progress={t.progress}
          cell={cell}
          stackOffset={t.stackIdx * (cell * 0.18)}
          highlighted={t.highlighted}
          onPress={onTokenPress}
          onAnimStart={onAnimStart}
          onAnimEnd={onAnimEnd}
        />
      ))}

      {diceSlot}
    </View>
  );
}

// Build a CSS-triangle filling one side of a square of side `s`.
function triangle(s, dir, color) {
  const half = s / 2;
  const base = {
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
  };
  switch (dir) {
    case "top":
      return {
        ...base,
        left: 0,
        top: 0,
        borderLeftWidth: half,
        borderRightWidth: half,
        borderTopWidth: half,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: color,
      };
    case "bottom":
      return {
        ...base,
        left: 0,
        bottom: 0,
        borderLeftWidth: half,
        borderRightWidth: half,
        borderBottomWidth: half,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: color,
      };
    case "left":
      return {
        ...base,
        left: 0,
        top: 0,
        borderTopWidth: half,
        borderBottomWidth: half,
        borderLeftWidth: half,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: color,
      };
    case "right":
    default:
      return {
        ...base,
        right: 0,
        top: 0,
        borderTopWidth: half,
        borderBottomWidth: half,
        borderRightWidth: half,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: color,
      };
  }
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: COLORS.board,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: COLORS.dark,
    overflow: "hidden",
  },
  highlight: {
    shadowColor: "#fbbf24",
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
