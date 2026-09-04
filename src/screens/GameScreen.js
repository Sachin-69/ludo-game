import React, { useReducer, useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import Board from "../components/Board";
import Dice from "../components/Dice";
import { COLORS } from "../game/constants";
import { gameReducer, ACTIONS } from "../game/reducer";
import {
  createInitialState,
  legalMoves,
  comboMoves,
  cap,
  isGameOver,
} from "../game/logic";
import { botChooseMove, botShouldCarry } from "../game/bot";

export default function GameScreen({ players, isBot, onExit }) {
  const [state, dispatch] = useReducer(
    gameReducer,
    { players, isBot },
    ({ players, isBot }) => createInitialState(players, isBot)
  );
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 380);
  const [rolling, setRolling] = useState(false);

  const currentIsBot = state.isBot[state.turn];
  const gameOver = isGameOver(state);

  // Available moves given current dice.
  const singleMoves = useMemo(
    () => (state.awaitingRoll ? [] : legalMoves(state, state.turn)),
    [state]
  );
  const combos = useMemo(
    () => (state.awaitingRoll ? [] : comboMoves(state, state.turn)),
    [state]
  );

  // Tokens the human can currently tap.
  const highlighted = useMemo(() => {
    if (state.awaitingRoll || currentIsBot) return [];
    const set = new Map();
    [...singleMoves, ...combos].forEach((m) => {
      set.set(m.tokenIndex, { color: state.turn, tokenIndex: m.tokenIndex });
    });
    return Array.from(set.values());
  }, [singleMoves, combos, state.turn, state.awaitingRoll, currentIsBot]);

  // Whether a carry choice is currently offered (human only).
  const canOfferCarry =
    !state.awaitingRoll &&
    state.lastRoll === 6 &&
    state.sixCount < 3 &&
    !currentIsBot;

  // For choosing a specific die/combo when a token has multiple options.
  const [pendingToken, setPendingToken] = useState(null);

  const handleRoll = () => {
    if (rolling) return;
    setRolling(true);
    setTimeout(() => {
      dispatch({ type: ACTIONS.ROLL });
      setRolling(false);
    }, 350);
  };

  const handleTokenPress = (color, tokenIndex) => {
    if (color !== state.turn) return;
    const opts = [
      ...singleMoves.filter((m) => m.tokenIndex === tokenIndex),
      ...combos.filter((m) => m.tokenIndex === tokenIndex),
    ];
    if (opts.length === 0) return;
    if (opts.length === 1) {
      dispatch({ type: ACTIONS.MOVE, move: opts[0] });
      setPendingToken(null);
    } else {
      // Multiple ways to move this token (different dice / combo).
      setPendingToken({ tokenIndex, opts });
    }
  };

  const chooseMove = (move) => {
    dispatch({ type: ACTIONS.MOVE, move });
    setPendingToken(null);
  };

  // ── Bot automation ────────────────────────────────────────
  useEffect(() => {
    if (gameOver) return;
    if (!currentIsBot) return;

    const t = setTimeout(() => {
      if (state.awaitingRoll) {
        setRolling(true);
        setTimeout(() => {
          dispatch({ type: ACTIONS.ROLL });
          setRolling(false);
        }, 300);
        return;
      }
      // Bot has dice. Decide carry vs move.
      if (state.lastRoll === 6 && state.sixCount < 3 && botShouldCarry(state)) {
        // Only carry if it still has yard tokens or wants extra distance.
        dispatch({ type: ACTIONS.CARRY });
        return;
      }
      const move = botChooseMove(state);
      if (move) {
        dispatch({ type: ACTIONS.MOVE, move });
      } else {
        dispatch({ type: ACTIONS.END_TURN });
      }
    }, 650);
    return () => clearTimeout(t);
  }, [state, currentIsBot, gameOver]);

  // Auto-clear pending token selection when turn changes.
  useEffect(() => setPendingToken(null), [state.turn, state.pendingDice.length]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onExit} style={styles.exitBtn}>
            <Text style={styles.exitText}>‹ Menu</Text>
          </Pressable>
          <View style={styles.turnPill}>
            <View
              style={[styles.turnDot, { backgroundColor: COLORS[state.turn] }]}
            />
            <Text style={styles.turnText}>
              {cap(state.turn)}
              {currentIsBot ? " (CPU)" : ""}
            </Text>
          </View>
        </View>

        {/* Message banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{state.message || "Roll to begin!"}</Text>
        </View>

        {/* Dice-in-hand indicator */}
        {state.pendingDice.length > 0 && (
          <View style={styles.diceRow}>
            <Text style={styles.diceLabel}>Dice in hand:</Text>
            {state.pendingDice.map((d, i) => (
              <View key={i} style={styles.miniDie}>
                <Text style={styles.miniDieText}>{d}</Text>
              </View>
            ))}
            {state.pendingDice.length > 1 && (
              <Text style={styles.sumText}>
                (sum {state.pendingDice.reduce((a, b) => a + b, 0)})
              </Text>
            )}
          </View>
        )}

        {/* Board */}
        <View style={styles.boardWrap}>
          <Board
            state={state}
            size={boardSize}
            highlightedTokens={highlighted}
            onTokenPress={handleTokenPress}
          />
        </View>

        {/* Controls */}
        {!gameOver && !currentIsBot && (
          <View style={styles.controls}>
            {state.awaitingRoll ? (
              <Dice
                value={state.lastRoll}
                color={COLORS[state.turn]}
                onRoll={handleRoll}
                disabled={rolling}
                rolling={rolling}
              />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Dice
                  value={state.lastRoll}
                  color={COLORS[state.turn]}
                  disabled={true}
                  rolling={rolling}
                />
                {/* CARRY-THE-6 choice */}
                {canOfferCarry && (
                  <View style={styles.carryRow}>
                    <Pressable
                      style={[styles.carryBtn, { backgroundColor: "#fbbf24" }]}
                      onPress={() => dispatch({ type: ACTIONS.CARRY })}
                    >
                      <Text style={styles.carryText}>⭐ CARRY THE 6 & ROLL AGAIN</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.carryBtn, styles.carryDecline]}
                      onPress={() => dispatch({ type: ACTIONS.DECLINE_CARRY })}
                    >
                      <Text style={styles.carryDeclineText}>Move now</Text>
                    </Pressable>
                  </View>
                )}
                {!canOfferCarry && (
                  <Text style={styles.hint}>
                    {highlighted.length > 0
                      ? "Tap a highlighted token to move."
                      : "No moves — passing turn…"}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {currentIsBot && !gameOver && (
          <View style={styles.controls}>
            <Text style={styles.thinking}>Computer is thinking…</Text>
          </View>
        )}

        {/* Winners */}
        {state.winners.length > 0 && (
          <View style={styles.winners}>
            <Text style={styles.winnersTitle}>🏆 Finished</Text>
            {state.winners.map((w, i) => (
              <Text key={w} style={styles.winnerLine}>
                {i + 1}. {cap(w)}
              </Text>
            ))}
          </View>
        )}

        {gameOver && (
          <View style={styles.gameOver}>
            <Text style={styles.gameOverText}>Game Over!</Text>
            <Text style={styles.gameOverWinner}>
              Winner: {cap(state.winners[0])} 🎉
            </Text>
            <Pressable style={styles.againBtn} onPress={onExit}>
              <Text style={styles.againText}>Play Again</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Multi-option move picker modal */}
      {pendingToken && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Move token {pendingToken.tokenIndex + 1} using:
            </Text>
            {pendingToken.opts.map((m, i) => (
              <Pressable
                key={i}
                style={styles.optBtn}
                onPress={() => chooseMove(m)}
              >
                <Text style={styles.optText}>
                  {m.combo
                    ? `Combine dice → move ${m.die} (${m.diceUsed.join(" + ")})`
                    : `Move ${m.die}`}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setPendingToken(null)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.dark },
  scroll: { padding: 12, paddingTop: 50, alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
  },
  exitBtn: { padding: 8 },
  exitText: { color: "#94a3b8", fontSize: 16, fontWeight: "600" },
  turnPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  turnDot: { width: 16, height: 16, borderRadius: 8, marginRight: 8 },
  turnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  banner: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: "100%",
    marginBottom: 8,
    minHeight: 42,
    justifyContent: "center",
  },
  bannerText: { color: "#e2e8f0", fontSize: 14, textAlign: "center" },
  diceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  diceLabel: { color: "#94a3b8", fontSize: 13, marginRight: 4 },
  miniDie: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#fbbf24",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  miniDieText: { fontWeight: "900", fontSize: 16, color: COLORS.dark },
  sumText: { color: "#94a3b8", fontSize: 13, marginLeft: 4 },
  boardWrap: { marginVertical: 8 },
  controls: { alignItems: "center", marginTop: 12, minHeight: 120 },
  hint: { color: "#94a3b8", marginTop: 10, fontSize: 13, textAlign: "center" },
  carryRow: { marginTop: 14, alignItems: "center", gap: 8 },
  carryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginVertical: 4,
  },
  carryText: { fontWeight: "900", color: COLORS.dark, fontSize: 14 },
  carryDecline: { backgroundColor: "#334155" },
  carryDeclineText: { color: "#e2e8f0", fontWeight: "700", fontSize: 13 },
  thinking: { color: "#fbbf24", fontSize: 15, fontWeight: "600" },
  winners: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    width: "100%",
  },
  winnersTitle: { color: "#fbbf24", fontWeight: "800", marginBottom: 6 },
  winnerLine: { color: "#e2e8f0", fontSize: 14, marginVertical: 2 },
  gameOver: {
    backgroundColor: "#16a34a",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    alignItems: "center",
    width: "100%",
  },
  gameOverText: { color: "#fff", fontSize: 26, fontWeight: "900" },
  gameOverWinner: { color: "#fff", fontSize: 18, marginTop: 8, fontWeight: "700" },
  againBtn: {
    marginTop: 16,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 24,
  },
  againText: { color: "#16a34a", fontWeight: "800", fontSize: 16 },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    width: "80%",
  },
  modalTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 12 },
  optBtn: {
    backgroundColor: "#334155",
    borderRadius: 10,
    padding: 14,
    marginVertical: 5,
  },
  optText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: { padding: 12, alignItems: "center", marginTop: 6 },
  cancelText: { color: "#94a3b8", fontWeight: "600" },
});
