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
    color: "#39FF14",
    head: "smile",
    tail: "pixel",
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
 * Picks a safe move that heads toward the closest food by Manhattan distance.
 * Returns undefined when there is no food, no safe moves, or no safe direction
 * that points toward the closest food.
 *
 * @param {{x: number, y: number}} myHead - The current position of the snake's head.
 * @param {string[]} safeMoves - The directions currently considered safe.
 * @param {Array<{x: number, y: number}>} food - All food positions on the board.
 * @returns {(string|undefined)} A direction toward the closest food, or undefined if none applies.
 */
export function chooseFoodMove(myHead, safeMoves, food) {
  if (food.length === 0 || safeMoves.length === 0) {
    return;
  }

  let closestFood = food[0];
  let minDistance =
    Math.abs(myHead.x - food[0].x) + Math.abs(myHead.y - food[0].y);

  for (let i = 1; i < food.length; i++) {
    const distance =
      Math.abs(myHead.x - food[i].x) + Math.abs(myHead.y - food[i].y);
    if (distance < minDistance) {
      minDistance = distance;
      closestFood = food[i];
    }
  }

  const preferredMoves = [];
  if (closestFood.x < myHead.x && safeMoves.includes("left"))
    preferredMoves.push("left");
  if (closestFood.x > myHead.x && safeMoves.includes("right"))
    preferredMoves.push("right");
  if (closestFood.y < myHead.y && safeMoves.includes("down"))
    preferredMoves.push("down");
  if (closestFood.y > myHead.y && safeMoves.includes("up"))
    preferredMoves.push("up");

  if (preferredMoves.length === 0) {
    return;
  }

  return preferredMoves[Math.floor(Math.random() * preferredMoves.length)];
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

  // Only chase food when the simulated state after eating has enough open space.
  const food = gameState.board.food;
  const foodMove = chooseFoodMove(myHead, safeMoves, food);
  if (foodMove !== undefined) {
    const simState = simulateMove(gameState, foodMove);
    const simFloodBoard = buildFloodBoard(simState.board);
    if (
      floodFill(simFloodBoard, simState.you.body[0]) >= gameState.you.length
    ) {
      console.log(`MOVE ${gameState.turn}: ${foodMove}`);
      return { move: foodMove };
    }
  }

  // When starving, risk a head-to-head to reach food rather than circling
  if (myHealth < 25) {
    const riskyMoves = Object.keys(afterBody).filter((k) => afterBody[k]);
    const riskyFoodMove = chooseFoodMove(myHead, riskyMoves, food);
    if (riskyFoodMove !== undefined) {
      console.log(`MOVE ${gameState.turn}: ${riskyFoodMove}`);
      return { move: riskyFoodMove };
    }
  }

  // Lookahead: simulate each candidate move and score the resulting board state
  // with flood fill to pick the move that leads into the most open space.
  let bestMove = safeMoves[0];
  let bestSpace = -1;

  for (const direction of safeMoves) {
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

export { info, start, end, move, moveDeltas };
export { floodFill } from "./floodFill.js";
