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
          { x: 0, y: 2 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 2, y: 1 },
          { x: 2, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: 1 },
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

  test("treats hazard squares as impassable in flood fill", () => {
    // A vertical column of hazards at x=2 splits the 5×5 board.
    // Starting at (0,0) can only reach the 10 squares in columns 0 and 1.
    const board = {
      width: 5,
      height: 5,
      snakes: [],
      hazards: [
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 2, y: 4 },
      ],
    };
    expect(floodFill(board, { x: 0, y: 0 })).toBe(10);
  });

  test("behaves identically when the hazards array is empty (non-Royale)", () => {
    const board = { width: 3, height: 3, snakes: [], hazards: [] };
    expect(floodFill(board, { x: 0, y: 0 })).toBe(9);
  });
});
