/**
 * Game configuration constants for maintainable settings.
 * All magic numbers and configuration values are centralized here.
 */

export const GAME_CONFIG = Object.freeze({
  BOARD: {
    DEFAULT_WIDTH: 100,
    DEFAULT_HEIGHT: 100,
    CELL_SIZE: 8,
  },
  RENDERING: {
    SPRITE_SCALE: 4,
    RIBBON_WIDTH_SCALE: 4,
    BLOCK_SIZE: 22,
    BORDER_SIZE: 2,
    SPRITE_SIZE_MULTIPLIER: 8,
  },
  COLORS: {
    BLUE_RIBBON: "#24DBFF",
    RED_RIBBON: "#FF5024",
    RED_RIBBON_2: "#FF3040",
    RED_RIBBON_3: "#FF1030",
    GRID_BACKGROUND: "#000024",
    CANVAS_BORDER: "#6D9292",
    CANVAS_BG: "#000",
  },
  DIFFICULTY: {
    VERY_EASY: {
      level: 1,
      playerSpeed: 45,
      enemySpeed: 55,
      strategicThinking: 1.0,
      enemyCycles: 1,
      name: "Very Easy",
    },
    EASY: {
      level: 2,
      playerSpeed: 35,
      enemySpeed: 40,
      strategicThinking: 1.0,
      enemyCycles: 1,
      name: "Easy",
    },
    MEDIUM: {
      level: 3,
      playerSpeed: 30,
      enemySpeed: 30,
      strategicThinking: 1.0,
      enemyCycles: 1,
      name: "Medium",
    },
    HARD: {
      level: 4,
      playerSpeed: 30,
      enemySpeed: 25,
      strategicThinking: 1.0,
      enemyCycles: 2,
      name: "Hard",
    },
    VERY_HARD: {
      level: 5,
      playerSpeed: 25,
      enemySpeed: 20,
      strategicThinking: 1.0,
      enemyCycles: 3,
      name: "Very Hard",
    },
  },
  CONTROLS: {
    PAUSE_KEY: 32, // Spacebar
    PLAYER1: { 38: "N", 39: "E", 40: "S", 37: "W" }, // Arrow keys
    PLAYER2: { 87: "N", 68: "E", 83: "S", 65: "W" }, // WASD
  },
  PERFORMANCE: {
    SPRITE_LOAD_TIMEOUT: 5000,
    DEBUG_MODE: false,
  },
  DEBUG: {
    SHOW_COLLISION_GRID: false,
    SHOW_FPS: false,
    SHOW_PERFORMANCE_STATS: false,
    LOG_GAME_EVENTS: false,
  },
  AUDIO: {
    ENABLED: true,
    VOLUME: 0.7,
    COLLISION_DELAY: 1000, // Delay in ms between collision sound and game over
    START_MUSIC_DURATION: 4000, // Duration of start music in ms (4 seconds)
  },
});

/**
 * Configuration object for different difficulty levels.
 */
export const difficultySettings = {
  veryEasy: GAME_CONFIG.DIFFICULTY.VERY_EASY,
  easy: GAME_CONFIG.DIFFICULTY.EASY,
  medium: GAME_CONFIG.DIFFICULTY.MEDIUM,
  hard: GAME_CONFIG.DIFFICULTY.HARD,
  veryHard: GAME_CONFIG.DIFFICULTY.VERY_HARD,
};
