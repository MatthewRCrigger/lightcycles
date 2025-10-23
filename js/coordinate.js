/**
 * Represents a coordinate position on the game grid.
 * Uses row (i) and column (j) indexing where (0,0) is top-left.
 */
export class Coordinate {
  /**
   * Creates a new coordinate.
   * @param {number} row - The row index (vertical position)
   * @param {number} column - The column index (horizontal position)
   */
  constructor(row, column) {
    this.row = row;
    this.column = column;
  }

  /**
   * Checks if this coordinate equals another coordinate.
   * @param {Coordinate} otherCoordinate - The coordinate to compare with
   * @returns {boolean} True if coordinates are equal, false otherwise
   */
  equals(otherCoordinate) {
    if (!otherCoordinate) return false;
    return (
      this.row === otherCoordinate.row &&
      this.column === otherCoordinate.column
    );
  }

  /**
   * Adds this coordinate to another coordinate.
   * @param {Coordinate} otherCoordinate - The coordinate to add
   * @returns {Coordinate} A new coordinate representing the sum
   */
  plus(otherCoordinate) {
    if (!otherCoordinate) {
      throw new Error("Cannot add undefined coordinate");
    }
    return new Coordinate(
      this.row + otherCoordinate.row,
      this.column + otherCoordinate.column
    );
  }

  /**
   * Checks if this coordinate is opposite to another coordinate.
   * Opposite means the coordinates are negatives of each other.
   * @param {Coordinate} otherCoordinate - The coordinate to compare with
   * @returns {boolean} True if coordinates are opposite, false otherwise
   */
  isOpposite(otherCoordinate) {
    if (!otherCoordinate) return false;
    return (
      this.row === -1 * otherCoordinate.row &&
      this.column === -1 * otherCoordinate.column
    );
  }
}
