/**
 * @fileoverview Tron Light Cycles Game - Main Entry Point
 *
 * This file handles game initialization, UI event management, and global state.
 * The actual game logic is now modularized into separate files for better maintainability.
 *
 * @author Matthew Crigger
 * @version 2.1.0
 */

// Load environment-specific configuration injected at build time
import 'virtual-config';

import { GAME_CONFIG, difficultySettings } from './config.js';
import { View, updateDifficultyDisplay } from './game-controller.js';
import { updateDifficultyDescription, getSelectedDifficulty } from './difficulty-description.js';
import './ai-integration.js'; // Load AI integration system

/**
 * Global game state object containing current game information.
 * @type {Object}
 * @property {Object} wins - Win counters for both players
 * @property {number} wins.blue - Number of wins for blue player (Player 1)
 * @property {number} wins.red - Number of wins for red player (Player 2)
 * @property {View|null} view - Current game view instance
 * @property {Object|null} playerNames - Current player names for the game
 */
const gameState = {
  wins: { blue: 0, red: 0 },
  view: null,
  playerNames: null,
};

// Make game state globally available
window.gameState = gameState;
window.wins = gameState.wins;

/**
 * Initializes the page with all necessary event listeners and setup.
 * Called when the DOM is fully loaded.
 */
function initializePage() {
  // Set initial UI state
  setInitialUIState();

  // Set up all event listeners
  setupEventListeners();

  console.log("Light Cycles game initialized");
}

/**
 * Sets the initial state of UI elements.
 */
function setInitialUIState() {
  // Set initial difficulty
  window.difficulty = 2; // Easy
  updateDifficultyDisplay();

  // Update initial difficulty description
  const initialDifficulty = getSelectedDifficulty();
  if (initialDifficulty) {
    updateDifficultyDescription(initialDifficulty);
  }
}



/**
 * Sets up all event listeners for the game.
 */
function setupEventListeners() {
  // Use event delegation for better performance and dynamic content handling
  document.addEventListener("click", handleGlobalClick);

  // Set up game setup form
  setupGameSetupForm();

  // Set up difficulty radio listeners
  setupDifficultyRadios();

  // Set up mobile controls
  setupMobileControls();
}

/**
 * Sets up difficulty radio input listeners.
 */
function setupDifficultyRadios() {
  document.querySelectorAll('input[name="difficulty"]').forEach((radio) => {
    radio.addEventListener("change", handleDifficultySelection);
  });

  // Handle keyboard navigation on labels for Safari compatibility
  document.querySelectorAll('.difficulty-selection__btn').forEach((label) => {
    label.addEventListener('keydown', (e) => {
      const radio = label.querySelector('input[type="radio"]');

      // Space or Enter key - select this radio
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Arrow keys - navigate between options
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextLabel = label.nextElementSibling;
        if (nextLabel && nextLabel.classList.contains('difficulty-selection__btn')) {
          nextLabel.focus();
          const nextRadio = nextLabel.querySelector('input[type="radio"]');
          if (nextRadio) {
            nextRadio.checked = true;
            nextRadio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevLabel = label.previousElementSibling;
        if (prevLabel && prevLabel.classList.contains('difficulty-selection__btn')) {
          prevLabel.focus();
          const prevRadio = prevLabel.querySelector('input[type="radio"]');
          if (prevRadio) {
            prevRadio.checked = true;
            prevRadio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
  });
}

/**
 * Sets up mobile control event listeners.
 */
function setupMobileControls() {
  // Mobile direction controls
  document.querySelectorAll('[data-action="move-direction"]').forEach((button) => {
    button.addEventListener("click", handleMobileDirection);
  });

  // Mobile pause control
  document.querySelectorAll('[data-action="toggle-pause"]').forEach((button) => {
    button.addEventListener("click", handleMobilePause);
  });
}


/**
 * Handles difficulty selection via radio inputs.
 * @param {Event} event - The change event
 */
function handleDifficultySelection(event) {
  const difficulty = event.target.value;
  const difficultyConfig = difficultySettings[difficulty];

  if (!difficultyConfig) {
    console.error(`Invalid difficulty: ${difficulty}`);
    return;
  }

  // Update global difficulty
  window.difficulty = difficultyConfig.level;

  // Note: Visual selection is now handled by CSS :has(:checked) selector
  // No need to manually toggle classes anymore!

  // Update difficulty display in game UI
  updateDifficultyDisplay();

  // Update difficulty description
  updateDifficultyDescription(difficulty);

  if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
    console.log(`Difficulty set to: ${difficultyConfig.name} (Level ${difficultyConfig.level})`);
  }
}

/**
 * Game action handlers object containing all game-related actions.
 */
const gameActions = {
  /**
   * Starts the game.
   */
  startGame() {
    const playerName = document.getElementById("player1-name")?.value.trim() || "Player";

    gameState.playerNames = {
      player1Name: playerName,
      player2Name: "Computer", // AI opponent
    };

    // Clean up existing game
    if (gameState.view) {
      gameState.view.cleanup();
    }

    // Create new game
    gameState.view = new View(null, 1);

    // Show game screen
    this.showGameScreen();

    // Start the game
    gameState.view.startGame();

    // Initialize AI
    if (window.AIIntegration) {
      try {
        window.AIIntegration.initializeAI(gameState.view.board, 1);
      } catch (error) {
        console.warn("Failed to initialize enhanced AI:", error);
      }
    }
  },

  /**
   * Resumes the current game.
   */
  resumeGame() {
    if (gameState.view) {
      gameState.view.resumeGame();
    }
  },

  /**
   * Replays the game with the same settings.
   */
  replayGame() {
    if (!gameState.playerNames) {
      console.warn("No previous game to replay");
      return;
    }

    // Clean up existing game
    if (gameState.view) {
      gameState.view.cleanup();
    }

    // Create new game with same settings
    gameState.view = new View(null, 1);

    // Hide end overlay
    this.hideEndOverlay();

    // Start the game
    gameState.view.startGame();

    // Initialize AI
    if (window.AIIntegration) {
      try {
        window.AIIntegration.initializeAI(gameState.view.board, 1);
      } catch (error) {
        console.warn("Failed to initialize enhanced AI:", error);
      }
    }
  },

  /**
   * Restarts the current game.
   */
  restartGame() {
    if (!gameState.playerNames) {
      console.warn("No active game to restart");
      return;
    }

    // Clean up existing game
    if (gameState.view) {
      gameState.view.cleanup();
    }

    // Create new game with same settings
    gameState.view = new View(null, 1);

    // Hide pause overlay
    this.hidePauseOverlay();

    // Start the game
    gameState.view.startGame();

    // Initialize AI
    if (window.AIIntegration) {
      try {
        window.AIIntegration.initializeAI(gameState.view.board, 1);
      } catch (error) {
        console.warn("Failed to initialize enhanced AI:", error);
      }
    }
  },

  /**
   * Returns to the main menu.
   */
  returnToMainMenu() {
    // Clean up current game
    if (gameState.view) {
      gameState.view.cleanup();
      gameState.view = null;
    }

    // Reset scores
    window.wins.blue = 0;
    window.wins.red = 0;

    // Update score display
    const redWinsElement = document.querySelector(".score__wins--red");
    const blueWinsElement = document.querySelector(".score__wins--blue");
    if (redWinsElement) redWinsElement.textContent = "0";
    if (blueWinsElement) blueWinsElement.textContent = "0";

    // Hide game screen and overlays
    this.hideGameScreen();
    this.hideEndOverlay();
    this.hidePauseOverlay();

    // Show main menu
    const menu = document.querySelector(".menu");
    if (menu) {
      menu.classList.add("menu--visible");
    }
  },

  /**
   * Shows the game screen and hides the menu.
   */
  showGameScreen() {
    const menu = document.querySelector(".menu");
    const game = document.querySelector(".game");
    const gameInfo = document.querySelector(".game__info");
    const mobileControls = document.querySelector(".mobile-controls");

    if (menu) {
      menu.classList.remove("menu--visible");
      menu.classList.add("hidden");
    }
    if (game) game.classList.add("game--active");
    if (gameInfo) gameInfo.classList.remove("hidden");
    if (mobileControls) mobileControls.classList.remove("hidden");
  },

  /**
   * Hides the game screen and shows the menu.
   */
  hideGameScreen() {
    const menu = document.querySelector(".menu");
    const game = document.querySelector(".game");
    const gameInfo = document.querySelector(".game__info");
    const mobileControls = document.querySelector(".mobile-controls");

    if (menu) {
      menu.classList.add("menu--visible");
      menu.classList.remove("hidden");
    }
    if (game) game.classList.remove("game--active");
    if (gameInfo) gameInfo.classList.add("hidden");
    if (mobileControls) mobileControls.classList.add("hidden");
  },

  /**
   * Hides the end game overlay.
   */
  hideEndOverlay() {
    const endOverlay = document.querySelector(".overlay--end");
    if (endOverlay) {
      endOverlay.classList.remove("overlay--visible");
    }
  },

  /**
   * Hides the pause overlay.
   */
  hidePauseOverlay() {
    const pauseOverlay = document.querySelector(".overlay--pause");
    if (pauseOverlay) {
      pauseOverlay.classList.remove("overlay--visible");
    }
  },
};

/**
 * Handles mobile direction button clicks.
 * @param {Event} event - The click event
 */
function handleMobileDirection(event) {
  const direction = event.target.closest('[data-direction]')?.dataset.direction;
  if (!direction || !gameState.view) return;

  // In mobile, always control player 1
  gameState.view.board.player1.turn(direction);
}

/**
 * Handles mobile pause button clicks.
 */
function handleMobilePause() {
  if (gameState.view) {
    gameState.view.togglePause();
  }
}


/**
 * Sets up the game setup form handlers.
 */
function setupGameSetupForm() {
  const form = document.getElementById("game-setup-form");

  // Handle form submission
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      gameActions.startGame();
    });
  }

  // Set up input validation listeners
  const player1Input = document.getElementById("player1-name");

  if (player1Input) {
    player1Input.addEventListener("input", validateForm);
  }
}

/**
 * Validates the form and enables/disables the start button.
 */
function validateForm() {
  const startButton = document.getElementById("start-game-btn");
  const nameInput = document.getElementById("player1-name");

  if (!startButton) return;

  const isValid = nameInput?.value.trim().length > 0;

  startButton.disabled = !isValid;
  startButton.classList.toggle("btn--disabled", !isValid);
}

/**
 * Colors a player name with the appropriate team color.
 * @param {string} playerName - The player name to color
 * @param {number} playerNumber - The player number (1 or 2)
 * @returns {string} HTML string with colored player name
 */
function colorCodePlayerName(playerName, playerNumber) {
  const colorClass = playerNumber === 1 ? "player--blue" : "player--red";
  return `<span class="${colorClass}">${playerName}</span>`;
}

/**
 * End screen result generator.
 */
const endScreenResults = {
  /**
   * Gets the appropriate result message and styling for the game outcome.
   * @param {string} winner - The winning player ("Player 1" or "Player 2")
   * @param {Object} playerNames - Object containing player names
   * @returns {Object} Result object with title, subtitle, and CSS class
   */
  getResult(winner, playerNames) {
    const winnerName = playerNames.player1Name;

    if (winner === "Player 1") {
      // Player wins
      return {
        title: `Victory, ${colorCodePlayerName(winnerName, 1)}!`,
        subtitle: "The computer has been derezzed",
        messageClass: "result-message--victory",
      };
    } else {
      // Computer wins
      return {
        title: "Game Over",
        subtitle: `${colorCodePlayerName(playerNames.player1Name, 1)} was derezzed`,
        messageClass: "result-message--defeat",
      };
    }
  },
};

/**
 * Renders the end screen with dynamic content based on game outcome.
 * @param {string} winner - The winning player ("Player 1" or "Player 2")
 * @param {Object} playerNames - Object containing player names
 */
function renderEndScreen(winner, playerNames) {
  const result = endScreenResults.getResult(winner, playerNames);

  const titleElement = document.getElementById("dynamic-result-message");
  const subtitleElement = document.getElementById("dynamic-result-subtitle");

  if (titleElement) {
    titleElement.innerHTML = result.title;
    titleElement.className = `result-message ${result.messageClass}`;
  }

  if (subtitleElement) {
    subtitleElement.innerHTML = result.subtitle;
  }

  if (GAME_CONFIG.DEBUG.LOG_GAME_EVENTS) {
    console.log("End screen rendered:", {
      winner,
      playerNames,
      result,
    });
  }
}

// Make renderEndScreen globally available
window.renderEndScreen = renderEndScreen;

/**
 * Global click handler using event delegation.
 * @param {Event} event - The click event
 */
function handleGlobalClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  // Handle different types of actions
  switch (action) {
    case "start-game":
      gameActions.startGame();
      break;
    case "resume-game":
      gameActions.resumeGame();
      break;
    case "restart-game":
      gameActions.restartGame();
      break;
    case "replay-game":
      gameActions.replayGame();
      break;
    case "return-to-main-menu":
      gameActions.returnToMainMenu();
      break;
    default:
      console.warn(`Unknown action: ${action}`);
  }
}

// Initialize the game when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePage);
} else {
  initializePage();
}
