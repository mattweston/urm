import { Array, Match as M } from "effect"
import { type Html, type HtmlBuilder } from "foldkit/html"

import { CONTROLS, GAME } from "./constants.ts"
import * as Position from "./domain/position.ts"
import { PressedKey, type Message } from "./message.ts"
import { type GameState, type Model } from "./model.ts"

const boardCellBaseClass = "h-4 w-4 rounded-[1px] bg-card sm:h-5 sm:w-5"

const boardFrameClass =
    "inline-block rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-border p-1 [box-shadow:var(--shadow-surface)]"

const controlButtonClass =
    "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium transition-colors [box-shadow:var(--shadow-control)]"

const gameStateLabel = (gameState: GameState): string =>
    M.value(gameState).pipe(
        M.when("NotStarted", () => "Not started. Press Start or SPACE."),
        M.when("Playing", () => "Playing. SPACE pauses the game."),
        M.when("Paused", () => "Paused. SPACE resumes play."),
        M.when("GameOver", () => "Game over. Press Restart or R."),
        M.exhaustive
    )

const primaryAction = (
    gameState: GameState
): Readonly<{ label: string; key: string }> =>
    M.value(gameState).pipe(
        M.withReturnType<Readonly<{ label: string; key: string }>>(),
        M.when("NotStarted", () => ({ label: "Start", key: CONTROLS.SPACE })),
        M.when("Playing", () => ({ label: "Pause", key: CONTROLS.SPACE })),
        M.when("Paused", () => ({ label: "Resume", key: CONTROLS.SPACE })),
        M.when("GameOver", () => ({ label: "Restart", key: CONTROLS.RESTART })),
        M.exhaustive
    )

const cellClass = (
    isSnakeHead: boolean,
    isSnakeTail: boolean,
    isApple: boolean
): string =>
    M.value({ isSnakeHead, isSnakeTail, isApple }).pipe(
        M.when({ isSnakeHead: true }, () => "bg-primary"),
        M.when({ isSnakeTail: true }, () => "bg-primary/70"),
        M.when({ isApple: true }, () => "bg-destructive"),
        M.orElse(() => "bg-card")
    )

const cellView = <ParentMessage>(
    x: number,
    y: number,
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const cellPosition: Position.Position = { x, y }
    const snakeHead = Array.headNonEmpty(model.snake)
    const snakeTail = Array.tailNonEmpty(model.snake)

    return h.keyed("div")(
        `cell-${x}-${y}`,
        [
            h.Class(
                `${boardCellBaseClass} ${cellClass(
                    Position.equivalence(cellPosition, snakeHead),
                    Array.some(snakeTail, (segment) =>
                        Position.equivalence(cellPosition, segment)
                    ),
                    Position.equivalence(cellPosition, model.apple)
                )}`
            ),
        ],
        []
    )
}

const rowView = <ParentMessage>(
    y: number,
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        `row-${y}`,
        [h.Class("flex gap-px")],
        Array.makeBy(GAME.GRID_SIZE, (x) => cellView(x, y, model, h))
    )
}

const boardView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class(boardFrameClass)],
        [
            h.div(
                [h.Class("flex flex-col gap-px")],
                Array.makeBy(GAME.GRID_SIZE, (y) => rowView(y, model, h))
            ),
        ]
    )
}

const controlBar = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const action = primaryAction(model.gameState)

    return h.div(
        [h.Class("flex flex-wrap gap-3")],
        [
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(toParentMessage(PressedKey({ key: action.key }))),
                    h.Class(
                        `${controlButtonClass} bg-primary text-primary-foreground hover:bg-primary/90`
                    ),
                ],
                [action.label]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(
                        toParentMessage(PressedKey({ key: CONTROLS.RESTART }))
                    ),
                    h.Class(
                        `${controlButtonClass} bg-card text-foreground hover:bg-accent hover:text-accent-foreground`
                    ),
                ],
                ["Restart"]
            ),
        ]
    )
}

const statsView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("grid gap-3 sm:grid-cols-3")],
        [
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                    ),
                ],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs uppercase tracking-wide text-muted-foreground"
                            ),
                        ],
                        ["Score"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-1 text-2xl font-semibold text-foreground"
                            ),
                        ],
                        [String(model.points)]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                    ),
                ],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs uppercase tracking-wide text-muted-foreground"
                            ),
                        ],
                        ["High Score"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-1 text-2xl font-semibold text-foreground"
                            ),
                        ],
                        [String(model.highScore)]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                    ),
                ],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs uppercase tracking-wide text-muted-foreground"
                            ),
                        ],
                        ["State"]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm font-medium text-foreground")],
                        [gameStateLabel(model.gameState)]
                    ),
                ]
            ),
        ]
    )
}

const instructionsView = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-1 text-sm text-muted-foreground")],
        [
            h.p([], ["Use ARROW KEYS or WASD to move."]),
            h.p([], ["SPACE pauses and resumes."]),
            h.p([], ["R restarts the game."]),
        ]
    )
}

export const snakeTitle = (points: number) => `Snake (${points} pts) | Design`

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-6")],
        [
            h.section(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.h1(
                                [h.Class("text-2xl font-bold text-foreground")],
                                ["Snake"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Eat the red apple. Do not hit your tail."]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("mt-5 space-y-4")],
                        [
                            statsView(model, h),
                            controlBar(model, toParentMessage, h),
                            instructionsView(h),
                        ]
                    ),
                ]
            ),
            h.div([h.Class("flex justify-center")], [boardView(model, h)]),
        ]
    )
}
