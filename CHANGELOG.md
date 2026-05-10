# Changelog

All changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

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
