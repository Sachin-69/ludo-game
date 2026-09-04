import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { COLORS } from "../game/constants";

// Pip layouts for faces 1-6 (3x3 grid positions that are filled).
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ value, color }) {
  const filled = PIPS[value] || [];
  return (
    <View style={styles.face}>
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={styles.pipCell}>
          {filled.includes(i) ? (
            <View style={[styles.pip, { backgroundColor: color }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function Dice({ value, color, onRoll, disabled, rolling }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rolling) {
      spin.setValue(0);
      Animated.timing(spin, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [rolling, value]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Pressable onPress={onRoll} disabled={disabled} style={styles.wrap}>
      <Animated.View
        style={[
          styles.die,
          { borderColor: color, transform: [{ rotate }] },
          disabled && styles.dieDisabled,
        ]}
      >
        <DieFace value={value || 1} color={color} />
      </Animated.View>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {disabled ? "…" : "TAP TO ROLL"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  die: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 3,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dieDisabled: { opacity: 0.45 },
  face: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  pipCell: {
    width: "33.33%",
    height: "33.33%",
    alignItems: "center",
    justifyContent: "center",
  },
  pip: { width: 9, height: 9, borderRadius: 5 },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: COLORS.dark,
  },
  labelDisabled: { color: "#94a3b8" },
});
