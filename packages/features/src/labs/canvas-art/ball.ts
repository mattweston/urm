import { Schema as S } from "effect"
import { modifyFields } from "foldkit/struct"

export const CANVAS_WIDTH = 600
export const CANVAS_HEIGHT = 400

export const BALL_RADIUS_MIN = 8
export const BALL_RADIUS_MAX = 24
export const BALL_SPEED_MIN = 80
export const BALL_SPEED_MAX = 240
export const FULL_CIRCLE_RADIANS = Math.PI * 2
export const MS_PER_SECOND = 1000

export const PALETTE: ReadonlyArray<string> = [
    "#ff2d55",
    "#ffcc00",
    "#34c759",
    "#5ac8fa",
    "#af52de",
    "#ff9500",
]
export const FALLBACK_COLOR = "#ffffff"

export const Ball = S.Struct({
    id: S.Number,
    x: S.Number,
    y: S.Number,
    vx: S.Number,
    vy: S.Number,
    radius: S.Number,
    color: S.String,
})
export type Ball = typeof Ball.Type

export const advanceBall =
    (deltaSeconds: number) =>
    (ball: Ball): Ball => {
        const nextX = ball.x + ball.vx * deltaSeconds
        const nextY = ball.y + ball.vy * deltaSeconds
        const minX = ball.radius
        const maxX = CANVAS_WIDTH - ball.radius
        const minY = ball.radius
        const maxY = CANVAS_HEIGHT - ball.radius
        const bouncedX = nextX < minX || nextX > maxX
        const bouncedY = nextY < minY || nextY > maxY

        return modifyFields(ball, {
            x: () => Math.max(minX, Math.min(maxX, nextX)),
            y: () => Math.max(minY, Math.min(maxY, nextY)),
            vx: (vx) => (bouncedX ? -vx : vx),
            vy: (vy) => (bouncedY ? -vy : vy),
        })
    }
