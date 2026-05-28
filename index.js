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

function start(gameState) {
  console.log("GAME START");
}

function end(gameState) {
  console.log("GAME OVER\n");
}

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

export function applyBodyCollisions(isMoveSafe, gameState) {
  const myHead = gameState.you.body[0];

  for (const snake of gameState.board.snakes) {
    const bodyStartIndex = snake.id === gameState.you.id ? 1 : 0;
    for (let i = bodyStartIndex; i < snake.body.length; i++) {
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

function move(gameState) {
  const myHead = gameState.you.body[0];
  const isMoveSafe = applyHeadToHeadSafety(
    applyBodyCollisions(getInitialMoveSafety(gameState), gameState),
    gameState,
  );

  const safeMoves = Object.keys(isMoveSafe).filter((key) => isMoveSafe[key]);
  if (safeMoves.length === 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    return { move: "down" };
  }

  const food = gameState.board.food;
  const foodMove = chooseFoodMove(myHead, safeMoves, food);
  if (foodMove !== undefined) {
    console.log(`MOVE ${gameState.turn}: ${foodMove}`);
    return { move: foodMove };
  }

  let bestMove = safeMoves[0];
  let bestSpace = -1;

  for (const direction of safeMoves) {
    const delta = moveDeltas[direction];
    const nextHead = {
      x: myHead.x + delta.x,
      y: myHead.y + delta.y,
    };
    const space = floodFill(gameState.board, nextHead);
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
