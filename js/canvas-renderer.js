import { GAME_CONFIG } from './config.js';

/**
 * Handles all canvas rendering operations for the Tron game.
 * Manages sprites, grid background, light cycle trails, and visual effects.
 */
export class CanvasRenderer {
  /**
   * Creates a new canvas renderer.
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {number} gridWidth - The width of the game grid in cells
   * @param {number} gridHeight - The height of the game grid in cells
   */
  constructor(canvas, gridWidth, gridHeight) {
    /** @type {HTMLCanvasElement} The canvas element */
    this.canvas = canvas;
    /** @type {CanvasRenderingContext2D} The 2D rendering context */
    this.ctx = canvas.getContext("2d");
    /** @type {number} Grid width in cells */
    this.gridWidth = gridWidth;
    /** @type {number} Grid height in cells */
    this.gridHeight = gridHeight;
    /** @type {number} Size of each grid cell in pixels */
    this.cellSize = GAME_CONFIG.BOARD.CELL_SIZE;

    // Set canvas size
    canvas.width = gridWidth * this.cellSize;
    canvas.height = gridHeight * this.cellSize;

    // The field's frame is drawn by CSS (a single GRID hairline on .canvas),
    // so the renderer only owns the fill. Setting a border here would stack a
    // second, thicker line on top of it.
    canvas.style.backgroundColor = GAME_CONFIG.COLORS.CANVAS_BG;

    // Create background canvas for performance optimization
    /** @type {HTMLCanvasElement} Background canvas for static grid */
    this.backgroundCanvas = document.createElement("canvas");
    /** @type {CanvasRenderingContext2D} Background canvas context */
    this.backgroundCtx = this.backgroundCanvas.getContext("2d");
    this.backgroundCanvas.width = canvas.width;
    this.backgroundCanvas.height = canvas.height;

    // Load sprites with error handling
    /** @type {Object.<string, HTMLImageElement>} Sprite images for light cycles */
    this.sprites = {
      blue: new Image(),
      red: new Image(),
      explosion: new Image(),
    };

    /** @type {boolean} Whether all sprites have finished loading */
    this.spritesLoaded = false;
    /** @type {boolean} Whether to use fallback graphics */
    this.useFallbackGraphics = false;
    /** @type {boolean} Whether background is pre-rendered */
    this.backgroundRendered = false;

    this.loadSprites();
  }

  /**
   * Loads all sprite images with comprehensive error handling.
   * Implements fallback graphics if sprites fail to load.
   */
  loadSprites() {
    let loadedCount = 0;
    let errorCount = 0;
    const totalSprites = Object.keys(this.sprites).length;

    const checkComplete = () => {
      if (loadedCount + errorCount === totalSprites) {
        this.spritesLoaded = loadedCount > 0;
        this.useFallbackGraphics = errorCount > 0;

        if (errorCount > 0) {
          console.warn(
            `${errorCount} sprites failed to load, using fallback graphics`
          );
        }

        if (GAME_CONFIG.PERFORMANCE.DEBUG_MODE) {
          console.log(
            `Sprites loaded: ${loadedCount}/${totalSprites}, fallback: ${this.useFallbackGraphics}`
          );
        }
      }
    };

    Object.entries(this.sprites).forEach(([spriteColor, spriteImage]) => {
      spriteImage.onload = () => {
        loadedCount++;
        checkComplete();
      };

      spriteImage.onerror = () => {
        console.error(`Failed to load sprite: ${spriteColor}`);
        errorCount++;
        checkComplete();
      };

      // Add timeout fallback for slow connections
      const timeoutId = setTimeout(() => {
        if (!spriteImage.complete && spriteImage.naturalWidth === 0) {
          console.warn(`Sprite loading timeout: ${spriteColor}`);
          spriteImage.onerror();
        }
      }, GAME_CONFIG.PERFORMANCE.SPRITE_LOAD_TIMEOUT);

      spriteImage.onload = () => {
        clearTimeout(timeoutId);
        loadedCount++;
        checkComplete();
      };

      // Set source to start loading
      if (spriteColor === 'explosion') {
        spriteImage.src = `/sprites/explosion.png`;
      } else {
        spriteImage.src = `/sprites/light_cycle_${spriteColor}.png`;
      }
    });
  }

  /**
   * Draws the Tron-style grid background pattern using config values.
   * Creates a pattern of dark blue blocks with black borders.
   * Renders to background canvas for performance optimization.
   */
  drawGridBackground() {
    const ctx = this.backgroundRendered ? this.ctx : this.backgroundCtx;
    const canvas = this.backgroundRendered
      ? this.canvas
      : this.backgroundCanvas;

    // Clear canvas with black first
    ctx.fillStyle = GAME_CONFIG.COLORS.CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Backdrop grid — repeating hairlines on a fixed pitch, matching the
    // system's .g-grid-bg utility. Lines, not fills: the field reads as graph
    // paper the cycles are drawn on, never as a field of lit tiles.
    const pitch = GAME_CONFIG.RENDERING.GRID_PITCH;

    ctx.strokeStyle = GAME_CONFIG.COLORS.GRID_BACKGROUND;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // The 0.5 offset puts each 1px line on a pixel centre so it stays crisp
    // rather than smearing across two columns.
    for (let x = pitch; x < canvas.width; x += pitch) {
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, canvas.height);
    }
    for (let y = pitch; y < canvas.height; y += pitch) {
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(canvas.width, Math.floor(y) + 0.5);
    }

    ctx.stroke();

    // Mark background as rendered if this was the first time
    if (!this.backgroundRendered) {
      this.backgroundRendered = true;
    }
  }

  /**
   * Pre-renders the background to the background canvas for performance.
   */
  renderBackground() {
    this.drawGridBackground();
  }

  /**
   * Clears the canvas and redraws the grid background using cached background.
   */
  clear() {
    if (this.backgroundRendered) {
      // Use cached background for performance
      this.ctx.drawImage(this.backgroundCanvas, 0, 0);
    } else {
      // Fallback to direct rendering
      this.drawGridBackground();
    }
  }

  /**
   * Gets the rotation angle in degrees for a sprite based on its direction.
   * Sprites face north by default and are rotated to match movement direction.
   * @param {string} direction - The direction ("N", "E", "S", or "W")
   * @returns {number} The rotation angle in degrees
   */
  getRotationAngle(direction) {
    // Sprites face north by default, rotate based on direction
    const rotations = {
      N: 0, // No rotation needed
      E: 90, // 90 degrees clockwise
      S: 180, // 180 degrees
      W: 270, // 270 degrees clockwise
    };
    return rotations[direction] || 0;
  }

  /**
   * Draws a rotated sprite at the specified position with fallback graphics.
   * @param {number} pixelX - The x coordinate in pixels
   * @param {number} pixelY - The y coordinate in pixels
   * @param {HTMLImageElement} spriteImage - The sprite image to draw
   * @param {string} direction - The direction to face ("N", "E", "S", or "W")
   * @param {string} fallbackColor - Fallback color for sprite
   */
  drawSprite(
    pixelX,
    pixelY,
    spriteImage,
    direction,
    fallbackColor = GAME_CONFIG.COLORS.BLUE_RIBBON
  ) {
    const centerPixelX = pixelX + this.cellSize / 2;
    const centerPixelY = pixelY + this.cellSize / 2;
    const spriteSize = this.cellSize * GAME_CONFIG.RENDERING.SPRITE_SCALE;

    if (this.spritesLoaded && !this.useFallbackGraphics) {
      // Draw actual sprite
      const rotation = this.getRotationAngle(direction);

      this.ctx.save();
      this.ctx.translate(centerPixelX, centerPixelY);
      this.ctx.rotate((rotation * Math.PI) / 180);
      this.ctx.drawImage(
        spriteImage,
        -spriteSize / 2,
        -spriteSize / 2,
        spriteSize,
        spriteSize
      );
      this.ctx.restore();
    } else {
      // Draw fallback graphics - simple directional arrow
      this.ctx.save();
      this.ctx.fillStyle = fallbackColor;
      this.ctx.translate(centerPixelX, centerPixelY);

      const rotation = this.getRotationAngle(direction);
      this.ctx.rotate((rotation * Math.PI) / 180);

      // Draw simple arrow shape
      this.ctx.beginPath();
      this.ctx.moveTo(0, -spriteSize / 2);
      this.ctx.lineTo(-spriteSize / 3, spriteSize / 2);
      this.ctx.lineTo(spriteSize / 3, spriteSize / 2);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  /**
   * Draws a continuous trail (light ribbon) for a light cycle's path using optimized rendering.
   * Uses a single path instead of multiple rectangles for better performance.
   * @param {Coordinate[]} segments - Array of coordinates representing the trail
   * @param {string} color - The color of the trail (CSS color string)
   */
  drawContinuousTrail(segments, color) {
    if (segments.length === 0) return;

    // Calculate ribbon width based on config values
    const spriteSize =
      this.cellSize * GAME_CONFIG.RENDERING.SPRITE_SIZE_MULTIPLIER;
    const spriteScale = spriteSize / 32;
    const ribbonWidth =
      GAME_CONFIG.RENDERING.RIBBON_WIDTH_SCALE * spriteScale;

    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = ribbonWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Use a single path for the entire trail - much more efficient
    this.ctx.beginPath();

    if (segments.length === 1) {
      // Single segment - draw a circle
      const coord = segments[0];
      const centerX = coord.column * this.cellSize + this.cellSize / 2;
      const centerY = coord.row * this.cellSize + this.cellSize / 2;
      this.ctx.arc(centerX, centerY, ribbonWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Multiple segments - draw connected path
      const firstCoord = segments[0];
      const startX = firstCoord.column * this.cellSize + this.cellSize / 2;
      const startY = firstCoord.row * this.cellSize + this.cellSize / 2;

      this.ctx.moveTo(startX, startY);

      for (let i = 1; i < segments.length; i++) {
        const coord = segments[i];
        const centerX = coord.column * this.cellSize + this.cellSize / 2;
        const centerY = coord.row * this.cellSize + this.cellSize / 2;
        this.ctx.lineTo(centerX, centerY);
      }

      this.ctx.stroke();
    }
  }

  /**
   * Draws a complete trail with both the light ribbon and light cycle sprite.
   * @param {Coordinate[]} segments - Array of coordinates representing the trail
   * @param {string} trailColor - The color of the trail (CSS color string)
   * @param {HTMLImageElement|null} spriteImage - The light cycle sprite to draw at the head
   * @param {string} direction - The direction the light cycle is facing ("N", "E", "S", or "W")
   * @param {LightCycle} cycle - The light cycle object (for explosion state)
   */
  drawTrail(segments, trailColor, spriteImage = null, direction = "N", cycle = null) {
    // Draw continuous trail for all segments
    this.drawContinuousTrail(segments, trailColor);

    // Draw sprite or explosion on the head (last segment)
    if (segments.length > 0) {
      const headCoordinate = segments[segments.length - 1];
      const headPixelX = headCoordinate.column * this.cellSize;
      const headPixelY = headCoordinate.row * this.cellSize;

      // If cycle is exploding, draw explosion instead of sprite
      if (cycle && cycle.exploding) {
        this.drawExplosion(headPixelX, headPixelY, cycle.explosionFrame);
      } else if (spriteImage) {
        this.drawSprite(
          headPixelX,
          headPixelY,
          spriteImage,
          direction,
          trailColor
        );
      }
    }
  }

  /**
   * Draws an explosion animation frame.
   * @param {number} x - X position in pixels
   * @param {number} y - Y position in pixels
   * @param {number} frame - Frame index (0 or 1)
   */
  drawExplosion(x, y, frame) {
    const explosionSprite = this.sprites.explosion;
    if (!explosionSprite || !explosionSprite.complete) {
      // Fallback: draw a simple explosion effect
      this.ctx.save();
      this.ctx.fillStyle =
        frame === 0
          ? GAME_CONFIG.COLORS.RED_RIBBON_2
          : GAME_CONFIG.COLORS.RED_RIBBON;
      this.ctx.fillRect(
        x,
        y,
        this.cellSize * GAME_CONFIG.RENDERING.SPRITE_SCALE,
        this.cellSize * GAME_CONFIG.RENDERING.SPRITE_SCALE
      );
      this.ctx.restore();
      return;
    }

    // Each frame is 32x32 pixels in the sprite sheet
    const frameWidth = 32;
    const frameHeight = 32;
    const sourceX = frame * frameWidth; // 0 or 32
    const sourceY = 0;

    const destWidth = this.cellSize * GAME_CONFIG.RENDERING.SPRITE_SCALE;
    const destHeight = this.cellSize * GAME_CONFIG.RENDERING.SPRITE_SCALE;

    this.ctx.save();
    this.ctx.drawImage(
      explosionSprite,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      x,
      y,
      destWidth,
      destHeight
    );
    this.ctx.restore();
  }

  /**
   * Gets the appropriate color for an enemy cycle based on its index.
   * @param {number} enemyIndex - Index of the enemy cycle (0-based)
   * @returns {string} Color hex string for the enemy
   */
  getEnemyColor(enemyIndex) {
    const colors = [
      GAME_CONFIG.COLORS.RED_RIBBON,
      GAME_CONFIG.COLORS.RED_RIBBON_2,
      GAME_CONFIG.COLORS.RED_RIBBON_3,
    ];
    return colors[enemyIndex % colors.length];
  }

  /**
   * Renders the complete game frame including all player and enemy light cycles.
   * @param {LightCycle[]} playerTeam - Array of player light cycles
   * @param {LightCycle[]} enemyTeam - Array of enemy light cycles
   */
  renderTeams(playerTeam, enemyTeam) {
    this.clear();

    // Draw player team (blue)
    playerTeam.forEach((player, index) => {
      this.drawTrail(
        player.segments,
        GAME_CONFIG.COLORS.BLUE_RIBBON,
        this.sprites.blue,
        player.direction,
        player // Pass cycle object for explosion state
      );
    });

    // Draw enemy team (red variations)
    enemyTeam.forEach((enemy, index) => {
      // Only draw if enemy has segments (derezzed/exploding enemies still have segments)
      if (enemy.segments.length > 0 || enemy.exploding) {
        this.drawTrail(
          enemy.segments,
          this.getEnemyColor(index),
          enemy.alive ? this.sprites.red : null, // Only show sprite if alive
          enemy.direction,
          enemy // Pass cycle object for explosion state
        );
      }
    });

    // Draw player names for all cycles
    this.drawTeamNames(playerTeam, enemyTeam);
  }

  /**
   * Legacy render method for backward compatibility.
   * @param {LightCycle} player1 - The first player's light cycle (blue)
   * @param {LightCycle} player2 - The second player's light cycle (red)
   */
  render(player1, player2) {
    this.clear();

    // Draw player1 (blue) with sprite and config ribbon color
    this.drawTrail(
      player1.segments,
      GAME_CONFIG.COLORS.BLUE_RIBBON,
      this.sprites.blue,
      player1.direction
    );

    // Draw player2 (red) with sprite and config ribbon color
    // Only draw if player2 has segments (derezzed cycles have empty segments)
    if (player2.segments.length > 0) {
      this.drawTrail(
        player2.segments,
        GAME_CONFIG.COLORS.RED_RIBBON,
        player2.alive ? this.sprites.red : null, // Only show sprite if alive
        player2.direction
      );
    }

    // Draw player names
    this.drawPlayerNames(player1, player2);
  }

  /**
   * Draws player names that follow the light cycles.
   * @param {LightCycle} player1 - The first player's light cycle (blue)
   * @param {LightCycle} player2 - The second player's light cycle (red)
   */
  drawPlayerNames(player1, player2) {
    if (!window.gameState?.playerNames) return;

    this.ctx.save();
    this.ctx.font = `${GAME_CONFIG.RENDERING.LABEL_WEIGHT} ${GAME_CONFIG.RENDERING.LABEL_SIZE}px ${GAME_CONFIG.RENDERING.LABEL_FONT}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // Draw player 1 name
    if (player1.segments.length > 0) {
      const head1 = player1.segments[player1.segments.length - 1];
      const x1 = head1.column * this.cellSize + this.cellSize / 2;
      const y1 = head1.row * this.cellSize - 20; // Above the light cycle

      // Background for better readability
      this.ctx.fillStyle = GAME_CONFIG.COLORS.CANVAS_BG;
      const textWidth1 = this.ctx.measureText(
        window.gameState.playerNames.player1Name
      ).width;
      this.ctx.fillRect(x1 - textWidth1 / 2 - 4, y1 - 8, textWidth1 + 8, 16);

      // Player 1 name in blue
      this.ctx.fillStyle = GAME_CONFIG.COLORS.BLUE_RIBBON;
      this.ctx.fillText(window.gameState.playerNames.player1Name, x1, y1);
    }

    // Draw player 2 name
    if (player2.segments.length > 0 && player2.alive) {
      const head2 = player2.segments[player2.segments.length - 1];
      const x2 = head2.column * this.cellSize + this.cellSize / 2;
      const y2 = head2.row * this.cellSize - 20; // Above the light cycle

      // Background for better readability
      this.ctx.fillStyle = GAME_CONFIG.COLORS.CANVAS_BG;
      const textWidth2 = this.ctx.measureText(
        window.gameState.playerNames.player2Name
      ).width;
      this.ctx.fillRect(x2 - textWidth2 / 2 - 4, y2 - 8, textWidth2 + 8, 16);

      // Player 2 name in red
      this.ctx.fillStyle = GAME_CONFIG.COLORS.RED_RIBBON;
      this.ctx.fillText(window.gameState.playerNames.player2Name, x2, y2);
    }

    this.ctx.restore();
  }

  /**
   * Draws player names for all team members.
   * @param {LightCycle[]} playerTeam - Array of player light cycles
   * @param {LightCycle[]} enemyTeam - Array of enemy light cycles
   */
  drawTeamNames(playerTeam, enemyTeam) {
    if (!window.gameState?.playerNames) return;

    this.ctx.save();
    this.ctx.font = `${GAME_CONFIG.RENDERING.LABEL_WEIGHT} ${GAME_CONFIG.RENDERING.LABEL_SIZE}px ${GAME_CONFIG.RENDERING.LABEL_FONT}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // Draw player team names (all blue)
    playerTeam.forEach((player, index) => {
      if (player.segments.length > 0) {
        const head = player.segments[player.segments.length - 1];
        const x = head.column * this.cellSize + this.cellSize / 2;
        const y = head.row * this.cellSize - 20; // Above the light cycle

        const playerName =
          index === 0
            ? window.gameState.playerNames.player1Name
            : `Player ${index + 1}`;

        // Background for better readability
        this.ctx.fillStyle = GAME_CONFIG.COLORS.CANVAS_BG;
        const textWidth = this.ctx.measureText(playerName).width;
        this.ctx.fillRect(x - textWidth / 2 - 4, y - 8, textWidth + 8, 16);

        // Player name in blue
        this.ctx.fillStyle = GAME_CONFIG.COLORS.BLUE_RIBBON;
        this.ctx.fillText(playerName, x, y);
      }
    });

    // Draw enemy team names (red variations)
    enemyTeam.forEach((enemy, index) => {
      if (enemy.segments.length > 0 && enemy.alive) {
        const head = enemy.segments[enemy.segments.length - 1];
        const x = head.column * this.cellSize + this.cellSize / 2;
        const y = head.row * this.cellSize - 20; // Above the light cycle

        const enemyName =
          index === 0
            ? window.gameState.playerNames.player2Name
            : `Computer ${index + 1}`;

        // Background for better readability
        this.ctx.fillStyle = GAME_CONFIG.COLORS.CANVAS_BG;
        const textWidth = this.ctx.measureText(enemyName).width;
        this.ctx.fillRect(x - textWidth / 2 - 4, y - 8, textWidth + 8, 16);

        // Enemy name in appropriate red color
        this.ctx.fillStyle = this.getEnemyColor(index);
        this.ctx.fillText(enemyName, x, y);
      }
    });

    this.ctx.restore();
  }

  /**
   * Draws debug information including collision grid and performance stats.
   * @param {CollisionGrid} collisionGrid - The collision grid to visualize
   * @param {PerformanceMonitor} performanceMonitor - Performance monitor for stats
   */
  drawDebugInfo(collisionGrid, performanceMonitor) {
    if (
      !GAME_CONFIG.DEBUG.SHOW_COLLISION_GRID &&
      !GAME_CONFIG.DEBUG.SHOW_PERFORMANCE_STATS
    ) {
      return;
    }

    this.ctx.save();

    // Draw collision grid
    if (GAME_CONFIG.DEBUG.SHOW_COLLISION_GRID && collisionGrid) {
      this.ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      collisionGrid.occupied.forEach((coordinateKey) => {
        const [row, column] = coordinateKey.split(",").map(Number);
        const pixelX = column * this.cellSize;
        const pixelY = row * this.cellSize;
        this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
      });
    }

    // Draw performance stats
    if (GAME_CONFIG.DEBUG.SHOW_PERFORMANCE_STATS && performanceMonitor) {
      const stats = performanceMonitor.getStats();
      this.ctx.fillStyle = GAME_CONFIG.COLORS.CANVAS_BG;
      this.ctx.fillRect(10, 10, 200, 100);

      this.ctx.fillStyle = GAME_CONFIG.COLORS.INK_100;
      this.ctx.font = `12px ${GAME_CONFIG.RENDERING.LABEL_FONT}`;
      this.ctx.fillText(`FPS: ${stats.fps}`, 15, 25);
      this.ctx.fillText(`Frame: ${stats.frameTime.toFixed(2)}ms`, 15, 40);
      this.ctx.fillText(`Min: ${stats.minFrameTime.toFixed(2)}ms`, 15, 55);
      this.ctx.fillText(`Max: ${stats.maxFrameTime.toFixed(2)}ms`, 15, 70);
      this.ctx.fillText(`Avg: ${stats.avgFrameTime.toFixed(2)}ms`, 15, 85);
      this.ctx.fillText(
        `Grid: ${collisionGrid ? collisionGrid.size() : 0} cells`,
        15,
        100
      );
    }

    this.ctx.restore();
  }

  /**
   * Cleanup method for proper resource management.
   */
  cleanup() {
    // Clear any remaining contexts
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.backgroundCtx) {
      this.backgroundCtx.clearRect(
        0,
        0,
        this.backgroundCanvas.width,
        this.backgroundCanvas.height
      );
    }

    // Clear sprite references
    Object.values(this.sprites).forEach((sprite) => {
      sprite.onload = null;
      sprite.onerror = null;
      sprite.src = "";
    });
  }
}
