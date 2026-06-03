import { astar } from "./astar.js";

describe("astar", () => {
  test("finds the shortest direct path and returns the first direction and distance", () => {
    const board = { width: 11, height: 11 };
    const result = astar(board, { x: 0, y: 0 }, { x: 3, y: 0 }, new Set());
    expect(result).toEqual({ direction: "right", dist: 3 });
  });

  test("navigates around an obstacle that blocks the direct path", () => {
    // Head (0,0), food (2,0), square (1,0) blocked.
    // Detour: up → right → right → down = 4 steps, first move "up".
    const board = { width: 11, height: 11 };
    const blocked = new Set(["1,0"]);
    const result = astar(board, { x: 0, y: 0 }, { x: 2, y: 0 }, blocked);
    expect(result).toBeDefined();
    expect(result.direction).toBe("up");
    expect(result.dist).toBe(4);
  });

  test("returns undefined when the goal is completely unreachable", () => {
    // 3×3 board. Both neighbours of (0,0) are blocked — no path to (2,2).
    const board = { width: 3, height: 3 };
    const blocked = new Set(["1,0", "0,1"]);
    const result = astar(board, { x: 0, y: 0 }, { x: 2, y: 2 }, blocked);
    expect(result).toBeUndefined();
  });

  test("finds the correct path length across a larger open board", () => {
    const board = { width: 19, height: 19 };
    const result = astar(board, { x: 9, y: 9 }, { x: 9, y: 14 }, new Set());
    expect(result).toEqual({ direction: "up", dist: 5 });
  });
});
