import { GAME_CONFIG, difficultySettings } from './config.js';
import { CollisionGrid } from './collision-grid.js';
import { LightCycle } from './light-cycle.js';

/**
 * Represents the game board and manages player and enemy light cycles.
 * Handles board dimensions, team positioning, and coordinate validation.
 */
export class Board {
  /**
   * Creates a new game board with player team and enemy team based on difficulty.
   * Player team always has 1 cycle, enemy team has 1-3 AI cycles based on difficulty.
   * @param {number} boardWidth - The width of the board (number of columns)
   * @param {number} boardHeight - The height of the board (number of rows)
   * @param {boolean} _isMultiplayerMode - Legacy parameter, ignored
   */
  constructor(
    boardWidth = GAME_CONFIG.BOARD.DEFAULT_WIDTH,
    boardHeight = GAME_CONFIG.BOARD.DEFAULT_HEIGHT,
    _isMultiplayerMode = false
  ) {
    /** @type {number} Board width in grid cells */
    this.boardWidth = boardWidth;
    /** @type {number} Board height in grid cells */
    this.boardHeight = boardHeight;

    /** @type {CollisionGrid} High-performance collision detection grid */
    this.collisionGrid = new CollisionGrid();

    /** @type {number} Current difficulty level */
    this.difficulty = window.difficulty || 2;

    // Create player team (always 1 cycle)
    /** @type {LightCycle[]} Array of player-controlled light cycles */
    this.playerTeam = this.createPlayerTeam();

    // Create enemy team (1-3 cycles based on difficulty)
    /** @type {LightCycle[]} Array of AI-controlled light cycles */
    this.enemyTeam = this.createEnemyTeam();

    // Set up team references for coordination
    this.setupTeamReferences();

    // Legacy properties for backward compatibility
    /** @type {LightCycle} The first player's light cycle (blue) - legacy */
    this.player1 = this.playerTeam[0];
    /** @type {LightCycle} The first enemy light cycle (red) - legacy */
    this.player2 = this.enemyTeam[0];

    // Add lightCycles property for compatibility
    /** @type {LightCycle[]} All light cycles (legacy compatibility) */
    this.lightCycles = [...this.playerTeam, ...this.enemyTeam];
  }

  /**
   * Gets the current difficulty configuration.
   * @returns {Object} Current difficulty settings
   */
  getDifficultyConfig() {
    return (
      Object.values(difficultySettings).find(
        (setting) => setting.level === this.difficulty
      ) || difficultySettings.easy
    );
  }

  /**
   * Creates the player team (always 1 cycle).
   * @returns {LightCycle[]} Array containing the player light cycle
   */
  createPlayerTeam() {
    const playerStartingPosition = [
      Math.floor((7 * this.boardHeight) / 8),
      Math.floor(this.boardWidth / 2),
    ];
    return [new LightCycle(this, playerStartingPosition, "N", true)];
  }

  /**
   * Creates the enemy team based on difficulty settings.
   * Creates 1-3 AI-controlled cycles based on difficulty.
   * @returns {LightCycle[]} Array of enemy light cycles
   */
  createEnemyTeam() {
    const enemyCycles = [];
    const difficultyConfig = this.getDifficultyConfig();

    for (let i = 0; i < difficultyConfig.enemyCycles; i++) {
      const startPos = this.getEnemyStartPosition(
        i,
        difficultyConfig.enemyCycles
      );
      const startDir = this.getEnemyStartDirection(
        i,
        difficultyConfig.enemyCycles
      );
      enemyCycles.push(new LightCycle(this, startPos, startDir, false));
    }

    return enemyCycles;
  }

  /**
   * Calculates starting position for enemy cycles based on count and index.
   * @param {number} index - Index of the enemy cycle (0-based)
   * @param {number} totalEnemies - Total number of enemy cycles
   * @returns {number[]} Starting position as [row, column]
   */
  getEnemyStartPosition(index, totalEnemies) {
    const topRow = Math.floor(this.boardHeight / 8);

    if (totalEnemies === 1) {
      // Single enemy at top center (classic positioning)
      return [topRow, Math.floor(this.boardWidth / 2)];
    } else if (totalEnemies === 2) {
      // Two enemies: top-left and top-right
      const positions = [
        [topRow, Math.floor(this.boardWidth / 4)],
        [topRow, Math.floor((3 * this.boardWidth) / 4)],
      ];
      return positions[index];
    } else if (totalEnemies === 3) {
      // Three enemies: top-left, top-center, top-right
      const positions = [
        [topRow, Math.floor(this.boardWidth / 4)],
        [topRow, Math.floor(this.boardWidth / 2)],
        [topRow, Math.floor((3 * this.boardWidth) / 4)],
      ];
      return positions[index];
    }

    // Fallback for unexpected counts
    return [topRow, Math.floor(this.boardWidth / 2)];
  }

  /**
   * Determines starting direction for enemy cycles.
   * @param {number} index - Index of the enemy cycle (0-based)
   * @param {number} totalEnemies - Total number of enemy cycles
   * @returns {string} Starting direction ("N", "E", "S", or "W")
   */
  getEnemyStartDirection(index, totalEnemies) {
    if (totalEnemies === 1) {
      return "S"; // Single enemy faces south (toward player)
    } else if (totalEnemies === 2) {
      // Two enemies: both face south initially
      return "S";
    } else if (totalEnemies === 3) {
      // Three enemies: center faces south, sides face inward
      const directions = ["E", "S", "W"]; // Left faces right, center faces down, right faces left
      return directions[index];
    }

    return "S"; // Default fallback
  }

  /**
   * Sets up team references for coordination between cycles.
   */
  setupTeamReferences() {
    // Set up enemy team coordination
    this.enemyTeam.forEach((cycle) => {
      cycle.teammates = this.enemyTeam.filter((c) => c !== cycle);
      cycle.opponents = this.playerTeam;
      // Legacy opponent reference (use first player)
      cycle.opponent = this.playerTeam[0];
    });

    // Set up player team references
    this.playerTeam.forEach((cycle) => {
      cycle.teammates = this.playerTeam.filter((c) => c !== cycle);
      cycle.opponents = this.enemyTeam;
      // Legacy opponent reference (use first enemy)
      cycle.opponent = this.enemyTeam[0];
    });

    // Update lightCycles array
    this.lightCycles = [...this.playerTeam, ...this.enemyTeam];
  }

  /**
   * Gets all living cycles from both teams.
   * @returns {LightCycle[]} Array of all living light cycles
   */
  getAllLivingCycles() {
    return [...this.playerTeam, ...this.enemyTeam].filter(
      (cycle) => cycle.alive
    );
  }

  /**
   * Checks if the player team has any living cycles.
   * @returns {boolean} True if any player cycles are alive
   */
  isPlayerTeamAlive() {
    return this.playerTeam.some((cycle) => cycle.alive);
  }

  /**
   * Checks if the enemy team has any living cycles.
   * @returns {boolean} True if any enemy cycles are alive
   */
  isEnemyTeamAlive() {
    return this.enemyTeam.some((cycle) => cycle.alive);
  }

  /**
   * Initializes the collision grid with the starting positions of all light cycles.
   * This should be called when the game actually begins, not during board creation.
   */
  initializeCollisionGrid() {
    this.collisionGrid.clear(); // Clear any existing data

    // Add all player team positions
    this.playerTeam.forEach((cycle) => {
      this.collisionGrid.add(cycle.head());
    });

    // Add all enemy team positions
    this.enemyTeam.forEach((cycle) => {
      this.collisionGrid.add(cycle.head());
    });

    if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
      console.log("Collision grid initialized with starting positions:", {
        playerTeamCount: this.playerTeam.length,
        enemyTeamCount: this.enemyTeam.length,
        playerPositions: this.playerTeam.map((c) => ({
          pos: c.head(),
          dir: c.direction,
        })),
        enemyPositions: this.enemyTeam.map((c) => ({
          pos: c.head(),
          dir: c.direction,
        })),
        collisionGridSize: this.collisionGrid.size(),
      });
    }
  }

  /**
   * Checks if a coordinate is within the valid bounds of the board.
   * @param {Coordinate} coordinate - The coordinate to validate
   * @returns {boolean} True if the coordinate is within bounds, false otherwise
   */
  validPosition(coordinate) {
    return (
      coordinate.row >= 0 &&
      coordinate.row < this.boardHeight &&
      coordinate.column >= 0 &&
      coordinate.column < this.boardWidth
    );
  }

  /**
   * Compatibility method for enhanced AI
   * @returns {boolean} True if position is valid
   */
  isValidPosition(x, y) {
    return (
      x >= 0 &&
      x < this.boardWidth &&
      y >= 0 &&
      y < this.boardHeight
    );
  }

  /**
   * Compatibility property for enhanced AI
   * @returns {number} Board width
   */
  get width() {
    return this.boardWidth;
  }

  /**
   * Compatibility property for enhanced AI
   * @returns {number} Board height
   */
  get height() {
    return this.boardHeight;
  }

  /**
   * Compatibility property for enhanced AI - creates a 2D grid representation
   * @returns {boolean[][]} 2D array where true = occupied, false = free
   */
  get grid() {
    const grid = Array(this.boardHeight).fill(null).map(() =>
      Array(this.boardWidth).fill(false)
    );

    // Mark occupied positions
    this.collisionGrid.occupied.forEach(coordKey => {
      const [row, col] = coordKey.split(',').map(Number);
      if (row >= 0 && row < this.boardHeight && col >= 0 && col < this.boardWidth) {
        grid[row][col] = true;
      }
    });

    return grid;
  }
}
