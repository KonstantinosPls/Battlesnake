/**
 * Counts how many board squares are reachable from a starting position using a
 * breadth-first flood fill. Squares occupied by any snake body are treated as
 * walls, as are positions outside the board boundaries.
 *
 * Used by the move logic to prefer directions that lead into larger open areas,
 * helping the snake avoid trapping itself in a dead end.
 *
 * @param {{width: number, height: number, snakes: Array<{body: Array<{x: number, y: number}>}>}} board - The game board with dimensions and all snakes.
 * @param {{x: number, y: number}} start - The square to begin the flood fill from.
 * @returns {number} The count of reachable open squares, including the start square.
 */
export function floodFill(board, start) {
  const { width, height, snakes } = board;

  const blocked = new Set();
  for (const snake of snakes) {
    for (const segment of snake.body) {
      blocked.add(`${segment.x},${segment.y}`);
    }
  }

  const visited = new Set();
  const queue = [start];
  visited.add(`${start.x},${start.y}`);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (
        n.x >= 0 &&
        n.x < width &&
        n.y >= 0 &&
        n.y < height &&
        !visited.has(key) &&
        !blocked.has(key)
      ) {
        visited.add(key);
        queue.push(n);
      }
    }
  }

  return visited.size;
}
