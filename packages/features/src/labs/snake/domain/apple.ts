import { Effect, Random, Schedule } from "effect"

import { GAME } from "../constants.ts"
import type { Position } from "./position.ts"
import * as Snake from "./snake.ts"

export const generatePosition = (snake: Snake.Snake) =>
    Effect.gen(function* () {
        const x = yield* Random.nextIntBetween(0, GAME.GRID_SIZE, {
            halfOpen: true,
        })
        const y = yield* Random.nextIntBetween(0, GAME.GRID_SIZE, {
            halfOpen: true,
        })
        const position: Position = { x, y }

        if (Snake.contains(snake, position)) {
            return yield* Effect.fail("PositionCollision")
        }

        return position
    }).pipe(Effect.retry(Schedule.forever), Effect.orDie)
