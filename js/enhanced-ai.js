/**
 * Enhanced AI System for Light Cycles Game
 * Adapted from the Google AI Challenge 2010 winning TRON bot
 *
 * Key Features:
 * - Voronoi diagram territory evaluation
 * - Articulation point detection
 * - Minimax search with alpha-beta pruning
 * - Space-filling heuristics for endgame
 * - Connected components analysis
 */

class EnhancedTronAI {
  constructor(board, playerId) {
    this.board = board;
    this.playerId = playerId;
    this.width = board.width;
    this.height = board.height;

    // Algorithm parameters (empirically determined from original bot)
    this.K1 = 55;  // Node weight coefficient
    this.K2 = 194; // Edge weight coefficient
    this.MAX_DEPTH = 8;
    this.TIMEOUT_MS = 950; // Leave buffer for execution

    // Direction mappings (N, E, S, W)
    this.directions = [
      { x: 0, y: -1, name: 'N' },
      { x: 1, y: 0, name: 'E' },
      { x: 0, y: 1, name: 'S' },
      { x: -1, y: 0, name: 'W' }
    ];

    // Timing and search statistics
    this.startTime = 0;
    this.evaluations = 0;
    this.timedOut = false;
  }

  /**
   * Main entry point - determines the best move for the AI
   */
  getBestMove(playerPositions) {
    this.startTime = Date.now();
    this.evaluations = 0;
    this.timedOut = false;

    const myPos = playerPositions[this.playerId];
    const opponents = playerPositions.filter((_, i) => i !== this.playerId && _);

    if (!myPos || opponents.length === 0) {
      return this.getRandomValidMove(myPos);
    }

    // Check if we're in the same connected component as opponents
    const components = this.calculateConnectedComponents();
    const myComponent = components[myPos.y * this.width + myPos.x];
    const sameComponent = opponents.some(opp =>
      opp && components[opp.y * this.width + opp.x] === myComponent
    );

    if (sameComponent) {
      // Early/mid-game: use minimax with territory evaluation
      return this.minimaxSearch(playerPositions);
    } else {
      // Endgame: use space-filling heuristics
      return this.spaceFillingMove(myPos);
    }
  }

  /**
   * Minimax search with alpha-beta pruning for strategic play
   */
  minimaxSearch(playerPositions) {
    let bestMove = null;
    let bestValue = -Infinity;
    const validMoves = this.getValidMoves(playerPositions[this.playerId]);

    if (validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0];

    // Iterative deepening
    for (let depth = 1; depth <= this.MAX_DEPTH && !this.timedOut; depth++) {
      let depthBestMove = null;
      let depthBestValue = -Infinity;

      for (const move of validMoves) {
        if (this.timedOut) break;

        const newPositions = this.simulateMove(playerPositions, this.playerId, move);
        const value = this.minimax(newPositions, depth - 1, -Infinity, Infinity, false);

        if (value > depthBestValue) {
          depthBestValue = value;
          depthBestMove = move;
        }
      }

      if (!this.timedOut && depthBestMove) {
        bestMove = depthBestMove;
        bestValue = depthBestValue;
      }
    }

    return bestMove || validMoves[0];
  }

  /**
   * Recursive minimax with alpha-beta pruning
   */
  minimax(playerPositions, depth, alpha, beta, isMaximizing) {
    if (Date.now() - this.startTime > this.TIMEOUT_MS) {
      this.timedOut = true;
      return 0;
    }

    this.evaluations++;

    // Check for terminal states
    const myPos = playerPositions[this.playerId];
    if (!myPos) return isMaximizing ? -10000 : 10000;

    if (depth === 0) {
      return this.evaluatePosition(playerPositions);
    }

    const currentPlayer = isMaximizing ? this.playerId : this.getOpponentId(playerPositions);
    const validMoves = this.getValidMoves(playerPositions[currentPlayer]);

    if (validMoves.length === 0) {
      return isMaximizing ? -10000 : 10000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of validMoves) {
        if (this.timedOut) break;
        const newPositions = this.simulateMove(playerPositions, currentPlayer, move);
        const evaluation = this.minimax(newPositions, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of validMoves) {
        if (this.timedOut) break;
        const newPositions = this.simulateMove(playerPositions, currentPlayer, move);
        const evaluation = this.minimax(newPositions, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  }

  /**
   * Evaluate board position using Voronoi diagram and territory analysis
   */
  evaluatePosition(playerPositions) {
    const myPos = playerPositions[this.playerId];
    const opponents = playerPositions.filter((_, i) => i !== this.playerId && _);

    if (!myPos) return -10000;
    if (opponents.length === 0) return 10000;

    // Calculate Voronoi diagram
    const voronoi = this.calculateVoronoiDiagram(playerPositions);

    // Count territory for each player
    let myTerritory = 0;
    let opponentTerritory = 0;
    let myEdges = 0;
    let opponentEdges = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (this.board.isValidPosition(x, y) && !this.board.grid[y][x]) {
          const owner = voronoi[idx];
          const edges = this.countEdges(x, y);

          if (owner === this.playerId) {
            myTerritory++;
            myEdges += edges;
          } else if (owner !== -1) {
            opponentTerritory++;
            opponentEdges += edges;
          }
        }
      }
    }

    // Apply the empirically determined weights from the winning bot
    const myValue = this.K1 * myTerritory + this.K2 * myEdges;
    const opponentValue = this.K1 * opponentTerritory + this.K2 * opponentEdges;

    return myValue - opponentValue;
  }

  /**
   * Calculate Voronoi diagram using multi-source Dijkstra
   */
  calculateVoronoiDiagram(playerPositions) {
    const distances = new Array(this.width * this.height).fill(Infinity);
    const owners = new Array(this.width * this.height).fill(-1);
    const queue = [];

    // Initialize with player positions
    playerPositions.forEach((pos, playerId) => {
      if (pos) {
        const idx = pos.y * this.width + pos.x;
        distances[idx] = 0;
        owners[idx] = playerId;
        queue.push({ x: pos.x, y: pos.y, dist: 0, owner: playerId });
      }
    });

    // Sort queue by distance (simple priority queue)
    queue.sort((a, b) => a.dist - b.dist);

    while (queue.length > 0) {
      const current = queue.shift();
      const currentIdx = current.y * this.width + current.x;

      if (current.dist > distances[currentIdx]) continue;

      for (const dir of this.directions) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const nIdx = ny * this.width + nx;

        if (this.board.isValidPosition(nx, ny) && !this.board.grid[ny][nx]) {
          const newDist = current.dist + 1;

          if (newDist < distances[nIdx]) {
            distances[nIdx] = newDist;
            owners[nIdx] = current.owner;

            // Insert in sorted order (simple insertion sort for small queues)
            const newNode = { x: nx, y: ny, dist: newDist, owner: current.owner };
            let inserted = false;
            for (let i = 0; i < queue.length; i++) {
              if (queue[i].dist > newDist) {
                queue.splice(i, 0, newNode);
                inserted = true;
                break;
              }
            }
            if (!inserted) queue.push(newNode);
          }
        }
      }
    }

    return owners;
  }

  /**
   * Space-filling move for endgame scenarios
   */
  spaceFillingMove(myPos) {
    const validMoves = this.getValidMoves(myPos);
    if (validMoves.length === 0) return null;

    let bestMove = validMoves[0];
    let bestScore = -1;

    for (const move of validMoves) {
      const newPos = {
        x: myPos.x + this.directions[move].x,
        y: myPos.y + this.directions[move].y
      };

      // Prefer moves that:
      // 1. Don't create articulation points
      // 2. Have more available neighbors
      // 3. Lead to larger connected areas

      const neighbors = this.countValidNeighbors(newPos.x, newPos.y);
      const isArticulation = this.wouldCreateArticulation(newPos.x, newPos.y);
      const areaSize = this.estimateReachableArea(newPos);

      let score = neighbors * 10 + areaSize;
      if (isArticulation) score -= 50; // Heavily penalize articulation points

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Calculate connected components using flood fill
   */
  calculateConnectedComponents() {
    const components = new Array(this.width * this.height).fill(-1);
    let componentId = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        if (components[idx] === -1 && this.board.isValidPosition(x, y) && !this.board.grid[y][x]) {
          this.floodFill(x, y, componentId, components);
          componentId++;
        }
      }
    }

    return components;
  }

  /**
   * Flood fill helper for connected components
   */
  floodFill(x, y, componentId, components) {
    const stack = [{ x, y }];

    while (stack.length > 0) {
      const { x: cx, y: cy } = stack.pop();
      const idx = cy * this.width + cx;

      if (components[idx] !== -1 || !this.board.isValidPosition(cx, cy) || this.board.grid[cy][cx]) {
        continue;
      }

      components[idx] = componentId;

      for (const dir of this.directions) {
        stack.push({ x: cx + dir.x, y: cy + dir.y });
      }
    }
  }

  /**
   * Count valid neighbors for a position
   */
  countValidNeighbors(x, y) {
    let count = 0;
    for (const dir of this.directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (this.board.isValidPosition(nx, ny) && !this.board.grid[ny][nx]) {
        count++;
      }
    }
    return count;
  }

  /**
   * Count edges (for territory evaluation)
   */
  countEdges(x, y) {
    return this.countValidNeighbors(x, y);
  }

  /**
   * Check if moving to a position would create an articulation point
   */
  wouldCreateArticulation(x, y) {
    // Simple heuristic: check if the move would separate the board
    const neighbors = [];
    for (const dir of this.directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (this.board.isValidPosition(nx, ny) && !this.board.grid[ny][nx]) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    if (neighbors.length <= 2) return false;

    // Check if removing this position would disconnect the neighbors
    // This is a simplified check - the full algorithm is more complex
    return neighbors.length >= 3;
  }

  /**
   * Estimate reachable area from a position using BFS
   */
  estimateReachableArea(pos) {
    const visited = new Set();
    const queue = [pos];
    let area = 0;
    const maxSearch = 50; // Limit search to avoid timeout

    while (queue.length > 0 && area < maxSearch) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      if (visited.has(key)) continue;
      visited.add(key);
      area++;

      for (const dir of this.directions) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const nKey = `${nx},${ny}`;

        if (!visited.has(nKey) && this.board.isValidPosition(nx, ny) && !this.board.grid[ny][nx]) {
          queue.push({ x: nx, y: ny });
        }
      }
    }

    return area;
  }

  /**
   * Get valid moves for a position
   */
  getValidMoves(pos) {
    if (!pos) return [];

    const validMoves = [];
    for (let i = 0; i < this.directions.length; i++) {
      const dir = this.directions[i];
      const newX = pos.x + dir.x;
      const newY = pos.y + dir.y;

      if (this.board.isValidPosition(newX, newY) && !this.board.grid[newY][newX]) {
        validMoves.push(i);
      }
    }

    return validMoves;
  }

  /**
   * Simulate a move without modifying the actual board
   */
  simulateMove(playerPositions, playerId, moveIndex) {
    const newPositions = [...playerPositions];
    const pos = newPositions[playerId];

    if (pos) {
      const dir = this.directions[moveIndex];
      newPositions[playerId] = {
        x: pos.x + dir.x,
        y: pos.y + dir.y
      };

      // Mark the old position as occupied in a temporary board state
      // Note: This is simplified - in a full implementation, you'd need
      // to track the board state through the search tree
    }

    return newPositions;
  }

  /**
   * Get opponent player ID
   */
  getOpponentId(playerPositions) {
    for (let i = 0; i < playerPositions.length; i++) {
      if (i !== this.playerId && playerPositions[i]) {
        return i;
      }
    }
    return 0; // Fallback
  }

  /**
   * Fallback random move selection
   */
  getRandomValidMove(pos) {
    const validMoves = this.getValidMoves(pos);
    if (validMoves.length === 0) return null;
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  /**
   * Convert move index to direction name
   */
  moveToDirection(moveIndex) {
    return this.directions[moveIndex]?.name || 'N';
  }
}

// Export for ES6 modules
export { EnhancedTronAI };
