import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
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

function DieFace({ value, color, pipSize }) {
  const filled = PIPS[value] || [];
  return (
    <View style={styles.face}>
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={styles.pipCell}>
          {filled.includes(i) ? (
            <View
              style={[
                styles.pip,
                { backgroundColor: color, width: pipSize, height: pipSize, borderRadius: pipSize },
              ]}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function Dice({ value, color, onRoll, disabled, rolling, compact }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const size = compact ? 52 : 64;
  const pipSize = compact ? 7 : 9;

  // Spin animation while rolling.
  useEffect(() => {
    if (rolling) {
      spin.setValue(0);
      Animated.timing(spin, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [rolling, value]);

  // Gentle pulse when the die is ready to be tapped.
  const rollable = !disabled && !!onRoll;
  useEffect(() => {
    let loop;
    if (rollable) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 550, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulse.setValue(1);
    }
    return () => loop && loop.stop();
  }, [rollable]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Pressable onPress={onRoll} disabled={disabled} style={styles.wrap}>
      <Animated.View
        style={[
          styles.die,
          {
            width: size,
            height: size,
            borderColor: color,
            transform: [{ rotate }, { scale: pulse }],
          },
          rollable && { shadowColor: color, shadowOpacity: 0.9, shadowRadius: 8, elevation: 8 },
          disabled && styles.dieDisabled,
        ]}
      >
        <DieFace value={value || 1} color={color} pipSize={pipSize} />
      </Animated.View>
      {!compact && (
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {disabled ? "…" : "TAP TO ROLL"}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  die: {
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
  dieDisabled: { opacity: 0.5 },
  face: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  pipCell: {
    width: "33.33%",
    height: "33.33%",
    alignItems: "center",
    justifyContent: "center",
  },
  pip: {},
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: COLORS.dark,
  },
  labelDisabled: { color: "#94a3b8" },
});
