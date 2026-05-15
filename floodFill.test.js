import { floodFill } from "./floodFill.js";

function makeBoard(width, height, snakes = []) {
  return { width, height, snakes };
}

describe("floodFill", () => {
  test("returns all cells on empty board", () => {
    const board = makeBoard(3, 3);
    expect(floodFill(board, { x: 0, y: 0 })).toBe(9);
  });

  test("returns 1 when completely surrounded", () => {
    const board = makeBoard(3, 3, [
      {
        body: [
          { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
          { x: 2, y: 1 }, { x: 2, y: 0 },
          { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 },
        ],
      },
    ]);
    expect(floodFill(board, { x: 1, y: 1 })).toBe(1);
  });

  test("does not cross snake body", () => {
    const board = makeBoard(3, 3, [
      {
        body: [
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
        ],
      },
    ]);
    expect(floodFill(board, { x: 0, y: 0 })).toBe(3);
  });

  test("does not go out of bounds", () => {
    const board = makeBoard(5, 5);
    expect(floodFill(board, { x: 4, y: 4 })).toBe(25);
  });

  test("counts start cell as visited", () => {
    const board = makeBoard(1, 1);
    expect(floodFill(board, { x: 0, y: 0 })).toBe(1);
  });
});