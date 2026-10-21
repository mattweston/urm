import { Match, Schema } from "effect"

import { GAME } from "../constants.ts"
import * as Direction from "./direction.ts"

export const Position = Schema.Struct({
    x: Schema.Number,
    y: Schema.Number,
})

export const equivalence = Schema.toEquivalence(Position)

export type Position = typeof Position.Type

export const wrap = ({ x, y }: Position): Position => {
    let nextX = x
    let nextY = y

    if (nextX < 0) {
        nextX = GAME.GRID_SIZE - 1
    } else if (nextX >= GAME.GRID_SIZE) {
        nextX = 0
    }

    if (nextY < 0) {
        nextY = GAME.GRID_SIZE - 1
    } else if (nextY >= GAME.GRID_SIZE) {
        nextY = 0
    }

    return {
        x: nextX,
        y: nextY,
    }
}

export const move = (
    position: Position,
    direction: Direction.Direction
): Position => {
    const nextPosition = Match.value(direction).pipe(
        Match.withReturnType<Position>(),
        Match.when("Up", () => ({ x: position.x, y: position.y - 1 })),
        Match.when("Down", () => ({ x: position.x, y: position.y + 1 })),
        Match.when("Left", () => ({ x: position.x - 1, y: position.y })),
        Match.when("Right", () => ({ x: position.x + 1, y: position.y })),
        Match.exhaustive
    )

    return wrap(nextPosition)
}
