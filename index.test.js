import { jest } from "@jest/globals";

import {
  applyBodyCollisions,
  applyHeadToHeadSafety,
  chooseHuntMove,
  chooseFoodMove,
  getBoardSize,
  getInitialMoveSafety,
  move,
  simulateMove,
} from "./index.js";

function makeGameState({
  width = 5,
  height = 5,
  turn = 1,
  youBody,
  youLength,
  youHealth = 99,
  snakes,
  food = [],
}) {
  const you = {
    id: "you",
    body: youBody,
    length: youLength ?? youBody.length,
    health: youHealth,
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
    // Open 5×5 board, no bodies. Food at (0,2) dist=2 and (4,4) — path to (4,4)
    // starts with "right" which is not in safeMoves, so A* skips it. Returns "left".
    const board = { width: 5, height: 5, snakes: [] };

    const nextMove = chooseFoodMove(
      { x: 2, y: 2 },
      ["left", "up"],
      [
        { x: 0, y: 2 },
        { x: 4, y: 4 },
      ],
      board,
    );

    expect(nextMove).toBe("left");
  });

  test("does not route through hazard squares when seeking food", () => {
    // Head (0,2), food (4,2). A full column of hazards at x=2 walls off the food.
    // A* must treat hazards as impassable — if it routes through them it incorrectly
    // finds the food; with hazards blocked the food is unreachable, so undefined.
    const board = {
      width: 5,
      height: 5,
      snakes: [
        {
          id: "you",
          body: [
            { x: 0, y: 2 },
            { x: 0, y: 1 },
          ],
          health: 99,
        },
      ],
      hazards: [
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 2, y: 4 },
      ],
    };

    const result = chooseFoodMove(
      { x: 0, y: 2 },
      ["up", "right"],
      [{ x: 4, y: 2 }],
      board,
    );

    expect(result).toBeUndefined();
  });

  test("finds a detour when the direct route is blocked by a snake body", () => {
    // Head (2,2), food (0,2). Blocker body at (1,2) means "left" is excluded from
    // safeMoves by applyBodyCollisions. A* detours up → left → left → down = 4 steps,
    // firstDir "up", which IS in safeMoves.
    const board = {
      width: 5,
      height: 5,
      snakes: [
        {
          id: "you",
          body: [
            { x: 2, y: 2 },
            { x: 2, y: 1 },
          ],
          health: 99,
        },
        { id: "blocker", body: [{ x: 1, y: 2 }], health: 99 },
      ],
    };

    const result = chooseFoodMove(
      { x: 2, y: 2 },
      ["up", "right"],
      [{ x: 0, y: 2 }],
      board,
    );

    expect(result).toBe("up");
  });

  test("returns undefined when all paths to food are blocked", () => {
    // Food at (2,2) on 5×5 board. A 6-segment snake wraps all four adjacent
    // squares. The tail (body[5]) is at (4,1) — not adjacent to food — so all
    // four neighbours of (2,2) remain in the blocked set and A* returns null.
    const board = {
      width: 5,
      height: 5,
      snakes: [
        {
          id: "wall",
          body: [
            { x: 2, y: 3 }, // blocks above food
            { x: 2, y: 1 }, // blocks below food
            { x: 1, y: 2 }, // blocks left of food
            { x: 3, y: 2 }, // blocks right of food
            { x: 4, y: 2 }, // filler
            { x: 4, y: 1 }, // tail — excluded from blocked, but not adjacent to food
          ],
          health: 99,
        },
      ],
    };

    const result = chooseFoodMove(
      { x: 0, y: 0 },
      ["up", "right"],
      [{ x: 2, y: 2 }],
      board,
    );

    expect(result).toBeUndefined();
  });

  test("picks the food reachable by the shorter actual path, not the shorter Manhattan distance", () => {
    // Head (2,2), safeMoves ["up","right"].
    // Food A at (2,4): Manhattan dist=2 but (2,3) blocked → A* detour, actual dist>2.
    // Food B at (5,2): Manhattan dist=3, clear path right×3, actual dist=3.
    // A* should pick Food B ("right"), even though Food A is closer by Manhattan.
    const board = {
      width: 11,
      height: 11,
      snakes: [
        {
          id: "you",
          body: [
            { x: 2, y: 2 },
            { x: 2, y: 1 },
          ],
          health: 99,
        },
        { id: "blocker", body: [{ x: 2, y: 3 }], health: 99 },
      ],
    };

    const result = chooseFoodMove(
      { x: 2, y: 2 },
      ["up", "right"],
      [
        { x: 2, y: 4 },
        { x: 5, y: 2 },
      ],
      board,
    );

    expect(result).toBe("right");
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

describe("simulateMove", () => {
  test("advances head and removes tail on a normal turn", () => {
    const gameState = makeGameState({
      width: 11,
      height: 11,
      youBody: [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
        { x: 5, y: 3 },
      ],
    });

    const result = simulateMove(gameState, "up");

    expect(result.you.body[0]).toEqual({ x: 5, y: 6 });
    expect(result.you.body).toHaveLength(3);
    expect(result.you.body).not.toContainEqual({ x: 5, y: 3 });
  });

  test("keeps tail and resets health when food is eaten", () => {
    const gameState = makeGameState({
      width: 11,
      height: 11,
      youBody: [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ],
      food: [{ x: 5, y: 6 }],
    });

    const result = simulateMove(gameState, "up");

    expect(result.you.body).toHaveLength(3);
    expect(result.you.body).toContainEqual({ x: 5, y: 4 });
    expect(result.you.health).toBe(100);
  });

  test("removes eaten food from the board", () => {
    const gameState = makeGameState({
      width: 11,
      height: 11,
      youBody: [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ],
      food: [
        { x: 5, y: 6 },
        { x: 1, y: 1 },
      ],
    });

    const result = simulateMove(gameState, "up");

    expect(result.board.food).not.toContainEqual({ x: 5, y: 6 });
    expect(result.board.food).toContainEqual({ x: 1, y: 1 });
  });

  test("does not modify opponent snakes", () => {
    const you = {
      id: "you",
      body: [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
      ],
      health: 99,
      length: 2,
    };
    const opponent = {
      id: "opp",
      body: [
        { x: 3, y: 3 },
        { x: 3, y: 2 },
      ],
      health: 99,
      length: 2,
    };
    const gameState = {
      turn: 1,
      board: { width: 11, height: 11, food: [], snakes: [you, opponent] },
      you,
    };

    const result = simulateMove(gameState, "up");

    const resultOpp = result.board.snakes.find((s) => s.id === "opp");
    expect(resultOpp.body).toEqual(opponent.body);
  });
});

describe("getBoardSize", () => {
  test("returns 'small' for a 7x7 board", () => {
    expect(getBoardSize({ width: 7, height: 7 })).toBe("small");
  });

  test("returns 'medium' for an 11x11 board", () => {
    expect(getBoardSize({ width: 11, height: 11 })).toBe("medium");
  });

  test("returns 'large' for a 19x19 board", () => {
    expect(getBoardSize({ width: 19, height: 19 })).toBe("large");
  });

  test("returns 'small' for mixed dimensions where one side is <=7", () => {
    expect(getBoardSize({ width: 7, height: 15 })).toBe("small");
    expect(getBoardSize({ width: 19, height: 7 })).toBe("small");
  });
});

describe("move size-aware behaviour", () => {
  test("skips risky food move on small board even when health is low", () => {
    const you = {
      id: "you",
      body: [
        { x: 3, y: 3 },
        { x: 3, y: 2 },
      ],
      length: 3,
      health: 20,
    };
    const enemy = {
      id: "enemy",
      body: [
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
      ],
      length: 3,
      health: 99,
    };
    const gameState = {
      turn: 1,
      board: {
        width: 7,
        height: 7,
        food: [{ x: 4, y: 3 }],
        snakes: [you, enemy],
      },
      you,
    };

    // Food is to the right but right is head-to-head danger with equal-length enemy.
    // On a small board the risky block is skipped, so the snake stays safe with "left".
    expect(move(gameState)).toEqual({ move: "left" });
  });

  test("chases food via risky move on large board when health is 40", () => {
    const you = {
      id: "you",
      body: [
        { x: 9, y: 9 },
        { x: 9, y: 8 },
      ],
      length: 3,
      health: 40,
    };
    const enemy = {
      id: "enemy",
      body: [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 },
      ],
      length: 3,
      health: 99,
    };
    const gameState = {
      turn: 1,
      board: {
        width: 19,
        height: 19,
        food: [{ x: 10, y: 9 }],
        snakes: [you, enemy],
      },
      you,
    };

    // Food is right but right is head-to-head danger. On a large board,
    // starvationThreshold=50 so health=40 triggers the risky block → chases food.
    expect(move(gameState)).toEqual({ move: "right" });
  });
});

describe("Royale hazard avoidance", () => {
  test("avoids a hazard move when a safe non-hazard alternative exists", () => {
    // Head (1,1), neck (1,0). Safe moves: up (1,2), left (0,1), right (2,1).
    // Hazards cover (1,2) and (2,1), leaving only left as a non-hazard safe move.
    const you = {
      id: "you",
      body: [
        { x: 1, y: 1 },
        { x: 1, y: 0 },
      ],
      health: 99,
      length: 2,
    };
    const gameState = {
      turn: 1,
      board: {
        width: 3,
        height: 3,
        food: [],
        snakes: [you],
        hazards: [
          { x: 1, y: 2 },
          { x: 2, y: 1 },
        ],
      },
      you,
    };
    expect(move(gameState)).toEqual({ move: "left" });
  });

  test("falls back to any safe move when all safe moves lead into hazards", () => {
    // Head (1,1), neck (1,0). All three safe moves (up, left, right) are hazards.
    // Snake must still return one of them rather than crashing.
    const you = {
      id: "you",
      body: [
        { x: 1, y: 1 },
        { x: 1, y: 0 },
      ],
      health: 99,
      length: 2,
    };
    const gameState = {
      turn: 1,
      board: {
        width: 3,
        height: 3,
        food: [],
        snakes: [you],
        hazards: [
          { x: 1, y: 2 },
          { x: 0, y: 1 },
          { x: 2, y: 1 },
        ],
      },
      you,
    };
    const result = move(gameState);
    expect(["up", "left", "right"]).toContain(result.move);
  });
});

describe("chooseHuntMove", () => {
  test("returns the move that closes in on the nearest smaller snake", () => {
    // Our head at (5,5), length 4. Smaller enemy head at (7,5), length 2.
    // Moving right brings us to (6,5) — distance 1. Moving up brings us to
    // (5,6) — distance sqrt(4+1)≈2.2 (Manhattan: |7-5|+|5-6|=3). Right wins.
    const result = chooseHuntMove(
      { x: 5, y: 5 },
      4,
      ["up", "right"],
      [{ id: "prey", body: [{ x: 7, y: 5 }], length: 2 }],
    );

    expect(result).toBe("right");
  });

  test("returns undefined when no opponent is strictly shorter", () => {
    // Our length is 3; opponent length is also 3 — not shorter, so no hunt.
    const result = chooseHuntMove(
      { x: 5, y: 5 },
      3,
      ["up", "right"],
      [{ id: "equal", body: [{ x: 6, y: 5 }], length: 3 }],
    );

    expect(result).toBeUndefined();
  });

  test("returns undefined when no safe move closes the gap", () => {
    // Our head at (5,5), smaller enemy at (3,5) — to the left.
    // Only safe move is "right" (moving away). Gap doesn't close → undefined.
    const result = chooseHuntMove(
      { x: 5, y: 5 },
      4,
      ["right"],
      [{ id: "prey", body: [{ x: 3, y: 5 }], length: 2 }],
    );

    expect(result).toBeUndefined();
  });
});
