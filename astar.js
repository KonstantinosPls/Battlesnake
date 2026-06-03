/**
 * Finds the shortest path from start to goal on the board using A* with a
 * Manhattan distance heuristic. Returns the first direction to take and the
 * total path length in steps, or undefined when the goal is unreachable.
 *
 * Squares in the blocked set and out-of-bounds positions are treated as walls.
 * The caller is responsible for building the blocked set from the game state.
 *
 * @param {{width: number, height: number}} board - Board dimensions.
 * @param {{x: number, y: number}} start - Starting square (the snake's head).
 * @param {{x: number, y: number}} goal - Target square (a food position).
 * @param {Set<string>} blocked - Impassable squares encoded as "x,y" strings.
 * @returns {{direction: string, dist: number}|undefined} First direction and path length, or undefined if unreachable.
 */
export function astar(board, start, goal, blocked) {
  const h = (x, y) => Math.abs(x - goal.x) + Math.abs(y - goal.y);

  // Each entry: [f, g, x, y, firstDirection]
  const open = [[h(start.x, start.y), 0, start.x, start.y, undefined]];
  const visited = new Set();

  const directions = [
    ["up", 0, 1],
    ["down", 0, -1],
    ["left", -1, 0],
    ["right", 1, 0],
  ];

  while (open.length > 0) {
    open.sort((a, b) => a[0] - b[0]);
    const [, g, x, y, firstDirection] = open.shift();

    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (x === goal.x && y === goal.y) {
      return { direction: firstDirection, dist: g };
    }

    for (const [direction, dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      const nKey = `${nx},${ny}`;

      if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) continue;
      if (blocked.has(nKey)) continue;
      if (visited.has(nKey)) continue;

      open.push([
        g + 1 + h(nx, ny),
        g + 1,
        nx,
        ny,
        firstDirection ?? direction,
      ]);
    }
  }
}
