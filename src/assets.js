// Central registry of image assets. Using static require() so Metro
// bundles them. Keys chosen to match game logic (colors, die values).

export const PAWN_IMAGES = {
  red: require("../assets/Red_Pawn.png"),
  green: require("../assets/Green_Pawn.png"),
  blue: require("../assets/Blue_Pawn.png"),
  yellow: require("../assets/Yellow_Pawn.png"),
};

export const DICE_IMAGES = {
  1: require("../assets/Dice_1.png"),
  2: require("../assets/Dice_2.png"),
  3: require("../assets/Dice_3.png"),
  4: require("../assets/Dice_4.png"),
  5: require("../assets/Dice_5.png"),
  6: require("../assets/Dice_6.png"),
};

export const BOARD_IMAGE = require("../assets/Ludo_Board.png");
export const FELT_IMAGE = require("../assets/Background.png");
