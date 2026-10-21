import { Array } from "effect"
import { Canvas } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Button } from "@foldkit/ui"

import {
    ClickedCanvasArt,
    ClickedClearCanvasArt,
    ClickedToggleCanvasArtPlay,
    type CanvasArtMessage,
} from "./message.ts"
import { CANVAS_HEIGHT, CANVAS_WIDTH, type Ball } from "./ball.ts"
import type { Model } from "./model.ts"

const BACKGROUND_FILL = "#0a0a0f"

const backgroundShape = Canvas.Rect({
    x: 0,
    y: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    fill: BACKGROUND_FILL,
})

const ballShape = (ball: Ball): Canvas.Shape =>
    Canvas.Circle({
        x: ball.x,
        y: ball.y,
        radius: ball.radius,
        fill: ball.color,
    })

const sceneShapes = (
    balls: ReadonlyArray<Ball>
): ReadonlyArray<Canvas.Shape> => [
    backgroundShape,
    ...Array.map(balls, ballShape),
]

const controlsView = <ParentMessage>(
    balls: ReadonlyArray<Ball>,
    isRunning: boolean,
    toCanvasArtMessage: (message: CanvasArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex gap-3 mt-4 items-center")],
        [
            Button.view(
                {
                    onClick: toCanvasArtMessage(ClickedToggleCanvasArtPlay()),
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    "min-w-20 px-4 py-2 rounded-[var(--radius-control)] bg-primary text-primary-foreground font-medium transition hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                ),
                            ],
                            [isRunning ? "Pause" : "Play"]
                        ),
                },
                h
            ),
            Button.view(
                {
                    onClick: toCanvasArtMessage(ClickedClearCanvasArt()),
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    "min-w-20 px-4 py-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border text-foreground font-medium transition hover:bg-muted"
                                ),
                            ],
                            ["Clear"]
                        ),
                },
                h
            ),
            h.p(
                [h.Class("text-muted-foreground text-sm")],
                [
                    h.span(
                        [
                            h.Class(
                                "inline-block tabular-nums text-right min-w-8"
                            ),
                        ],
                        [`${balls.length}`]
                    ),
                    " balls",
                ]
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Model,
    toCanvasArtMessage: (message: CanvasArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { balls, isRunning } = model

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Canvas art"]
            ),
            h.p(
                [h.Class("text-muted-foreground max-w-2xl mb-6")],
                ["Click the canvas to spawn a ball."]
            ),
            h.div(
                [h.Class("flex flex-col items-start")],
                [
                    Canvas.view(
                        {
                            width: CANVAS_WIDTH,
                            height: CANVAS_HEIGHT,
                            shapes: sceneShapes(balls),
                            className:
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border max-w-full cursor-crosshair bg-card text-card-foreground [box-shadow:var(--shadow-surface)]",
                            onPointerDown: ({ x, y }) =>
                                toCanvasArtMessage(ClickedCanvasArt({ x, y })),
                        },
                        h
                    ),
                    controlsView(balls, isRunning, toCanvasArtMessage, h),
                ]
            ),
        ]
    )
}
