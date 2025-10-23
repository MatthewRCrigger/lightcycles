/**
 * AI Integration Module
 * Enhances the existing Light Cycles game with advanced AI from the Google AI Challenge 2010 winner
 *
 * This module provides a bridge between the enhanced AI system and the existing game architecture.
 */

import { EnhancedTronAI } from './enhanced-ai.js';

/**
 * Enhanced AI Controller that integrates with the existing LightCycle class
 */
class AIController {
  constructor() {
    this.enhancedAI = null;
    this.isEnabled = false;
    this.lastMoveTime = 0;
    this.moveInterval = 500; // Increased to 500ms to reduce AI load
    this.lastDecision = null; // Cache last decision
    this.decisionCacheTime = 0;
  }

  /**
   * Initialize the enhanced AI for a specific game board and player
   */
  initialize(board, playerId) {
    try {
      if (typeof EnhancedTronAI !== 'undefined') {
        this.enhancedAI = new EnhancedTronAI(board, playerId);
        this.isEnabled = true;
        console.log('Enhanced AI initialized successfully');
      } else {
        console.warn('Enhanced AI not available, falling back to original AI');
        this.isEnabled = false;
      }
    } catch (error) {
      console.error('Failed to initialize enhanced AI:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Get the best move using enhanced AI if available, otherwise use original logic
   * Optimized for performance with lightweight caching
   */
  getBestMove(lightCycles, currentPlayerId) {
    const now = Date.now();

    // Use cached decision if very recent (within 50ms) - handles rapid calls
    if (this.lastDecision && (now - this.decisionCacheTime) < 50) {
      return this.lastDecision;
    }

    this.lastMoveTime = now;

    if (!this.isEnabled || !this.enhancedAI) {
      return null; // Fall back to original AI
    }

    try {
      // Convert light cycles to position format expected by enhanced AI
      const playerPositions = this.convertLightCyclesToPositions(lightCycles);

      // Get the best move from enhanced AI with timeout protection
      const startTime = Date.now();
      const moveIndex = this.enhancedAI.getBestMove(playerPositions);
      const aiTime = Date.now() - startTime;

      // If AI takes too long, increase the throttle interval
      if (aiTime > 100) {
        this.moveInterval = Math.min(1000, this.moveInterval * 1.2);
        console.warn(`AI taking ${aiTime}ms, increasing throttle to ${this.moveInterval}ms`);
      }

      if (moveIndex !== null) {
        // Convert move index back to direction string
        const direction = this.enhancedAI.moveToDirection(moveIndex);
        this.lastDecision = direction;
        this.decisionCacheTime = now;
        return direction;
      }
    } catch (error) {
      console.error('Enhanced AI error:', error);
      // Disable enhanced AI on repeated errors
      this.isEnabled = false;
    }

    return null;
  }

  /**
   * Convert LightCycle objects to the position format expected by enhanced AI
   */
  convertLightCyclesToPositions(lightCycles) {
    const positions = [];

    lightCycles.forEach((cycle, index) => {
      if (cycle && cycle.segments && cycle.segments.length > 0 && !cycle.isDead) {
        const head = cycle.head();
        positions[index] = { x: head.x, y: head.y };
      } else {
        positions[index] = null;
      }
    });

    return positions;
  }

  /**
   * Check if enhanced AI is available and enabled
   */
  isEnhancedAIEnabled() {
    return this.isEnabled && this.enhancedAI !== null;
  }

  /**
   * Get AI performance statistics
   */
  getStats() {
    if (!this.enhancedAI) {
      return { enabled: false };
    }

    return {
      enabled: this.isEnabled,
      evaluations: this.enhancedAI.evaluations || 0,
      lastSearchTime: this.enhancedAI.timedOut ? 'timeout' : 'completed'
    };
  }
}

// Global AI controller instance
const globalAIController = new AIController();

/**
 * Enhanced AI Integration Functions
 * These functions can be called from the existing LightCycle class
 */
const AIIntegration = {
  /**
   * Initialize AI for the current game
   */
  initializeAI: function(board, playerId = 1) {
    globalAIController.initialize(board, playerId);
  },

  /**
   * Get enhanced AI move recommendation
   */
  getEnhancedMove: function(lightCycles, currentPlayerId) {
    return globalAIController.getBestMove(lightCycles, currentPlayerId);
  },

  /**
   * Check if enhanced AI is available
   */
  isEnhanced: function() {
    return globalAIController.isEnhancedAIEnabled();
  },

  /**
   * Get AI statistics
   */
  getAIStats: function() {
    return globalAIController.getStats();
  },

  /**
   * Enhanced direction evaluation that can be used by existing AI
   */
  evaluateDirection: function(lightCycle, direction, board, allCycles) {
    if (!globalAIController.isEnhancedAIEnabled()) {
      return 0; // Fall back to original scoring
    }

    try {
      // Create a temporary position for evaluation
      const currentHead = lightCycle.head();
      const directionMap = { 'N': 0, 'E': 1, 'S': 2, 'W': 3 };
      const moveIndex = directionMap[direction];

      if (moveIndex === undefined) return 0;

      const directions = [
        { x: 0, y: -1 }, // N
        { x: 1, y: 0 },  // E
        { x: 0, y: 1 },  // S
        { x: -1, y: 0 }  // W
      ];

      const newPos = {
        x: currentHead.x + directions[moveIndex].x,
        y: currentHead.y + directions[moveIndex].y
      };

      // Use enhanced AI's position evaluation
      const playerPositions = globalAIController.convertLightCyclesToPositions(allCycles);
      const currentPlayerId = allCycles.indexOf(lightCycle);

      if (currentPlayerId >= 0 && playerPositions[currentPlayerId]) {
        // Temporarily update position for evaluation
        const originalPos = playerPositions[currentPlayerId];
        playerPositions[currentPlayerId] = newPos;

        const score = globalAIController.enhancedAI.evaluatePosition(playerPositions);

        // Restore original position
        playerPositions[currentPlayerId] = originalPos;

        return score;
      }
    } catch (error) {
      console.warn('Enhanced direction evaluation failed:', error);
    }

    return 0;
  }
};

// Make AIIntegration available globally for backward compatibility
window.AIIntegration = AIIntegration;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('AI Integration module loaded');
  });
} else {
  console.log('AI Integration module loaded');
}

// Export for ES6 modules
export { AIController, AIIntegration };
