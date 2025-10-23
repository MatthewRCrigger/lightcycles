import { GAME_CONFIG } from './config.js';

/**
 * Performance monitoring utility for debugging and optimization.
 * Tracks FPS, frame times, and game statistics.
 */
export class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.fps = 0;
    this.frameTime = 0;
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;
    this.totalFrameTime = 0;
    this.enabled = GAME_CONFIG.DEBUG.SHOW_PERFORMANCE_STATS;
  }

  /**
   * Updates performance metrics with the current frame time.
   * @param {number} frameTime - Time taken for the current frame in milliseconds
   */
  update(frameTime) {
    if (!this.enabled) return;

    this.frameCount++;
    this.frameTime = frameTime;
    this.totalFrameTime += frameTime;
    this.minFrameTime = Math.min(this.minFrameTime, frameTime);
    this.maxFrameTime = Math.max(this.maxFrameTime, frameTime);

    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      if (GAME_CONFIG.DEBUG.SHOW_FPS) {
        console.log(
          `FPS: ${this.fps}, Frame Time: ${this.frameTime.toFixed(2)}ms`
        );
      }
    }
  }

  /**
   * Gets current performance statistics.
   * @returns {Object} Performance statistics
   */
  getStats() {
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      minFrameTime: this.minFrameTime,
      maxFrameTime: this.maxFrameTime,
      avgFrameTime:
        this.frameCount > 0 ? this.totalFrameTime / this.frameCount : 0,
    };
  }

  /**
   * Enables or disables performance monitoring.
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}
