import { Effect, Random, Schedule } from "effect"
import { Command } from "foldkit"

import { GAME } from "./constants.ts"
import { GeneratedApplePosition } from "./message.ts"
import * as Position from "./domain/position.ts"
import * as Snake from "./domain/snake.ts"

const GenerateApplePosition = Command.define("GenerateApplePosition", {
    args: { snake: Snake.Snake },
    messages: [GeneratedApplePosition],
    execute: ({ snake }) =>
        Effect.gen(function* () {
            const x = yield* Random.nextIntBetween(0, GAME.GRID_SIZE, {
                halfOpen: true,
            })
            const y = yield* Random.nextIntBetween(0, GAME.GRID_SIZE, {
                halfOpen: true,
            })
            const position: Position.Position = { x, y }

            if (Snake.contains(snake, position)) {
                return yield* Effect.fail("PositionCollision")
            }

            return position
        }).pipe(
            Effect.retry(Schedule.forever),
            Effect.orDie,
            Effect.map((position) => GeneratedApplePosition({ position }))
        ),
})

export const generateApplePosition = (snake: Snake.Snake) =>
    GenerateApplePosition({ snake })
