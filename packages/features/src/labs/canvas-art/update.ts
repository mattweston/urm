import { Array, Number } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import { Match as M } from "effect"

import { advanceBall, Ball, MS_PER_SECOND } from "./ball.ts"
import { GenerateCanvasArtBall } from "./command.ts"
import type { CanvasArtMessage } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<CanvasArtMessage>>,
]

export const update = (model: Model, message: CanvasArtMessage): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            TickedCanvasArtFrame: ({ deltaTime }) => [
                evo(model, {
                    balls: Array.map(advanceBall(deltaTime / MS_PER_SECOND)),
                }),
                [],
            ],
            ClickedCanvasArt: ({ x, y }) => [
                model,
                [GenerateCanvasArtBall({ x, y })],
            ],
            CompletedGenerateCanvasArtBall: ({
                x,
                y,
                vx,
                vy,
                radius,
                color,
            }) => [
                evo(model, {
                    balls: Array.append(
                        Ball.make({
                            id: model.nextBallId,
                            x,
                            y,
                            vx,
                            vy,
                            radius,
                            color,
                        })
                    ),
                    nextBallId: Number.increment,
                }),
                [],
            ],
            ClickedClearCanvasArt: () => [evo(model, { balls: () => [] }), []],
            ClickedToggleCanvasArtPlay: () => [
                evo(model, { isRunning: (isRunning) => !isRunning }),
                [],
            ],
        })
    )
