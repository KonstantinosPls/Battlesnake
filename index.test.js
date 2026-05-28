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
          health: 99,
        },
        {
          id: "enemy",
          body: [
            { x: 3, y: 2 }, // head — also only segment, must stay blocked
          ],
          length: 1,
          health: 99,
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
          health: 99,
        },
        {
          id: "enemy",
          body: [{ x: 3, y: 2 }],
          length: 3,
          health: 99,
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

  // ── Tail-collision tests (issue #32) ────────────────────────────────────────

  test("allows moving into own tail square on a normal turn", () => {
    // Snake circling: head (2,2), neck (2,1), body (3,1), tail (3,2).
    // Tail is at (3,2) — adjacent to the right of the head.
    // With health < 100 the tail moves away, so right must remain safe.
    const gameState = makeGameState({
      youBody: [
        { x: 2, y: 2 }, // head
        { x: 2, y: 1 }, // neck
        { x: 3, y: 1 }, // body
        { x: 3, y: 2 }, // tail — moving right leads here
      ],
      snakes: [
        {
          id: "you",
          body: [
            { x: 2, y: 2 }, // head
            { x: 2, y: 1 }, // neck  (blocks down)
            { x: 3, y: 1 }, // body  (blocks nothing adjacent to head)
            { x: 3, y: 2 }, // tail  — moving right leads here
          ],
          length: 4,
          health: 50, // did NOT eat — tail moves away
        },
      ],
    });

    const safety = applyBodyCollisions(
      getInitialMoveSafety(gameState),
      gameState,
    );

    // Tail square (right) should be safe; neck square (down) should be blocked.
    expect(safety.right).toBe(true);
    expect(safety.down).toBe(false);
  });

  test("allows moving into an opponent tail square on a normal turn", () => {
    // Our head at (2,2). Opponent body: head (0,2), body (1,2), tail (2,3).
    // Tail is adjacent above our head — should be safe (health < 100).
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
          health: 50,
        },
        {
          id: "enemy",
          body: [
            { x: 0, y: 2 }, // enemy head
            { x: 1, y: 2 }, // enemy body (blocks left of our head)
            { x: 2, y: 3 }, // enemy tail — above our head, should be safe
          ],
          length: 3,
          health: 50,
        },
      ],
    });

    const safety = applyBodyCollisions(
      getInitialMoveSafety(gameState),
      gameState,
    );

    expect(safety.up).toBe(true); // opponent tail — safe
    expect(safety.left).toBe(false); // opponent body — blocked
  });

  test("tail square remains blocked when snake just ate food (health === 100)", () => {
    // Same layout as the own-tail test, but health is 100 — tail stays.
    // Moving right (into tail at (3,2)) must be blocked.
    const gameState = makeGameState({
      youBody: [
        { x: 2, y: 2 }, // head
        { x: 2, y: 1 }, // neck
        { x: 3, y: 1 }, // body
        { x: 3, y: 2 }, // tail — stays because snake just ate
      ],
      snakes: [
        {
          id: "you",
          body: [
            { x: 2, y: 2 }, // head
            { x: 2, y: 1 }, // neck
            { x: 3, y: 1 }, // body
            { x: 3, y: 2 }, // tail — stays because snake just ate
          ],
          length: 4,
          health: 100, // just ate food — tail does NOT move
        },
      ],
    });

    const safety = applyBodyCollisions(
      getInitialMoveSafety(gameState),
      gameState,
    );

    expect(safety.right).toBe(false); // tail stays — must be blocked
  });
});
