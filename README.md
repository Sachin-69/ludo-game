# Ludo — Carry-the-6 Edition

A React Native (Expo) Ludo game you can play on your iPhone via **Expo Go**.
Supports 2–4 players, each of which can be a **human** or a **computer (CPU)**,
and includes a special house rule: the **Carry-the-6**.

## The Carry-the-6 rule ⭐

When you roll a **6**, you get a choice:

1. **Carry the 6** — the 6 is banked and you **roll the dice again**.
2. After the second roll you now hold **two dice** (the 6 and the new roll).
   You may either:
   - apply each die **separately** to different tokens, **or**
   - **add them together** (6 + X) and move **one token** the full total.
3. If the second roll is **also a 6**, you can keep carrying.
4. **Three 6s in a row forfeits the whole turn** (standard anti-cheat rule).
5. If you'd rather not carry, tap **Move now** and play the 6 immediately.

## Other rules included

- Roll a **6** to bring a token out of its home yard.
- Rolling a 6 grants a **bonus roll**.
- Landing on an opponent **captures** it (sends it home) — unless it's on a
  **★ safe square**.
- Capturing a token or finishing a token also earns a **bonus roll**.
- A token needs the **exact** roll to reach the finish (no overshooting).
- First player to get all 4 tokens home **wins**.

## Run it on your iPhone

1. Install the **Expo Go** app from the App Store.
2. On your computer, from this folder:

   ```powershell
   npm install
   npx expo start
   ```

3. A QR code appears in the terminal. Open the **Camera** app on your iPhone
   and scan it (your phone and computer must be on the **same Wi-Fi**).
4. Expo Go launches the game.

> If the QR/LAN connection fails on your network, run with a tunnel:
> ```powershell
> npx expo start --tunnel
> ```

## Play in a browser (quick test)

```powershell
npx expo start --web
```

## Project structure

```
ludo-game/
├── App.js                    # root: switches Setup <-> Game
├── index.js                  # Expo entry
├── app.json                  # Expo config
├── src/
│   ├── game/
│   │   ├── constants.js      # board geometry & rule constants
│   │   ├── boardPath.js      # progress -> (row,col) grid mapping
│   │   ├── logic.js          # moves, capture, win detection (pure)
│   │   ├── reducer.js        # turn flow + CARRY-THE-6 rule
│   │   └── bot.js            # computer-player AI
│   ├── components/
│   │   ├── Board.js          # 15x15 board + tokens rendering
│   │   └── Dice.js           # animated tappable die
│   └── screens/
│       ├── SetupScreen.js    # pick 2-4 players, human/CPU
│       └── GameScreen.js     # gameplay + carry-6 UI
└── assets/                   # icon & splash
```

## How to play (in-app)

1. On the setup screen, tap each color to cycle **Off → Human → Computer**.
   Pick at least 2 active players, then **START**.
2. On your turn, tap the die to **roll**.
3. If you roll a 6, choose **⭐ Carry the 6 & roll again** or **Move now**.
4. Tap a **highlighted token** to move it. If a token can move in more than
   one way (e.g. use one die vs. the combined sum), a picker appears.
5. Capture opponents, dodge onto ★ safe squares, and race all 4 tokens home!
