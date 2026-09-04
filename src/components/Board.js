import React, { useRef, useEffect } from "react";
import { View, Pressable, StyleSheet, Animated, Easing, Image } from "react-native";
import { GRID } from "../game/constants";
import { progressToCell, pathCells } from "../game/boardPath";
import { PAWN_IMAGES, BOARD_IMAGE } from "../assets";

// Per-hop animation duration (ms).
const HOP_MS = 110;

// ── Single animated pawn ─────────────────────────────────────
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

  // Pawn is drawn a bit larger than a cell for a chunky look.
  const pawnSize = cell * 1.05;
  const inset = (cell - pawnSize) / 2; // center within the cell

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
            {
              width: pawnSize,
              height: pawnSize,
              transform: [{ scale: bounce }],
            },
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

// [row,col] -> {x,y} top-left pixel of the cell.
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

  // Stack offsets for co-located pawns.
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
      {/* Board image */}
      <Image
        source={BOARD_IMAGE}
        style={{ position: "absolute", width: size, height: size }}
        resizeMode="stretch"
      />

      {/* Pawns (animated) */}
      {tokenList.map((t) => (
        <AnimatedToken
          key={`${t.color}-${t.tokenIndex}`}
          color={t.color}
          tokenIndex={t.tokenIndex}
          progress={t.progress}
          cell={cell}
          stackOffset={t.stackIdx * (cell * 0.22)}
          highlighted={t.highlighted}
          onPress={onTokenPress}
          onAnimStart={onAnimStart}
          onAnimEnd={onAnimEnd}
        />
      ))}

      {/* Floating dice slot */}
      {diceSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 14,
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
