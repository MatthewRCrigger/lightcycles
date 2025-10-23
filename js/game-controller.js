/**
 * Main game controller and UI management
 * Handles game initialization, UI interactions, and game state management
 */

import { GAME_CONFIG, difficultySettings } from './config.js';
import { Board } from './board.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { SoundGenerator } from './sound-generator.js';


/**
 * Updates the difficulty display text in the game UI.
 * Finds the current difficulty name and updates the display element.
 */
function updateDifficultyDisplay() {
  const currentDifficultyText = document.getElementById(
    "current-difficulty-text"
  );
  const difficultyName =
    Object.values(difficultySettings).find(
      (s) => s.level === window.difficulty
    )?.name || "Easy";
  if (currentDifficultyText) {
    currentDifficultyText.textContent = difficultyName;
  }
}

/**
 * Main game controller that handles input, game loop, and UI management.
 * Coordinates between the game logic (Board/LightCycles) and rendering (CanvasRenderer).
 */
class View {
  /**
   * Key mappings for player 1 controls (arrow keys) - now using config.
   * @static
   * @type {Object.<number, string>}
   */
  static KEYS1 = GAME_CONFIG.CONTROLS.PLAYER1;

  /**
   * Key mappings for player 2 controls (WASD keys) - now using config.
   * @static
   * @type {Object.<number, string>}
   */
  static KEYS2 = GAME_CONFIG.CONTROLS.PLAYER2;

  /**
   * Creates a new game view.
   * @param {HTMLElement|null} containerElement - The container element (legacy parameter, not used)
   * @param {number} _numberOfPlayers - Legacy parameter, ignored
   */
  constructor(containerElement, _numberOfPlayers) {
    /** @type {HTMLElement|null} Container element (legacy, not used) */
    this.containerElement = containerElement;
    /** @type {Board} The game board containing both light cycles */
    this.board = new Board(
      GAME_CONFIG.BOARD.DEFAULT_WIDTH,
      GAME_CONFIG.BOARD.DEFAULT_HEIGHT,
      false
    );
    /** @type {boolean} Whether the game is currently paused */
    this.isPaused = false;
    /** @type {number|null} The animation frame ID for cleanup */
    this.animationId = null;
    /** @type {Function|null} Bound key handler for cleanup */
    this.keyHandler = null;
    /** @type {boolean} Whether the game is running */
    this.isRunning = false;
    /** @type {PerformanceMonitor} Performance monitoring utility */
    this.performanceMonitor = new PerformanceMonitor();
    /** @type {boolean} Whether a collision has occurred and we're waiting for game over */
    this.collisionOccurred = false;
    /** @type {number|null} Timeout ID for collision delay */
    this.collisionDelayTimeout = null;
    /** @type {boolean} Whether start music is playing and game is waiting to begin */
    this.waitingForStartMusic = false;
    /** @type {number|null} Timeout ID for start music delay */
    this.startMusicDelayTimeout = null;
    /** @type {number} Current countdown number (3, 2, 1) */
    this.countdownNumber = 3;
    /** @type {number[]} Array of countdown timeout IDs for cleanup */
    this.countdownTimeouts = [];

    this.setupCanvas();

    /** @type {SoundGenerator} Web Audio API sound generator */
    this.soundGenerator = new SoundGenerator();

    // Pass sound generator to board for collision sounds
    this.board.soundGenerator = this.soundGenerator;
  }

  /**
   * Sets up the canvas and creates the renderer with error handling.
   * Finds the game canvas element and initializes the CanvasRenderer.
   */
  setupCanvas() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) {
      throw new Error(
        'Game canvas element not found. Make sure element with id "gameCanvas" exists.'
      );
    }

    /** @type {CanvasRenderer} The canvas renderer for drawing the game */
    this.renderer = new CanvasRenderer(
      canvas,
      this.board.boardWidth,
      this.board.boardHeight
    );

    // Pre-render background for performance
    this.renderer.renderBackground();
  }

  /**
   * Starts the game loop using requestAnimationFrame for smooth animation.
   * Each light cycle moves at its own individual speed.
   */
  startGame() {
    this.isRunning = true;

    // Reset collision and start music state for new game
    this.collisionOccurred = false;
    this.waitingForStartMusic = true;

    if (this.collisionDelayTimeout) {
      clearTimeout(this.collisionDelayTimeout);
      this.collisionDelayTimeout = null;
    }

    if (this.startMusicDelayTimeout) {
      clearTimeout(this.startMusicDelayTimeout);
      this.startMusicDelayTimeout = null;
    }

    // Clear any existing countdown timeouts
    this.clearCountdownTimeouts();

    const gameLoop = (currentTime) => {
      if (!this.isRunning) return;

      const frameStartTime = performance.now();

      // Individual timing - each light cycle moves at its own speed
      // Only if not waiting for start music to finish
      if (!this.waitingForStartMusic) {
        this.step(currentTime);
      }

      // Always render at display refresh rate for smooth visuals
      if (this.board) {
        this.render();
      }

      // Update performance monitoring
      const frameEndTime = performance.now();
      this.performanceMonitor.update(frameEndTime - frameStartTime);

      this.animationId = requestAnimationFrame(gameLoop);
    };

    // Initialize collision grid immediately so rendering works properly
    this.board.initializeCollisionGrid();

    // Debug logging to track positions
    if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
      console.log("Game starting with positions:", {
        player1: {
          position: this.board.player1.head(),
          direction: this.board.player1.direction,
          segments: this.board.player1.segments.length,
        },
        player2: {
          position: this.board.player2.head(),
          direction: this.board.player2.direction,
          segments: this.board.player2.segments.length,
        },
      });
    }

    // Force an immediate render to clear any previous game state
    if (this.board) {
      this.render();
    }

    this.animationId = requestAnimationFrame(gameLoop);
    this.#bindEvents();

    // Play game start sound
    this.soundGenerator.playGameStart();
    this.startCountdown();

    // Start actual game logic after start music finishes
    this.startMusicDelayTimeout = setTimeout(() => {
      this.waitingForStartMusic = false;

      // Start engine sounds for all light cycles
      [...this.board.playerTeam, ...this.board.enemyTeam].forEach(cycle => {
        if (cycle.alive && this.soundGenerator) {
          this.soundGenerator.playEngine(cycle.id, cycle.isPlayer);
        }
      });
    }, GAME_CONFIG.AUDIO.START_MUSIC_DURATION);
  }

  /**
   * Sets up keyboard event listeners for game controls.
   * @private
   */
  #bindEvents() {
    // Keyboard events
    this.keyHandler = this.#handleKeyEvent.bind(this);
    document.addEventListener("keydown", this.keyHandler);
  }

  /**
   * Handles keyboard input for player controls and game pause.
   * @private
   * @param {KeyboardEvent} event - The keyboard event
   */
  #handleKeyEvent(event) {
    // Handle pause toggle (spacebar) using config
    if (event.keyCode === GAME_CONFIG.CONTROLS.PAUSE_KEY) {
      event.preventDefault();
      this.togglePause();
      return;
    }

    // Don't handle other keys if paused or waiting for start music
    if (this.isPaused || this.waitingForStartMusic) return;

    // Handle Player 1 controls (arrow keys)
    if (View.KEYS1[event.keyCode]) {
      this.board.player1.turn(View.KEYS1[event.keyCode]);
    }
    // Handle WASD keys - also controls Player 1
    else if (View.KEYS2[event.keyCode]) {
      this.board.player1.turn(View.KEYS2[event.keyCode]);
    }
  }

  /**
   * Executes one frame of the game logic with individual timing.
   * Updates light cycle positions based on their individual speeds.
   * Rendering is handled separately in the RAF loop.
   * @param {number} currentTime - Current timestamp for timing calculations
   */
  step(currentTime) {
    // Update explosion animations even when paused/collided
    this.board.playerTeam.forEach((player) => {
      if (player.exploding) {
        player.updateExplosion(currentTime);
      }
    });
    this.board.enemyTeam.forEach((enemy) => {
      if (enemy.exploding) {
        enemy.updateExplosion(currentTime);
      }
    });

    // Don't update game if paused, collision delay is active, or waiting for start music
    if (
      this.isPaused ||
      this.collisionOccurred ||
      this.waitingForStartMusic
    ) {
      return;
    }

    if (this.board.isPlayerTeamAlive() && this.board.isEnemyTeamAlive()) {
      // Move all living player team cycles
      this.board.playerTeam.forEach((player) => {
        if (player.alive && player.shouldMove(currentTime)) {
          player.move();
        }
      });

      // Move all living enemy team cycles (AI-controlled)
      this.board.enemyTeam.forEach((enemy) => {
        if (enemy.alive && enemy.shouldMove(currentTime)) {
          enemy.computerMove(); // AI-controlled
        }
      });
    } else {
      // A collision has occurred - start the delay sequence
      this.#handleCollision();
    }
  }

  /**
   * Handles the collision sequence with proper timing.
   * Delays before ending the game to allow collision sound to play.
   * Note: Collision sound is played in LightCycle.derezz() when the crash occurs.
   * @private
   */
  #handleCollision() {
    if (this.collisionOccurred) return; // Prevent multiple collision handling

    this.collisionOccurred = true;

    if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
      console.log("Collision detected, starting delay sequence");
    }

    // Set up delayed game over (collision sound already played in derezz())
    this.collisionDelayTimeout = setTimeout(() => {
      this.#endGame();
    }, GAME_CONFIG.AUDIO.COLLISION_DELAY);
  }

  /**
   * Handles the end of game sequence.
   * Stops the game loop, shows end screen, and updates UI.
   * @private
   */
  #endGame() {
    // Stop the game loop
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Stop all engine sounds
    if (this.soundGenerator) {
      this.soundGenerator.stopAll();
    }

    // Show end overlay (game remains visible in background)
    const endOverlay = document.querySelector(".overlay--end");
    if (endOverlay) {
      endOverlay.classList.add("overlay--visible");
    }

    const winner = this.#checkWinner();

    // Use dynamic end screen rendering with player names
    window.renderEndScreen(winner, window.gameState.playerNames);

    this.#updateScore(winner);
    this.#playEndGameAudio(winner);
  }

  /**
   * Updates the win counter for the winning player.
   * @private
   * @param {string} winner - The winning player ("Player 1" or "Player 2")
   */
  #updateScore(winner) {
    const colorMap = {
      "Player 1": "blue",
      "Player 2": "red",
    };

    const color = colorMap[winner];
    if (color) {
      window.wins[color]++;

      const redWinsElement = document.querySelector(".score__wins--red");
      const blueWinsElement = document.querySelector(".score__wins--blue");

      if (redWinsElement) redWinsElement.textContent = window.wins.red;
      if (blueWinsElement) blueWinsElement.textContent = window.wins.blue;
    }
  }

  /**
   * Plays the appropriate audio based on the game outcome.
   * @private
   * @param {string} winner - The winning player ("Player 1" or "Player 2")
   */
  #playEndGameAudio(winner) {
    if (winner === "Player 1") {
      // Player wins
      this.soundGenerator.playVictory();
    } else {
      // Computer wins
      this.soundGenerator.playDefeat();
    }
  }

  /**
   * Determines the winner based on which team is still alive.
   * @private
   * @returns {string} The winning player ("Player 1" or "Player 2")
   */
  #checkWinner() {
    return this.board.isPlayerTeamAlive() ? "Player 1" : "Player 2";
  }

  /**
   * Renders the current game state using the canvas renderer.
   */
  render() {
    // Use new team-based rendering if available, fallback to legacy
    if (
      this.renderer.renderTeams &&
      this.board.playerTeam &&
      this.board.enemyTeam
    ) {
      this.renderer.renderTeams(this.board.playerTeam, this.board.enemyTeam);
    } else {
      // Legacy rendering for backward compatibility
      this.renderer.render(this.board.player1, this.board.player2);
    }

    // Draw debug information if enabled
    if (
      GAME_CONFIG.DEBUG.SHOW_COLLISION_GRID ||
      GAME_CONFIG.DEBUG.SHOW_PERFORMANCE_STATS
    ) {
      this.renderer.drawDebugInfo(
        this.board.collisionGrid,
        this.performanceMonitor
      );
    }
  }

  /**
   * Toggles the game pause state and shows/hides the pause overlay.
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    const pauseOverlay = document.querySelector(".overlay--pause");

    if (pauseOverlay) {
      if (this.isPaused) {
        pauseOverlay.classList.add("overlay--visible");
        // Stop all engine sounds when paused
        if (this.soundGenerator) {
          this.soundGenerator.stopAll();
        }
      } else {
        pauseOverlay.classList.remove("overlay--visible");
        // Resume engine sounds when unpaused
        [...this.board.playerTeam, ...this.board.enemyTeam].forEach(cycle => {
          if (cycle.alive && this.soundGenerator) {
            this.soundGenerator.playEngine(cycle.id, cycle.isPlayer);
          }
        });
      }
    } else if (GAME_CONFIG.PERFORMANCE.DEBUG_MODE) {
      console.warn("Pause overlay element not found");
    }
  }

  /**
   * Resumes the game from a paused state.
   * Hides the pause overlay and sets isPaused to false.
   */
  resumeGame() {
    this.isPaused = false;
    const pauseOverlay = document.querySelector(".overlay--pause");
    if (pauseOverlay) {
      pauseOverlay.classList.remove("overlay--visible");
    }
  }

  /**
   * Shows the countdown overlay with the current countdown number.
   */
  showCountdown() {
    const countdownOverlay = document.querySelector(".countdown");
    const countdownNumber = document.querySelector(".countdown__number");

    if (countdownOverlay && countdownNumber) {
      countdownNumber.textContent = this.countdownNumber.toString();

      // Remove hidden class and add visible class to ensure proper display
      countdownOverlay.classList.remove("countdown--hidden");
      countdownOverlay.classList.add("countdown--visible");

      // Reset animations by removing and re-adding classes
      const countdownDisplay = document.querySelector(".countdown__display");
      if (countdownDisplay) {
        countdownDisplay.style.animation = "none";

        // Force reflow
        countdownDisplay.offsetHeight;

        // Re-enable animations
        countdownDisplay.style.animation = "countdownPulse 1s ease-in-out";
      }

      if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
        console.log(
          `Countdown displayed: ${this.countdownNumber}, overlay classes:`,
          countdownOverlay.className
        );
      }
    }
  }

  /**
   * Hides the countdown overlay.
   */
  hideCountdown() {
    const countdownOverlay = document.querySelector(".countdown");
    if (countdownOverlay) {
      countdownOverlay.classList.remove("countdown--visible");
      countdownOverlay.classList.add("countdown--hidden");

      if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
        console.log(
          "Countdown hidden, overlay classes:",
          countdownOverlay.className
        );
      }
    }
  }

  /**
   * Starts the countdown sequence synchronized with the start music.
   * Shows "3", "2", "1" at 1-second intervals during the 4-second start music.
   */
  startCountdown() {
    // Reset countdown state
    this.countdownNumber = 3;
    this.clearCountdownTimeouts();

    // Show initial countdown (3)
    this.showCountdown();

    // Schedule countdown updates
    // At 1 second: show "2"
    this.countdownTimeouts.push(
      setTimeout(() => {
        this.countdownNumber = 2;
        this.showCountdown();
      }, 1000)
    );

    // At 2 seconds: show "1"
    this.countdownTimeouts.push(
      setTimeout(() => {
        this.countdownNumber = 1;
        this.showCountdown();
      }, 2000)
    );

    // At 3 seconds: hide countdown (1 second before game starts)
    this.countdownTimeouts.push(
      setTimeout(() => {
        this.hideCountdown();
      }, 3000)
    );
  }

  /**
   * Clears all countdown timeouts for cleanup.
   */
  clearCountdownTimeouts() {
    this.countdownTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.countdownTimeouts = [];
  }

  /**
   * Cleanup method for proper resource management.
   * Removes event listeners, cancels animation frames, and cleans up renderer.
   */
  cleanup() {
    // Stop game loop
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clear collision delay timeout
    if (this.collisionDelayTimeout) {
      clearTimeout(this.collisionDelayTimeout);
      this.collisionDelayTimeout = null;
    }

    // Clear start music delay timeout
    if (this.startMusicDelayTimeout) {
      clearTimeout(this.startMusicDelayTimeout);
      this.startMusicDelayTimeout = null;
    }

    // Clear countdown timeouts
    this.clearCountdownTimeouts();

    // Hide countdown overlay
    this.hideCountdown();

    // Remove event listeners
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }

    // Cleanup renderer
    if (this.renderer) {
      this.renderer.cleanup();
      this.renderer = null;
    }

    // Cleanup sound generator
    if (this.soundGenerator) {
      this.soundGenerator.cleanup();
      this.soundGenerator = null;
    }

    // Clear references
    this.board = null;

    if (GAME_CONFIG.PERFORMANCE.DEBUG_MODE) {
      console.log("Game view cleaned up");
    }
  }
}

// Export the classes and functions
export {
  View,
  updateDifficultyDisplay
};
