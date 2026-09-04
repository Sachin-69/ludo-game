import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, Image } from "react-native";
import { COLORS } from "../game/constants";
import { DICE_IMAGES } from "../assets";

export default function Dice({ value, color, onRoll, disabled, rolling, compact }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const size = compact ? 56 : 68;

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

  // Gentle pulse when ready to tap.
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

  const face = DICE_IMAGES[value || 1];

  return (
    <Pressable onPress={onRoll} disabled={disabled} style={styles.wrap}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            transform: [{ rotate }, { scale: pulse }],
          },
          rollable && {
            shadowColor: color,
            shadowOpacity: 0.9,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 0 },
            elevation: 9,
            borderRadius: size * 0.22,
          },
          disabled && !rollable && styles.dieDisabled,
        ]}
      >
        <Image source={face} style={{ width: size, height: size }} resizeMode="contain" />
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
  dieDisabled: { opacity: 0.55 },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#fff",
  },
  labelDisabled: { color: "#94a3b8" },
});
