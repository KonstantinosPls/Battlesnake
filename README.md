# Battlesnake

This project serves as a hands-on exercise in collaborative software development, focusing on Git workflows, version control best practices, code reviews, CI/CD pipelines and iterative development. We are working together to build an autonomous Battlesnake while following industry-standard practices such as branching strategies, pull requests, and automated testing.

## Technologies Used

This project uses [Node.js](https://nodejs.dev/) and [Express](https://expressjs.com/). It also comes with an optional [Dockerfile](https://docs.docker.com/engine/reference/builder/) to help with deployment.

Tooling used during development:

- [Jest](https://jestjs.io/) — unit testing
- [ESLint](https://eslint.org/) — linting (with the sonarjs, unicorn, eslint-comments, and jest plugins)
- [Prettier](https://prettier.io/) — code formatting
- [JSDoc](https://jsdoc.app/) — documentation generation
- [EditorConfig](https://editorconfig.org/) — consistent editor settings

## Getting Started

Install dependencies using npm:

```sh
npm install
```

Start the Battlesnake server:

```sh
npm run start
```

You should see the following output once it is running:

```sh
Running Battlesnake at http://0.0.0.0:8000
```

Open [localhost:8000](http://localhost:8000) in your browser and you should see the snake's info:

```json
{
  "apiversion": "1",
  "author": "yiotak",
  "color": "#000080",
  "head": "fang",
  "tail": "bolt"
}
```

## Available Scripts

| Script                  | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `npm start`             | Start the Battlesnake server (default port 8000).       |
| `npm test`              | Run the Jest test suite.                                |
| `npm run test:watch`    | Run the tests in watch mode.                            |
| `npm run test:coverage` | Run the tests and produce a coverage report.            |
| `npm run lint`          | Lint the codebase with ESLint.                          |
| `npm run lint:fix`      | Lint and auto-fix issues where possible.                |
| `npm run format`        | Format the codebase with Prettier.                      |
| `npm run format:check`  | Check formatting without writing changes.               |
| `npm run docs`          | Generate the HTML documentation into the `docs` folder. |

## System Documentation

### Project structure

```
.
├── .github/
│   ├── workflows/
│   │   ├── ci-develop.yml        # CI: lint and test on PR to develop
│   │   ├── ci-main.yml           # CI: lint, test, and coverage on PR to main
│   │   └── deploy.yml            # CD: deploy to Railway on push to main
│   ├── dependabot.yml            # Weekly automated dependency updates
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/                         # Generated HTML documentation
├── index.js                      # Entry point: Battlesnake handlers and move logic
├── astar.js                      # A* pathfinding algorithm
├── floodFill.js                  # Flood fill algorithm (open-space calculation)
├── server.js                     # Express server exposing the Battlesnake API
├── index.test.js                 # Tests for the move logic and helpers
├── astar.test.js                 # Tests for the A* pathfinding algorithm
├── floodFill.test.js             # Tests for the flood fill algorithm
├── eslint.config.js              # ESLint configuration
├── jsdoc.config.json             # JSDoc configuration
└── CHANGELOG.md                  # Project changelog
```

### How it works

The Battlesnake responds to four API endpoints (handled in `server.js`):

- `GET /` — returns the snake's appearance (`info`)
- `POST /start` — called when a game begins (`start`)
- `POST /move` — called every turn to decide the next move (`move`)
- `POST /end` — called when a game ends (`end`)

On every turn, the `move` function in `index.js` decides where to go by progressively narrowing down the safe directions:

1. **Initial safety** (`getInitialMoveSafety`) — avoids moving backwards into the neck and off the board edges.
2. **Body collisions** (`applyBodyCollisions`) — avoids every snake's body. The tail square is treated as safe because the tail moves away each turn, unless the snake just ate food (health is 100), in which case the tail stays put.
3. **Head-to-head safety** (`applyHeadToHeadSafety`) — avoids squares an equal or longer opponent could move into next turn (Manhattan distance of 1 from their head).
4. **Hazard deprioritisation** — in Royale mode, restricts candidate moves to non-hazard squares; falls back to all safe moves only when every safe move leads into a hazard.
5. **Food seeking** (`chooseFoodMove`) — uses A\* pathfinding (`astar.js`) to find the actual shortest path to the nearest reachable food, navigating around snake bodies and hazard squares. The food move is only taken if the resulting board state has sufficient open space (flood fill ≥ snake length, ×1.5 on small boards).
6. **Hunt smaller snakes** (`chooseHuntMove`) — when health is above the aggression threshold (40 on small/medium boards, 60 on large), closes in on the nearest strictly-shorter opponent.
7. **Starvation risky moves** — on non-small boards, when health drops below the starvation threshold (25 on medium, 50 on large), risks a head-to-head move to reach food.
8. **Flood fill lookahead** (`floodFill`) — simulates each candidate move and scores the resulting board state with flood fill to pick the move that leads into the most open space.

Board size is classified by `getBoardSize`: **small** (≤7 in either dimension), **medium** (default), or **large** (≥15 in both dimensions). Several thresholds scale with board size.

### Documentation

API documentation is generated from JSDoc comments. Regenerate it with:

```sh
npm run docs
```

Then open `docs/index.html` in a browser to view it.

## Development Workflow

This project follows a Gitflow-style branching model:

- `main` — stable, released versions only (tagged at the end of each iteration).
- `develop` — integration branch for completed work.
- `feature/*`, `fix/*`, `hotfix/*` — short-lived branches for individual issues.

The workflow for any change:

1. Branch off `develop` (e.g. `feature/my-change`).
2. Make changes, keeping commits focused.
3. Run `npm run lint`, `npm run format`, and `npm test` before pushing.
4. Open a pull request into `develop` and reference the issue with `Closes #<number>`.
5. A teammate reviews and approves before merging.

## Play a Game Locally

Install the [Battlesnake CLI](https://github.com/BattlesnakeOfficial/rules/tree/main/cli):

- You can [download compiled binaries here](https://github.com/BattlesnakeOfficial/rules/releases)
- or [install as a go package](https://github.com/BattlesnakeOfficial/rules/tree/main/cli#installation) (requires Go 1.18 or higher)

Run a solo game:

```sh
battlesnake play -W 11 -H 11 --name 'CCS2430 Snake' --url http://localhost:8000 -g solo --browser
```

Run a game with two snakes:

```sh
battlesnake play -W 11 -H 11 --name 'CCS2430 Snake' --url http://localhost:8000 --name 'CCS2430 Snake 2' --url http://localhost:8000 -g standard --browser
```

Run a Royale mode game:

```sh
battlesnake play -W 11 -H 11 --name 'CCS2430 Snake' --url http://localhost:8000 -g royale --browser
```
