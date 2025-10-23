import { GAME_CONFIG, difficultySettings } from './config.js';
import { Coordinate } from './coordinate.js';

/**
 * Represents a light cycle in the Tron game.
 * Each light cycle leaves a trail as it moves and can turn in four directions.
 */
export class LightCycle {
  /**
   * Direction vectors for movement in each cardinal direction.
   * @static
   * @type {Object.<string, Coordinate>}
   */
  static DIFFS = {
    N: new Coordinate(-1, 0), // North: up (decrease row)
    E: new Coordinate(0, 1), // East: right (increase column)
    S: new Coordinate(1, 0), // South: down (increase row)
    W: new Coordinate(0, -1), // West: left (decrease column)
  };

  /**
   * Creates a new light cycle.
   * @param {Board} board - The game board this light cycle belongs to
   * @param {number[]} startingPosition - Starting position as [row, column]
   * @param {string} direction - Initial direction ("N", "E", "S", or "W")
   */
  constructor(board, startingPosition, direction, isPlayer = true) {
    /** @type {string} Unique identifier for this light cycle */
    this.id = `cycle-${Math.random().toString(36).substring(2, 11)}`;
    /** @type {string} Current direction of movement */
    this.direction = direction;
    /** @type {boolean} Whether the light cycle is currently turning (prevents multiple turns per frame) */
    this.turning = false;
    /** @type {Board} Reference to the game board */
    this.board = board;
    /** @type {boolean} Whether the light cycle is still alive */
    this.alive = true;
    /** @type {LightCycle|null} Reference to the opponent light cycle (legacy - use opponents array) */
    this.opponent = null;
    /** @type {LightCycle[]} Array of teammate light cycles */
    this.teammates = [];
    /** @type {LightCycle[]} Array of opponent light cycles */
    this.opponents = [];
    /** @type {boolean} Whether this is a player-controlled light cycle */
    this.isPlayer = isPlayer;
    /** @type {number} Movement speed in milliseconds between moves */
    this.speed = this.#getSpeedForDifficulty();
    /** @type {number} Frame accumulator for individual timing */
    this.frameAccumulator = 0;
    /** @type {number} Last update time for this light cycle */
    this.lastUpdateTime = 0;

    /** @type {boolean} Whether this cycle is currently exploding */
    this.exploding = false;
    /** @type {number} Current explosion animation frame (0 or 1) */
    this.explosionFrame = 0;
    /** @type {number} Timestamp when explosion started */
    this.explosionStartTime = 0;
    /** @type {number} Duration of each explosion frame in milliseconds */
    this.explosionFrameDuration = 150;

    const startingCoordinate = new Coordinate(
      startingPosition[0],
      startingPosition[1]
    );
    /** @type {Coordinate[]} Array of coordinates representing the light cycle's trail */
    this.segments = [startingCoordinate];
  }

  /**
   * Gets the appropriate speed for this light cycle based on difficulty and player type.
   * @private
   * @returns {number} Speed in milliseconds between moves
   */
  #getSpeedForDifficulty() {
    const currentDifficulty = Object.values(difficultySettings).find(
      (setting) =>
        setting.level === (this.board?.difficulty || window.difficulty || 2)
    );

    if (!currentDifficulty) {
      // Fallback to Easy difficulty
      return this.isPlayer ? 35 : 40;
    }

    return this.isPlayer
      ? currentDifficulty.playerSpeed
      : currentDifficulty.enemySpeed;
  }

  /**
   * Updates the speed when difficulty changes.
   * @param {number} newDifficulty - The new difficulty level
   */
  updateSpeed(newDifficulty) {
    const difficultyConfig = Object.values(difficultySettings).find(
      (setting) => setting.level === newDifficulty
    );

    if (difficultyConfig) {
      this.speed = this.isPlayer
        ? difficultyConfig.playerSpeed
        : difficultyConfig.enemySpeed;
      // Reset timing accumulators
      this.frameAccumulator = 0;
      this.lastUpdateTime = 0;
    }
  }

  /**
   * Checks if enough time has passed for this light cycle to move.
   * @param {number} currentTime - Current timestamp
   * @returns {boolean} True if the light cycle should move this frame
   */
  shouldMove(currentTime) {
    if (this.lastUpdateTime === 0) {
      this.lastUpdateTime = currentTime;
      return true; // First move
    }

    const deltaTime = currentTime - this.lastUpdateTime;
    this.frameAccumulator += deltaTime;

    if (this.frameAccumulator >= this.speed) {
      this.frameAccumulator -= this.speed;
      this.lastUpdateTime = currentTime;
      return true;
    }

    return false;
  }

  /**
   * Checks if this light cycle is occupying a specific coordinate.
   * @param {Coordinate} coordinate - The coordinate to check
   * @returns {boolean} True if the light cycle occupies this coordinate, false otherwise
   */
  isOccupying(coordinate) {
    return this.segments.some((segment) => segment.equals(coordinate));
  }

  /**
   * Gets the head (front) position of the light cycle.
   * @returns {Coordinate} The coordinate of the light cycle's head
   */
  head() {
    return this.segments[this.segments.length - 1];
  }

  /**
   * Checks if a coordinate is a valid position for this light cycle to move to.
   * A position is invalid if it's outside the board or collides with any occupied space.
   * Uses high-performance collision grid for O(1) collision detection.
   * @param {Coordinate} coordinate - The coordinate to validate
   * @returns {boolean} True if the position is valid, false otherwise
   */
  isValid(coordinate) {
    if (!this.board.validPosition(coordinate)) {
      return false;
    }

    // Use collision grid for O(1) collision detection
    return !this.board.collisionGrid.has(coordinate);
  }

  /**
   * Moves the light cycle forward in its current direction.
   * If the move results in a collision, the light cycle dies.
   * Updates the collision grid for performance.
   */
  move() {
    // Validate direction exists
    if (!LightCycle.DIFFS[this.direction]) {
      console.error(`Invalid direction in move: ${this.direction}`);
      this.alive = false;
      return;
    }

    const nextCoord = this.head().plus(LightCycle.DIFFS[this.direction]);

    this.turning = false;
    if (!this.isValid(nextCoord)) {
      this.derezz(); // Authentic TRON derezzing
      return;
    }

    // Add new position to segments and collision grid
    this.segments.push(nextCoord);
    this.board.collisionGrid.add(nextCoord);
  }

  /**
   * Attempts to turn the light cycle in a new direction.
   * Prevents turning in the opposite direction or turning multiple times per frame.
   * @param {string} newDirection - The new direction ("N", "E", "S", or "W")
   */
  turn(newDirection) {
    // Validate direction exists
    if (!LightCycle.DIFFS[newDirection]) {
      console.error(`Invalid direction: ${newDirection}`);
      return;
    }
    if (!LightCycle.DIFFS[this.direction]) {
      console.error(`Invalid current direction: ${this.direction}`);
      return;
    }

    if (
      LightCycle.DIFFS[newDirection].isOpposite(
        LightCycle.DIFFS[this.direction]
      ) ||
      this.turning
    ) {
      return;
    }

    this.turning = true;
    this.direction = newDirection;

    // Play engine acceleration sound on direction change
    if (this.board.soundGenerator && this.alive) {
      this.board.soundGenerator.playEngine(this.id, this.isPlayer);
    }
  }

  /**
   * Changes the computer-controlled light cycle's direction using optimized AI logic.
   * Uses strategic evaluation considering multiple factors based on difficulty.
   * Enhanced AI only runs on critical decisions to maintain performance.
   */
  computerChangeDir() {
    const availableDirections = this.#getAvailableDirections();

    if (availableDirections.length === 0) {
      // No valid moves - AI will die
      return;
    }

    if (availableDirections.length === 1) {
      // Only one choice
      this.direction = availableDirections[0];
      return;
    }

    // Use enhanced AI only for critical decisions (early game, tight situations)
    // This balances intelligence with performance
    const isCriticalDecision = this.segments.length < 30 || availableDirections.length === 2;
    const shouldUseEnhancedAI = isCriticalDecision && this.segments.length % 3 === 0;

    if (shouldUseEnhancedAI && typeof window.AIIntegration !== 'undefined' && window.AIIntegration.isEnhanced()) {
      try {
        const allCycles = this.board.lightCycles;
        const currentPlayerId = allCycles.indexOf(this);
        const enhancedMove = window.AIIntegration.getEnhancedMove(allCycles, currentPlayerId);

        if (enhancedMove && availableDirections.includes(enhancedMove)) {
          this.direction = enhancedMove;
          return;
        }
      } catch (error) {
        console.warn('Enhanced AI failed, falling back to original:', error);
      }
    }

    // Use fast strategic evaluation for most moves
    const bestDirection = this.#evaluateStrategicMove(availableDirections);
    this.direction = bestDirection;
  }

  /**
   * Gets all valid turning directions (perpendicular to current direction).
   * @private
   * @returns {string[]} Array of valid direction strings
   */
  #getAvailableDirections() {
    const turningDirs =
      this.direction === "N" || this.direction === "S"
        ? ["W", "E"]
        : ["N", "S"];

    // Filter out directions that would cause immediate collision
    return turningDirs.filter((dir) => {
      const nextCoord = this.head().plus(LightCycle.DIFFS[dir]);
      return this.isValid(nextCoord);
    });
  }

  /**
   * Evaluates the best strategic move using multiple AI factors.
   * @private
   * @param {string[]} availableDirections - Valid directions to consider
   * @returns {string} The best direction to move
   */
  #evaluateStrategicMove(availableDirections) {
    const difficulty = this.board.difficulty;
    const scores = {};

    // Calculate strategic scores for each direction
    availableDirections.forEach((direction) => {
      scores[direction] = this.#calculateDirectionScore(
        direction,
        difficulty
      );

      // Add team coordination factor using strategicThinking
      scores[direction] += this.#evaluateTeamCoordination(direction);
    });

    // Add some randomness based on difficulty (higher difficulty = less randomness)
    const randomnessFactor = this.#getRandomnessFactor(difficulty);

    if (Math.random() < randomnessFactor) {
      // Add random element to prevent predictable behavior
      Object.keys(scores).forEach((dir) => {
        scores[dir] += (Math.random() - 0.5) * 10;
      });
    }

    // Return direction with highest score
    return Object.keys(scores).reduce((best, current) =>
      scores[current] > scores[best] ? current : best
    );
  }

  /**
   * Calculates a strategic score for a given direction using lightweight evaluation.
   * Optimized for performance while maintaining intelligent behavior.
   * @private
   * @param {string} direction - Direction to evaluate
   * @param {number} difficulty - Current difficulty level (unused for intelligence)
   * @returns {number} Strategic score for this direction
   */
  #calculateDirectionScore(direction, difficulty) {
    let score = 0;

    // Factor 1: Reachable territory (survival) - balanced weight
    const pathLength = this.#countPathLength(direction);
    score += pathLength * 1.0; // Reduced from 2.0 to balance with aggression

    // Factor 2: Aggressive pursuit - NEW PRIMARY FACTOR
    const pursuitScore = this.#evaluateAggressivePursuit(direction);
    score += pursuitScore; // Weight of 3.0 built into the method

    // Factor 3: Wall avoidance - prevent hugging walls
    const nextPos = this.head().plus(LightCycle.DIFFS[direction]);
    const distanceToWalls = Math.min(
      nextPos.row,
      nextPos.column,
      this.board.boardHeight - nextPos.row - 1,
      this.board.boardWidth - nextPos.column - 1
    );
    // Penalty for being too close to walls, bonus for staying in center
    score += Math.min(distanceToWalls, 10) * 0.5;

    return score;
  }

  /**
   * Evaluates aggressive pursuit - AI actively moves toward the player to cut them off
   */
  #evaluateAggressivePursuit(direction) {
    if (!this.opponent || !this.opponent.segments || this.opponent.segments.length === 0) {
      return 0;
    }

    const myNextPos = this.head().plus(LightCycle.DIFFS[direction]);
    const opponentHead = this.opponent.head();

    // Calculate current distance vs distance after move
    const currentDistance = Math.abs(this.head().row - opponentHead.row) +
                           Math.abs(this.head().column - opponentHead.column);
    const newDistance = Math.abs(myNextPos.row - opponentHead.row) +
                       Math.abs(myNextPos.column - opponentHead.column);

    // Reward moving closer to opponent (negative score for moving away)
    const pursuitScore = (currentDistance - newDistance) * 3.0;

    // Bonus for cutting off opponent's path
    const opponentDir = this.opponent.direction;
    if (opponentDir && LightCycle.DIFFS[opponentDir]) {
      const opponentNextPos = opponentHead.plus(LightCycle.DIFFS[opponentDir]);
      const distanceToOpponentPath = Math.abs(myNextPos.row - opponentNextPos.row) +
                                     Math.abs(myNextPos.column - opponentNextPos.column);

      // Big bonus for moving to intercept opponent's path
      if (distanceToOpponentPath <= 2) {
        return pursuitScore + 20;
      }
    }

    return pursuitScore;
  }

  // Add placeholder methods for AI evaluation (these would contain the full implementation)
  #evaluateTerritory(direction) { return 0; }
  #evaluateOpponentThreat(direction) { return 0; }
  #evaluateTrapRisk(direction) { return 0; }
  #evaluateEscapeOpportunity(direction) { return 0; }
  #evaluatePatternBreaking(direction) { return 0; }
  #evaluateWallStrategy(direction) { return 0; }
  #evaluateSpaceExpansion(direction) { return 0; }
  #evaluateTeamCoordination(direction) { return 0; }
  #getRandomnessFactor(difficulty) { return 0.1; }
  #countPathLength(direction) {
    // Lightweight heuristic: count straight-line distance plus immediate neighbors
    // This is much faster than full BFS for real-time gameplay
    let straightCount = 0;
    let coord = this.head().plus(LightCycle.DIFFS[direction]);

    // Count how far we can go straight
    while (this.isValid(coord) && straightCount < 20) {
      straightCount++;
      coord = coord.plus(LightCycle.DIFFS[direction]);
    }

    // Add bonus for having perpendicular options (prevents tunneling)
    const perpDirs = this.direction === "N" || this.direction === "S" ? ["W", "E"] : ["N", "S"];
    let openSides = 0;
    perpDirs.forEach(dir => {
      const sideCoord = this.head().plus(LightCycle.DIFFS[direction]).plus(LightCycle.DIFFS[dir]);
      if (this.isValid(sideCoord)) {
        openSides++;
      }
    });

    return straightCount + (openSides * 5); // Bonus for open sides
  }

  /**
   * Executes a computer-controlled move with advanced AI decision making.
   * Uses strategic evaluation to make intelligent moves based on difficulty level.
   * Updates collision grid for performance.
   * Now respects turn timing like human players for fair gameplay.
   */
  computerMove() {
    // Validate direction exists
    if (!LightCycle.DIFFS[this.direction]) {
      console.error(`Invalid direction in computerMove: ${this.direction}`);
      this.derezz(); // Authentic TRON derezzing
      return;
    }

    const nextCoord = this.head().plus(LightCycle.DIFFS[this.direction]);

    // Reset turning flag at the start of move (same as player move())
    this.turning = false;

    // Only consider changing direction if we're not currently turning
    // This enforces same turn spacing as player
    if (!this.turning) {
      // Use lightweight strategic AI evaluation
      const availableDirections = this.#getAvailableDirections();

      if (availableDirections.length > 0) {
        // Simple scoring without expensive calculations
        const bestAlternative = this.#evaluateStrategicMove(availableDirections);

        // Only change direction if there's a clear benefit
        if (bestAlternative !== this.direction) {
          const nextCoordForCurrent = this.head().plus(LightCycle.DIFFS[this.direction]);
          const nextCoordForBest = this.head().plus(LightCycle.DIFFS[bestAlternative]);

          // Simple validity check - prefer the alternative if current path is blocked
          if (!this.isValid(nextCoordForCurrent) && this.isValid(nextCoordForBest)) {
            // Use turn() method to enforce turn timing constraints
            this.turn(bestAlternative);
          }
        }
      }
    }

    // Execute the move
    const finalNextCoord = this.head().plus(LightCycle.DIFFS[this.direction]);

    if (this.isValid(finalNextCoord)) {
      this.segments.push(finalNextCoord);
      this.board.collisionGrid.add(finalNextCoord);
    } else {
      // Emergency: Must turn to avoid collision
      if (!this.turning) {
        this.computerChangeDir();
      }

      // Validate direction after emergency change
      if (!LightCycle.DIFFS[this.direction]) {
        console.error(
          `Invalid direction after emergency computerChangeDir: ${this.direction}`
        );
        this.derezz(); // Authentic TRON derezzing
        return;
      }

      const emergencyNextCoord = this.head().plus(
        LightCycle.DIFFS[this.direction]
      );

      if (this.isValid(emergencyNextCoord)) {
        this.segments.push(emergencyNextCoord);
        this.board.collisionGrid.add(emergencyNextCoord);
      } else {
        // No valid moves available - AI dies
        this.derezz(); // Authentic TRON derezzing
      }
    }
  }

  #shouldConsiderStrategicTurn() {
    return true; // AI is ALWAYS strategic
  }

  #getImprovementThreshold() {
    return 2; // Very sensitive to improvements for aggressive play
  }

  /**
   * Derezzes this light cycle - removes it completely from the grid.
   * Starts explosion animation, then clears all segments.
   * This matches authentic TRON behavior where derezzed cycles disappear entirely.
   */
  derezz() {
    if (!this.alive) return; // Already derezzed

    // Stop engine sound and play collision sound when light cycle crashes
    if (this.board.soundGenerator) {
      this.board.soundGenerator.stopEngine(this.id);
      this.board.soundGenerator.playCollision();
    }

    // Start explosion animation
    this.exploding = true;
    this.explosionFrame = 0;
    this.explosionStartTime = performance.now();

    // Mark as dead immediately (stops movement)
    this.alive = false;

    // Note: Segments and collision grid cleanup happens after explosion animation
    // This is handled by updateExplosion() and completeDerezz()

    if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
      console.log("Light cycle exploding...");
    }
  }

  /**
   * Updates the explosion animation state.
   * @param {number} currentTime - Current timestamp
   */
  updateExplosion(currentTime) {
    if (!this.exploding) return;

    const elapsedTime = currentTime - this.explosionStartTime;
    const totalAnimationTime = this.explosionFrameDuration * 2; // 2 frames

    if (elapsedTime >= totalAnimationTime) {
      // Animation complete - clean up
      this.completeDerezz();
    } else {
      // Update frame (0 for first half, 1 for second half)
      this.explosionFrame = elapsedTime < this.explosionFrameDuration ? 0 : 1;
    }
  }

  /**
   * Completes the derezz process by removing segments from the grid.
   * Called after explosion animation finishes.
   */
  completeDerezz() {
    if (!this.exploding) return;

    // Remove all segments from collision grid
    this.segments.forEach((segment) => {
      this.board.collisionGrid.remove(segment);
    });

    // Clear all segments (authentic TRON behavior)
    this.segments = [];

    // End explosion animation
    this.exploding = false;

    if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
      console.log("Light cycle derezzed - all segments removed from grid");
    }
  }

  /**
   * Gets the isDead property for compatibility
   * @returns {boolean} True if the light cycle is dead
   */
  get isDead() {
    return !this.alive;
  }
}
