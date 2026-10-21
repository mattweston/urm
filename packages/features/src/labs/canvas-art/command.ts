import { Array, Effect, Option, Random, Schema as S, pipe } from "effect"
import { Command } from "foldkit"

import {
    BALL_RADIUS_MAX,
    BALL_RADIUS_MIN,
    BALL_SPEED_MAX,
    BALL_SPEED_MIN,
    FALLBACK_COLOR,
    FULL_CIRCLE_RADIANS,
    PALETTE,
} from "./ball.ts"
import { CompletedGenerateCanvasArtBall } from "./message.ts"

export const GenerateCanvasArtBall = Command.define("GenerateCanvasArtBall", {
    args: { x: S.Number, y: S.Number },
    messages: [CompletedGenerateCanvasArtBall],
    execute: ({ x, y }) =>
        Effect.gen(function* () {
            const angle = yield* Random.nextBetween(0, FULL_CIRCLE_RADIANS)
            const speed = yield* Random.nextBetween(
                BALL_SPEED_MIN,
                BALL_SPEED_MAX
            )
            const radius = yield* Random.nextBetween(
                BALL_RADIUS_MIN,
                BALL_RADIUS_MAX
            )
            const colorIndex = yield* Random.nextIntBetween(0, PALETTE.length, {
                halfOpen: true,
            })
            const color = pipe(
                PALETTE,
                Array.get(colorIndex),
                Option.getOrElse(() => FALLBACK_COLOR)
            )

            return CompletedGenerateCanvasArtBall({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius,
                color,
            })
        }),
})
