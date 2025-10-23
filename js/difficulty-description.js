/**
 * Difficulty Description Generator
 * Dynamically generates human-readable descriptions from difficulty configuration.
 * This ensures descriptions stay in sync with actual game configuration.
 */

import { difficultySettings } from './config.js';

/**
 * Template functions for generating description parts.
 * These can be expanded as new difficulty parameters are added.
 */
const descriptionTemplates = {
  /**
   * Generates speed comparison text
   * @param {Object} config - Difficulty configuration
   * @returns {string} Speed description
   */
  speed(config) {
    const speedDiff = config.playerSpeed - config.enemySpeed;

    if (speedDiff > 10) {
      return "You move much slower than the AI";
    } else if (speedDiff > 0) {
      return "You move slightly slower than the AI";
    } else if (speedDiff === 0) {
      return "You and the AI move at equal speed";
    } else if (speedDiff > -10) {
      return "You move slightly faster than the AI";
    } else {
      return "You move much faster than the AI";
    }
  },

  /**
   * Generates AI intelligence description
   * @param {Object} config - Difficulty configuration
   * @returns {string} AI intelligence description
   */
  aiIntelligence(config) {
    const thinking = config.strategicThinking;

    if (thinking < 0.5) {
      return "AI makes frequent mistakes";
    } else if (thinking < 0.75) {
      return "AI makes occasional mistakes";
    } else if (thinking < 0.9) {
      return "AI plays competently";
    } else if (thinking < 0.97) {
      return "AI plays strategically";
    } else {
      return "AI plays near-perfectly";
    }
  },

  /**
   * Generates opponent count description
   * @param {Object} config - Difficulty configuration
   * @returns {string} Opponent count description
   */
  opponentCount(config) {
    const count = config.enemyCycles;
    return `Face ${count} ${count === 1 ? "opponent" : "opponents"}`;
  },
};

/**
 * Generates a complete difficulty description from configuration.
 * @param {string} difficultyKey - The difficulty key (e.g., "easy", "hard")
 * @returns {string} Complete difficulty description
 */
export function generateDifficultyDescription(difficultyKey) {
  const config = difficultySettings[difficultyKey];

  if (!config) {
    console.warn(`Unknown difficulty: ${difficultyKey}`);
    return "";
  }

  // Generate description parts from templates
  const parts = [
    descriptionTemplates.opponentCount(config),
    descriptionTemplates.speed(config),
    descriptionTemplates.aiIntelligence(config),
  ];

  // Join parts with proper punctuation
  return parts.join(". ") + ".";
}

/**
 * Updates the difficulty description element in the DOM.
 * @param {string} difficultyKey - The difficulty key
 */
export function updateDifficultyDescription(difficultyKey) {
  const descriptionElement = document.querySelector("[data-difficulty-description]");

  if (descriptionElement) {
    const description = generateDifficultyDescription(difficultyKey);
    descriptionElement.textContent = description;
  }
}

/**
 * Gets the currently selected difficulty from the form.
 * @returns {string|null} The selected difficulty key or null
 */
export function getSelectedDifficulty() {
  const selectedRadio = document.querySelector('input[name="difficulty"]:checked');
  return selectedRadio ? selectedRadio.value : null;
}
