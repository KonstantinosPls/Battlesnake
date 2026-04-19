// Welcome to
// __________         __    __  .__                               __
// \______   \_____ _/  |__/  |_|  |   ____   ______ ____ _____  |  | __ ____
//  |    |  _/\__  \\   __\   __\  | _/ __ \ /  ___//    \\__  \ |  |/ // __ \
//  |    |   \ / __ \|  |  |  | |  |_\  ___/ \___ \|   |  \/ __ \|    <\  ___/
//  |________/(______/__|  |__| |____/\_____>______>___|__(______/__|__\\_____>
//
// This file can be a nice home for your Battlesnake logic and helper functions.
//
// To get you started we've included code to prevent your Battlesnake from moving backwards.
// For more info see docs.battlesnake.com

import runServer from './server.js';

// info is called when you create your Battlesnake on play.battlesnake.com
// and controls your Battlesnake's appearance
// TIP: If you open your Battlesnake URL in a browser you should see this data
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

// start is called when your Battlesnake begins a game
function start(gameState) {
  console.log("GAME START");
}

// end is called when your Battlesnake finishes a game
function end(gameState) {
  console.log("GAME OVER\n");
}

// move is called on every turn and returns your next move
// Valid moves are "up", "down", "left", or "right"
// See https://docs.battlesnake.com/api/example-move for available data
function move(gameState) {

  let isMoveSafe = {
    up: true,
    down: true,
    left: true,
    right: true
  };

  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;

  // We've included code to prevent your Battlesnake from moving backwards
  const myHead = gameState.you.body[0];
  const myNeck = gameState.you.body[1];

  if (myNeck.x < myHead.x) {        // Neck is left of head, don't move left
    isMoveSafe.left = false;

  } else if (myNeck.x > myHead.x) { // Neck is right of head, don't move right
    isMoveSafe.right = false;

  } else if (myNeck.y < myHead.y) { // Neck is below head, don't move down
    isMoveSafe.down = false;

  } else if (myNeck.y > myHead.y) { // Neck is above head, don't move up
    isMoveSafe.up = false;
  }

  // Prevent out-of-bounds wall collisions.
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

  // Step 2 - Prevent your Battlesnake from colliding with itself
  const myBody = gameState.you.body;
  for (let i = 1; i < myBody.length; i++) {
    if (myBody[i].x === myHead.x - 1 && myBody[i].y === myHead.y) {
      isMoveSafe.left = false;
    }
    if (myBody[i].x === myHead.x + 1 && myBody[i].y === myHead.y) {
      isMoveSafe.right = false;
    }
    if (myBody[i].x === myHead.x && myBody[i].y === myHead.y - 1) {
      isMoveSafe.down = false;
    }
    if (myBody[i].x === myHead.x && myBody[i].y === myHead.y + 1) {
      isMoveSafe.up = false;
    }
  }

  // TODO: Step 3 - Prevent your Battlesnake from colliding with other Battlesnakes
  // opponents = gameState.board.snakes;

  // Are there any safe moves left?
  const safeMoves = Object.keys(isMoveSafe).filter(key => isMoveSafe[key]);
  if (safeMoves.length == 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    return { move: "down" };
  }

  // Step 4 - Move towards food instead of random, to regain health and survive longer
  const food = gameState.board.food;
  if (food.length > 0 && safeMoves.length > 0) {
    let closestFood = food[0];
    let minDistance = Math.abs(myHead.x - food[0].x) + Math.abs(myHead.y - food[0].y);

    for (let i = 1; i < food.length; i++) {
      const distance = Math.abs(myHead.x - food[i].x) + Math.abs(myHead.y - food[i].y);
      if (distance < minDistance) {
        minDistance = distance;
        closestFood = food[i];
      }
    }

    const preferredMoves = [];
    if (closestFood.x < myHead.x && safeMoves.includes('left')) preferredMoves.push('left');
    if (closestFood.x > myHead.x && safeMoves.includes('right')) preferredMoves.push('right');
    if (closestFood.y < myHead.y && safeMoves.includes('down')) preferredMoves.push('down');
    if (closestFood.y > myHead.y && safeMoves.includes('up')) preferredMoves.push('up');

    if (preferredMoves.length > 0) {
      const nextMove = preferredMoves[Math.floor(Math.random() * preferredMoves.length)];
      console.log(`MOVE ${gameState.turn}: ${nextMove}`);
      return { move: nextMove };
    }
  }

  // Fallback: choose a random safe move
  const nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
  console.log(`MOVE ${gameState.turn}: ${nextMove}`);
  return { move: nextMove };
}

runServer({
  info: info,
  start: start,
  move: move,
  end: end
});
