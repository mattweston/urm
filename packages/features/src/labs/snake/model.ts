import { Schema as S } from "effect"

import * as Direction from "./domain/direction.ts"
import * as Position from "./domain/position.ts"
import * as Snake from "./domain/snake.ts"

export const GameState = S.Literals([
    "NotStarted",
    "Playing",
    "Paused",
    "GameOver",
])

export type GameState = typeof GameState.Type

export const Model = S.Struct({
    snake: Snake.Snake,
    apple: Position.Position,
    direction: Direction.Direction,
    nextDirection: Direction.Direction,
    gameState: GameState,
    points: S.Number,
    highScore: S.Number,
})

export type Model = typeof Model.Type
