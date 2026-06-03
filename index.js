// Welcome to
// __________         __    __  .__                               __
// \______   \_____ _/  |__/  |_|  |   ____   ______ ____ _____  |  | __ ____
//  |    |  _/\__  \\   __\   __\  | _/ __ \ /  ___//    \\__  \ |  |/ // __ \
//  |    |   \ / __ \|  |  |  | |  |\_  ___/ \___ \|   |  \/ __ \|    <\  ___/
//  |________/(______/__|  |__| |____/\_____>______>___|__(______/__|__\\_____>
//
// This file can be a nice home for your Battlesnake logic and helper functions.

import { fileURLToPath } from "node:url";

import runServer from "./server.js";
import { floodFill } from "./floodFill.js";
import { astar } from "./astar.js";

const moveDeltas = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Returns the Battlesnake's metadata and appearance, used by the GET / endpoint.
 *
 * @returns {{apiversion: string, author: string, color: string, head: string, tail: string}} The snake's API version and customisation.
 */
function info() {
  console.log("INFO");

  return {
    apiversion: "1",
    author: "yiotak",
    color: "#000080",
    head: "fang",
    tail: "bolt",
  };
}

/**
 * Called by the POST /start endpoint when a new game begins.
 *
 * @param {object} gameState - The initial game state sent by the Battlesnake engine.
 * @returns {void}
 */
function start(gameState) {
  console.log("GAME START");
}

/**
 * Called by the POST /end endpoint when a game finishes.
 *
 * @param {object} gameState - The final game state sent by the Battlesnake engine.
 * @returns {void}
 */
function end(gameState) {
  console.log("GAME OVER\n");
}

/**
 * Builds the initial move-safety map, marking directions unsafe if they move
 * backwards into the neck or off the board edges.
 *
 * @param {object} gameState - The current game state from the Battlesnake engine.
 * @returns {{up: boolean, down: boolean, left: boolean, right: boolean}} A map of which directions are currently considered safe.
 */
export function getInitialMoveSafety(gameState) {
  const isMoveSafe = {
    up: true,
    down: true,
    left: true,
    right: true,
  };

  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;
  const myHead = gameState.you.body[0];
  const myNeck = gameState.you.body[1];

  if (myNeck.x < myHead.x) {
    isMoveSafe.left = false;
  } else if (myNeck.x > myHead.x) {
    isMoveSafe.right = false;
  } else if (myNeck.y < myHead.y) {
    isMoveSafe.down = false;
  } else if (myNeck.y > myHead.y) {
    isMoveSafe.up = false;
  }

  if (myHead.x === 0) {
    isMoveSafe.left = false;
  }
  if (myHead.x === boardWidth - 1) {
    isMoveSafe.right = false;
  }
  if (myHead.y === 0) {
    isMoveSafe.down = false;
  }
  if (myHead.y === boardHeight - 1) {
    isMoveSafe.up = false;
  }

  return isMoveSafe;
}

/**
 * Marks directions unsafe if they would collide with any snake's body (own or
 * opponent). The tail segment is excluded since it moves away each turn, unless
 * the snake just ate food (health === 100), in which case the tail stays put.
 *
 * @param {{up: boolean, down: boolean, left: boolean, right: boolean}} isMoveSafe - The current move-safety map to update.
 * @param {object} gameState - The current game state from the Battlesnake engine.
 * @returns {{up: boolean, down: boolean, left: boolean, right: boolean}} The updated move-safety map.
 */
export function applyBodyCollisions(isMoveSafe, gameState) {
  const myHead = gameState.you.body[0];

  for (const snake of gameState.board.snakes) {
    const bodyStartIndex = snake.id === gameState.you.id ? 1 : 0;
    // The tail moves away each turn, so skip it — unless the snake just ate
    // food (health === 100), in which case the tail stays and remains unsafe.
    // A single-segment snake has no separate tail to free.
    const tailIndex =
      snake.health !== 100 && snake.body.length > 1
        ? snake.body.length - 1
        : snake.body.length;
    for (let i = bodyStartIndex; i < tailIndex; i++) {
      const segment = snake.body[i];
      if (segment.x === myHead.x - 1 && segment.y === myHead.y) {
        isMoveSafe.left = false;
      }
      if (segment.x === myHead.x + 1 && segment.y === myHead.y) {
        isMoveSafe.right = false;
      }
      if (segment.x === myHead.x && segment.y === myHead.y - 1) {
        isMoveSafe.down = false;
      }
      if (segment.x === myHead.x && segment.y === myHead.y + 1) {
        isMoveSafe.up = false;
      }
    }
  }

  return isMoveSafe;
}

/**
 * Marks directions unsafe to avoid losing head-to-head collisions. A move is
 * blocked if an opponent of equal or greater length could move into the same
 * square next turn (Manhattan distance of 1 from the opponent's head).
 *
 * @param {{up: boolean, down: boolean, left: boolean, right: boolean}} isMoveSafe - The current move-safety map to update.
 * @param {object} gameState - The current game state from the Battlesnake engine.
 * @returns {{up: boolean, down: boolean, left: boolean, right: boolean}} The updated move-safety map.
 */
export function applyHeadToHeadSafety(isMoveSafe, gameState) {
  const myHead = gameState.you.body[0];
  const myLength = gameState.you.length;

  for (const snake of gameState.board.snakes) {
    if (snake.id === gameState.you.id) continue;
    if (snake.length < myLength) continue;

    const opponentHead = snake.body[0];
    for (const direction of Object.keys(isMoveSafe)) {
      if (!isMoveSafe[direction]) continue;

      const myNextHead = {
        x: myHead.x + moveDeltas[direction].x,
        y: myHead.y + moveDeltas[direction].y,
      };
      const manhattanDistance =
        Math.abs(opponentHead.x - myNextHead.x) +
        Math.abs(opponentHead.y - myNextHead.y);
      if (manhattanDistance === 1) {
        isMoveSafe[direction] = false;
      }
    }
  }

  return isMoveSafe;
}

/**
 * Picks a safe move toward the reachable food with the shortest actual path,
 * using A* pathfinding with a Manhattan distance heuristic. Unlike a greedy
 * Manhattan approach, this correctly routes around snake bodies to find the
 * nearest food by real step count. Returns undefined when no food is reachable
 * via a safe first move.
 *
 * @param {{x: number, y: number}} myHead - The current position of the snake's head.
 * @param {string[]} safeMoves - The directions currently considered safe.
 * @param {Array<{x: number, y: number}>} food - All food positions on the board.
 * @param {{width: number, height: number, snakes: Array<object>}} board - The current board state.
 * @returns {(string|undefined)} The first direction of the A* path to the nearest reachable food, or undefined.
 */
export function chooseFoodMove(myHead, safeMoves, food, board) {
  if (food.length === 0 || safeMoves.length === 0) return;

  const blocked = new Set();
  for (const snake of board.snakes) {
    const tailIndex =
      snake.health !== 100 && snake.body.length > 1
        ? snake.body.length - 1
        : snake.body.length;
    for (let i = 0; i < tailIndex; i++) {
      blocked.add(`${snake.body[i].x},${snake.body[i].y}`);
    }
  }
  blocked.delete(`${myHead.x},${myHead.y}`);
  for (const hazard of board.hazards ?? []) {
    blocked.add(`${hazard.x},${hazard.y}`);
  }

  let bestDirection;
  let bestDistance = Infinity;

  for (const target of food) {
    const result = astar(board, myHead, target, blocked);
    if (result === undefined || !safeMoves.includes(result.direction)) continue;
    if (result.dist < bestDistance) {
      bestDistance = result.dist;
      bestDirection = result.direction;
    }
  }

  return bestDirection;
}

/**
 * Picks a safe move that intercepts the nearest opponent that is strictly
 * shorter than our snake. Among all safe directions, chooses the one whose
 * resulting head position has the smallest Manhattan distance to the target
 * opponent's head. Returns undefined when no shorter opponent exists or no
 * safe direction moves toward one.
 *
 * @param {{x: number, y: number}} myHead - The current position of our snake's head.
 * @param {number} myLength - The current length of our snake.
 * @param {string[]} safeMoves - The directions currently considered safe.
 * @param {Array<object>} opponents - All opponent snakes from the board.
 * @returns {(string|undefined)} The direction that best intercepts a smaller snake, or undefined.
 */
export function chooseHuntMove(myHead, myLength, safeMoves, opponents) {
  if (safeMoves.length === 0) return;

  // Filter to snakes that are strictly shorter than us.
  const smallerSnakes = opponents.filter((s) => s.length < myLength);
  if (smallerSnakes.length === 0) return;

  // Find the closest smaller snake by Manhattan distance from our head.
  let target = smallerSnakes[0];
  let targetDistance =
    Math.abs(myHead.x - target.body[0].x) +
    Math.abs(myHead.y - target.body[0].y);
  for (let i = 1; i < smallerSnakes.length; i++) {
    const d =
      Math.abs(myHead.x - smallerSnakes[i].body[0].x) +
      Math.abs(myHead.y - smallerSnakes[i].body[0].y);
    if (d < targetDistance) {
      targetDistance = d;
      target = smallerSnakes[i];
    }
  }

  const targetHead = target.body[0];

  // From the safe moves, pick the one that brings us closest to the target.
  let bestMove;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const direction of safeMoves) {
    const next = {
      x: myHead.x + moveDeltas[direction].x,
      y: myHead.y + moveDeltas[direction].y,
    };
    const d = Math.abs(next.x - targetHead.x) + Math.abs(next.y - targetHead.y);
    if (d < bestDistance) {
      bestDistance = d;
      bestMove = direction;
    }
  }

  // Only return the move if it actually closes the gap (doesn't move away).
  if (bestDistance >= targetDistance) return;

  return bestMove;
}

/**
 * Simulates our snake moving one step in the given direction and returns the
 * resulting game state. The snake's body is advanced (tail removed unless food
 * is eaten), food is removed if eaten, and health is updated. Opponent snakes
 * are left in their current positions.
 *
 * @param {object} gameState - The current game state from the Battlesnake engine.
 * @param {string} direction - One of "up", "down", "left", or "right".
 * @returns {object} A new game state reflecting the snake's move.
 */
export function simulateMove(gameState, direction) {
  const mySnake = gameState.you;
  const board = gameState.board;
  const delta = moveDeltas[direction];

  const newHead = {
    x: mySnake.body[0].x + delta.x,
    y: mySnake.body[0].y + delta.y,
  };

  const ateFood = board.food.some(
    (f) => f.x === newHead.x && f.y === newHead.y,
  );

  const newBody = ateFood
    ? [newHead, ...mySnake.body]
    : [newHead, ...mySnake.body.slice(0, -1)];

  const newSnake = {
    ...mySnake,
    body: newBody,
    health: ateFood ? 100 : mySnake.health - 1,
    length: newBody.length,
  };

  const newFood = ateFood
    ? board.food.filter((f) => !(f.x === newHead.x && f.y === newHead.y))
    : board.food;

  const newSnakes = board.snakes.map((s) =>
    s.id === mySnake.id ? newSnake : s,
  );

  return {
    ...gameState,
    you: newSnake,
    board: { ...board, snakes: newSnakes, food: newFood },
  };
}

/**
 * Builds a copy of the board for flood-fill purposes with each snake's tail
 * segment removed, since tails move away next turn and are not real obstacles.
 * The tail is kept when the snake just ate (health === 100) because it stays
 * put for one turn, and for single-segment snakes that have no separate tail.
 *
 * @param {object} board - The board from the Battlesnake game state.
 * @returns {object} A board copy whose snake bodies exclude movable tails.
 */
function buildFloodBoard(board) {
  return {
    ...board,
    snakes: board.snakes.map((snake) => {
      const body =
        snake.health !== 100 && snake.body.length > 1
          ? snake.body.slice(0, -1)
          : snake.body;
      return { ...snake, body };
    }),
  };
}

function getBoardSize(board) {
  if (board.width <= 7 || board.height <= 7) return "small";
  if (board.width >= 15 && board.height >= 15) return "large";
  return "medium";
}

/**
 * Decides the snake's next move for the current turn. Combines safety checks
 * (neck, walls, bodies, head-to-head), then prefers food only when it does not
 * lead into a cramped space, and finally falls back to the safe move that leads
 * into the most open space via flood fill.
 *
 * @param {object} gameState - The current game state from the Battlesnake engine.
 * @returns {{move: string}} The chosen direction: "up", "down", "left", or "right".
 */
function move(gameState) {
  const myHead = gameState.you.body[0];
  const myHealth = gameState.you.health;
  const boardSize = getBoardSize(gameState.board);

  const afterBody = applyBodyCollisions(
    getInitialMoveSafety(gameState),
    gameState,
  );
  const isMoveSafe = applyHeadToHeadSafety({ ...afterBody }, gameState);

  const safeMoves = Object.keys(isMoveSafe).filter((key) => isMoveSafe[key]);
  if (safeMoves.length === 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    return { move: "down" };
  }

  // Deprioritise hazard squares — only enter them when every safe move is a hazard.
  const hazardSquares = new Set(
    (gameState.board.hazards ?? []).map((h) => `${h.x},${h.y}`),
  );
  const nonHazardMoves = safeMoves.filter((direction) => {
    const next = {
      x: myHead.x + moveDeltas[direction].x,
      y: myHead.y + moveDeltas[direction].y,
    };
    return !hazardSquares.has(`${next.x},${next.y}`);
  });
  const candidateMoves = nonHazardMoves.length > 0 ? nonHazardMoves : safeMoves;

  // Only chase food when the simulated state after eating has enough open space.
  const food = gameState.board.food;
  const foodMove = chooseFoodMove(
    myHead,
    candidateMoves,
    food,
    gameState.board,
  );
  if (foodMove !== undefined) {
    const simState = simulateMove(gameState, foodMove);
    const simFloodBoard = buildFloodBoard(simState.board);
    const spaceThreshold =
      boardSize === "small" ? gameState.you.length * 1.5 : gameState.you.length;
    if (floodFill(simFloodBoard, simState.you.body[0]) >= spaceThreshold) {
      console.log(`MOVE ${gameState.turn}: ${foodMove}`);
      return { move: foodMove };
    }
  }

  // Hunt smaller snakes when we have enough health to be aggressive.
  const huntThreshold = boardSize === "large" ? 60 : 40;
  if (myHealth > huntThreshold) {
    const opponents = gameState.board.snakes.filter(
      (s) => s.id !== gameState.you.id,
    );
    const huntMove = chooseHuntMove(
      myHead,
      gameState.you.length,
      candidateMoves,
      opponents,
    );
    if (huntMove !== undefined) {
      console.log(`MOVE ${gameState.turn}: ${huntMove} (hunt)`);
      return { move: huntMove };
    }
  }

  const starvationThreshold = boardSize === "large" ? 50 : 25;
  if (boardSize !== "small" && myHealth < starvationThreshold) {
    const riskyMoves = Object.keys(afterBody).filter((k) => afterBody[k]);
    const riskyFoodMove = chooseFoodMove(
      myHead,
      riskyMoves,
      food,
      gameState.board,
    );
    if (riskyFoodMove !== undefined) {
      console.log(`MOVE ${gameState.turn}: ${riskyFoodMove}`);
      return { move: riskyFoodMove };
    }
  }

  // Lookahead: simulate each candidate move and score the resulting board state
  // with flood fill to pick the move that leads into the most open space.
  let bestMove = candidateMoves[0];
  let bestSpace = -1;

  for (const direction of candidateMoves) {
    const simState = simulateMove(gameState, direction);
    const simFloodBoard = buildFloodBoard(simState.board);
    const space = floodFill(simFloodBoard, simState.you.body[0]);
    if (space > bestSpace) {
      bestSpace = space;
      bestMove = direction;
    }
  }

  console.log(`MOVE ${gameState.turn}: ${bestMove}`);
  return { move: bestMove };
}

const isMainModule = fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  runServer({
    info: info,
    start: start,
    move: move,
    end: end,
  });
}

export { info, start, end, move, moveDeltas, getBoardSize };
export { floodFill } from "./floodFill.js";
