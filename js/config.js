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
    // Backdrop graph paper: 24px pitch (3 cells at CELL_SIZE 8), close to the
    // system's 32px grid-cell but aligned to the game's own grid so the
    // hairlines land on cell boundaries instead of cutting through them.
    GRID_PITCH: 24,
    // Cycle name labels are machine output, so they take the mono stack.
    LABEL_FONT:
      '"Space Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    LABEL_SIZE: 12,
    LABEL_WEIGHT: 700,
  },
  // Palette drawn from the GRID design system's signal plane. Every hue sits
  // at OKLCH L 0.83 / C 0.14 so nothing shouts louder than anything else;
  // danger alone drops to L 0.70 / C 0.19 so alarm reads hotter.
  // Hex equivalents are used here because canvas fillStyle predates oklch()
  // in some engines and these values are baked into a bitmap, not a stylesheet.
  COLORS: {
    BLUE_RIBBON: "#44DAFF",   // signal-cyan  — the operator
    RED_RIBBON: "#FF655A",    // signal-red   — the opponent
    RED_RIBBON_2: "#F4BE4F",  // signal-amber — second enemy cycle
    RED_RIBBON_3: "#D5B2FF",  // signal-violet — third enemy cycle
    GRID_BACKGROUND: "#202a2f", // line-400   — the backdrop graph paper
    CANVAS_BORDER: "#8fa8b4",   // line-200   — the field's hairline frame
    CANVAS_BG: "#000000",       // surface-0  — the void
    INK_100: "#e4f2f8",         // ink-100    — primary text on the field
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
