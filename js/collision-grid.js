/**
 * High-performance collision detection using spatial hashing.
 * Provides O(1) collision checks instead of O(n) array searches.
 */
export class CollisionGrid {
  constructor() {
    this.occupied = new Set();
  }

  /**
   * Adds a coordinate to the collision grid.
   * @param {Coordinate} coordinate - The coordinate to mark as occupied
   */
  add(coordinate) {
    this.occupied.add(`${coordinate.row},${coordinate.column}`);
  }

  /**
   * Checks if a coordinate is occupied.
   * @param {Coordinate} coordinate - The coordinate to check
   * @returns {boolean} True if occupied, false otherwise
   */
  has(coordinate) {
    return this.occupied.has(`${coordinate.row},${coordinate.column}`);
  }

  /**
   * Removes a coordinate from the collision grid.
   * @param {Coordinate} coordinate - The coordinate to remove
   */
  remove(coordinate) {
    this.occupied.delete(`${coordinate.row},${coordinate.column}`);
  }

  /**
   * Clears all occupied coordinates.
   */
  clear() {
    this.occupied.clear();
  }

  /**
   * Gets the total number of occupied cells.
   * @returns {number} Number of occupied cells
   */
  size() {
    return this.occupied.size;
  }
}
