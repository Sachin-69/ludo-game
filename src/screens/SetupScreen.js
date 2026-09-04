import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { PLAYERS, COLORS } from "../game/constants";
import { cap } from "../game/logic";

// Each slot can be: "off", "human", or "bot".
export default function SetupScreen({ onStart }) {
  const [slots, setSlots] = useState({
    red: "human",
    green: "bot",
    yellow: "off",
    blue: "off",
  });

  const cycle = (color) => {
    const order = ["off", "human", "bot"];
    setSlots((s) => {
      const next = order[(order.indexOf(s[color]) + 1) % order.length];
      return { ...s, [color]: next };
    });
  };

  const activeCount = PLAYERS.filter((c) => slots[c] !== "off").length;
  const canStart = activeCount >= 2;

  const start = () => {
    const players = PLAYERS.filter((c) => slots[c] !== "off");
    const isBot = {};
    players.forEach((c) => (isBot[c] = slots[c] === "bot"));
    onStart(players, isBot);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>LUDO</Text>
      <Text style={styles.subtitle}>Carry-the-6 Edition</Text>

      <Text style={styles.section}>Choose players (2–4)</Text>
      <Text style={styles.hint}>Tap a color to cycle: Off → Human → Bot</Text>

      <View style={styles.slots}>
        {PLAYERS.map((color) => {
          const mode = slots[color];
          return (
            <Pressable
              key={color}
              onPress={() => cycle(color)}
              style={[
                styles.slot,
                { borderColor: COLORS[color] },
                mode === "off" && styles.slotOff,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: COLORS[color] }]} />
              <Text style={styles.slotName}>{cap(color)}</Text>
              <Text
                style={[
                  styles.slotMode,
                  mode === "human" && { color: COLORS.green },
                  mode === "bot" && { color: COLORS.blue },
                  mode === "off" && { color: "#94a3b8" },
                ]}
              >
                {mode === "off" ? "OFF" : mode === "human" ? "HUMAN" : "COMPUTER"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rulesBox}>
        <Text style={styles.rulesTitle}>Rules</Text>
        <Text style={styles.rule}>• Roll a 6 to bring a token out of home.</Text>
        <Text style={styles.rule}>• Rolling a 6 lets you roll again.</Text>
        <Text style={styles.rule}>
          • ⭐ CARRY-THE-6: On a 6 you may CARRY it, roll again, then apply
          the 6 and the new roll separately — or add them onto ONE token.
        </Text>
        <Text style={styles.rule}>• Land on an opponent to send it home.</Text>
        <Text style={styles.rule}>• ★ Safe squares can't be captured.</Text>
        <Text style={styles.rule}>• Three 6s in a row forfeits your turn.</Text>
        <Text style={styles.rule}>• Exact roll needed to reach the finish.</Text>
      </View>

      <Pressable
        onPress={start}
        disabled={!canStart}
        style={[styles.startBtn, !canStart && styles.startDisabled]}
      >
        <Text style={styles.startText}>
          {canStart ? `START (${activeCount} players)` : "Pick at least 2 players"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    alignItems: "center",
    backgroundColor: COLORS.dark,
    minHeight: "100%",
  },
  title: {
    fontSize: 52,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 8,
  },
  subtitle: { fontSize: 15, color: "#fbbf24", marginBottom: 24, fontWeight: "600" },
  section: { fontSize: 18, color: "#fff", fontWeight: "700", marginTop: 8 },
  hint: { fontSize: 12, color: "#94a3b8", marginBottom: 16 },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  slot: {
    width: 140,
    padding: 16,
    borderRadius: 14,
    borderWidth: 3,
    backgroundColor: "#1e293b",
    alignItems: "center",
    margin: 6,
  },
  slotOff: { opacity: 0.5 },
  dot: { width: 28, height: 28, borderRadius: 14, marginBottom: 8 },
  slotName: { color: "#fff", fontWeight: "700", fontSize: 16 },
  slotMode: { fontWeight: "800", fontSize: 13, marginTop: 4 },
  rulesBox: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    width: "100%",
  },
  rulesTitle: { color: "#fbbf24", fontWeight: "800", fontSize: 16, marginBottom: 8 },
  rule: { color: "#cbd5e1", fontSize: 13, marginBottom: 6, lineHeight: 18 },
  startBtn: {
    marginTop: 28,
    backgroundColor: "#16a34a",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
  },
  startDisabled: { backgroundColor: "#475569" },
  startText: { color: "#fff", fontWeight: "800", fontSize: 18, letterSpacing: 1 },
});
