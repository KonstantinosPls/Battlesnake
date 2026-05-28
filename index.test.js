import { jest } from "@jest/globals";

import {
  applyBodyCollisions,
  applyHeadToHeadSafety,
  chooseFoodMove,
  getInitialMoveSafety,
  move,
} from "./index.js";

function makeGameState({
  width = 5,
  height = 5,
  turn = 1,
  youBody,
  youLength,
  snakes,
  food = [],
}) {
  const you = {
    id: "you",
    body: youBody,
    length: youLength ?? youBody.length,
  };

  return {
    turn,
    board: {
      width,
      height,
      food,
      snakes: snakes ?? [you],
    },
    you,
  };
}

describe("index move helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("blocks wall collisions at the board edge", () => {
    const gameState = makeGameState({
      youBody: [
        { x: 0, y: 2 },
        { x: 0, y: 1 },
      ],
    });

    const safety = getInitialMoveSafety(gameState);

    expect(safety.left).toBe(false);
    expect(safety.right).toBe(true);
    expect(safety.up).toBe(true);
    expect(safety.down).toBe(false);
  });

  test("blocks movement into snake bodies", () => {
    const gameState = makeGameState({
      youBody: [
        { x: 2, y: 2 },
        { x: 2, y: 1 },
      ],
      snakes: [
        {
          id: "you",
          body: [
            { x: 2, y: 2 },
            { x: 2, y: 1 },
          ],
          length: 2,
        },
        {
          id: "enemy",
          body: [{ x: 3, y: 2 }],
          length: 1,
        },
      ],
    });

    const safety = applyBodyCollisions(
      getInitialMoveSafety(gameState),
      gameState,
    );

    expect(safety.right).toBe(false);
    expect(safety.left).toBe(true);
    expect(safety.up).toBe(true);
    expect(safety.down).toBe(false);
  });

  test("blocks head-to-head collisions against equal-length opponents", () => {
    const gameState = makeGameState({
      youBody: [
        { x: 2, y: 2 },
        { x: 2, y: 1 },
      ],
      youLength: 3,
      snakes: [
        {
          id: "you",
          body: [
            { x: 2, y: 2 },
            { x: 2, y: 1 },
          ],
          length: 3,
        },
        {
          id: "enemy",
          body: [{ x: 3, y: 2 }],
          length: 3,
        },
      ],
    });

    const safety = applyHeadToHeadSafety(
      applyBodyCollisions(getInitialMoveSafety(gameState), gameState),
      gameState,
    );

    expect(safety.right).toBe(false);
    expect(safety.left).toBe(true);
    expect(safety.up).toBe(true);
    expect(safety.down).toBe(false);
  });

  test("chooses a food-seeking move toward the closest food", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const nextMove = chooseFoodMove(
      { x: 2, y: 2 },
      ["left", "up"],
      [
        { x: 0, y: 2 },
        { x: 4, y: 4 },
      ],
    );

    expect(nextMove).toBe("left");
  });

  test("move prefers food when a safe direction points to it", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const gameState = makeGameState({
      turn: 7,
      youBody: [
        { x: 2, y: 2 },
        { x: 2, y: 1 },
      ],
      food: [{ x: 4, y: 2 }],
    });

    expect(move(gameState)).toEqual({ move: "right" });
  });
});
