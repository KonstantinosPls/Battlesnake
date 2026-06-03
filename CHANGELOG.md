# Changelog

All changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

### Added

- Add CI/CD GitHub Actions workflows: run tests and lint on PR to develop, run tests, lint, and coverage check (≥50%) on PR to main, deploy to Railway on push to main
- Configure Jest coverage threshold (≥50%) and scope in package.json
- Add check-issues.txt documenting the two issues following the full status flow
- Implement 1-move lookahead using flood fill heuristic: simulate each candidate move before scoring so the snake evaluates space in the resulting board state
- Hunt smaller snakes: when health is above the aggression threshold, prefer moves that close in on the nearest opponent shorter than our snake

### Fixed

- Avoid food traps: food moves are only taken when the target square has reachable space ≥ snake length
- Flood fill now excludes tail segments (unless health === 100), matching body collision logic

## [1.1.1] - 2026-05-31

### Fixed

- Updated Battlesnake appearance:
  - Changed color to Navy Blue (#000080)
  - Changed head style to fang
  - Changed tail style to bolt

## [1.1.0] - 2026-05-28

### Added

Iteration #3

    - Implement flood fill algorithm using TDD
    - Set up Jest test suite with eslint-plugin-jest integration
    - Add test, test:watch, and test:coverage npm scripts
    - Document all functions with JSDoc and generate HTML documentation (docs folder)
    - Update README with system documentation (scripts, project structure, move logic, workflow)

### Fixed

    - Allow moving into the tail squares of any snake (tail moves away each turn unless food was just eaten)

## [1.0.1] - 2026-05-10

### Fixed

- Added author name in README.md

## [1.0.0] - 2026-05-09

### Added

Iteration #1

    - Customise snakes's appearance (colour/head/tail)
    - Avoid collision with walls
    - Avoid collision with itself when takes next move
    - Avoid collision with other snakes

Iteration #2

    - Add a pull request template for repository
    - Create changelog file
    - Add and configure EditorConfig
    - Add and configure Prettier with default options
    - Add and configure ESLint with sonarjs, unicorn, and    eslint-comments plugins(using the @eslint-community fork for ESLint v10 compatibility)
    - Lint the entire codebase
    - Disable Express x-powered-by header for security
    - Find and eat closest food using Manhattan distance
    - Handle head-to-head movement against equal or longer opponents
