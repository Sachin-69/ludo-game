import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import SetupScreen from "./src/screens/SetupScreen";
import GameScreen from "./src/screens/GameScreen";

export default function App() {
  const [game, setGame] = useState(null); // { players, isBot } or null

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {game ? (
        <GameScreen
          players={game.players}
          isBot={game.isBot}
          onExit={() => setGame(null)}
        />
      ) : (
        <SetupScreen onStart={(players, isBot) => setGame({ players, isBot })} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a" },
});
