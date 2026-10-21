import { Array, Option, pipe } from "effect"
import { Canvas } from "foldkit"

import {
    BACKGROUND_COLOR_TOP,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    CORE_ALPHA_BASE,
    CORE_LIGHTNESS_PERCENT,
    CORE_LINE_WIDTH,
    FADE_IN_MS,
    FADE_OUT_MS,
    GLOW_ALPHA_BASE,
    GLOW_LIGHTNESS_PERCENT,
    GLOW_LINE_WIDTH,
    HEAD_ALPHA,
    HEAD_LIGHTNESS_PERCENT,
    HEAD_RADIUS,
    HUE_MAX,
    MOUSE_INFLUENCE_RADIUS,
    SATURATION_PERCENT,
    TWO_PI,
    VIGNETTE_ALPHA,
} from "./constant.ts"
import type { GenerativeArtModel, Particle, Point } from "./model.ts"

const fadeAlpha = (particle: Particle): number => {
    const remainingMs = particle.lifespanMs - particle.ageMs
    const fadeIn = Math.min(1, particle.ageMs / FADE_IN_MS)
    const fadeOut = Math.min(1, remainingMs / FADE_OUT_MS)
    return Math.max(0, Math.min(fadeIn, fadeOut))
}

const currentHue = (particle: Particle, elapsedSeconds: number): number => {
    const drift =
        particle.hueDriftPerSecond * (elapsedSeconds - particle.bornAtSeconds)
    const raw = particle.baseHue + drift
    return ((raw % HUE_MAX) + HUE_MAX) % HUE_MAX
}

const trailToInstructions = (
    trail: ReadonlyArray<Point>
): ReadonlyArray<Canvas.PathInstruction> =>
    Array.matchLeft(trail, {
        onEmpty: () => [],
        onNonEmpty: (head, tail) => [
            Canvas.MoveTo({ x: head.x, y: head.y }),
            ...Array.map(tail, (segment) =>
                Canvas.LineTo({ x: segment.x, y: segment.y })
            ),
        ],
    })

const ALPHA_VISIBILITY_EPSILON = 0.01

const particleShapes = (
    particle: Particle,
    elapsedSeconds: number
): ReadonlyArray<Canvas.Shape> => {
    if (particle.trail.length < 2) {
        return []
    }
    const fade = fadeAlpha(particle)
    if (fade < ALPHA_VISIBILITY_EPSILON) {
        return []
    }
    const instructions = trailToInstructions(particle.trail)
    const hue = currentHue(particle, elapsedSeconds)
    const glowColor = `hsla(${hue}, ${SATURATION_PERCENT}%, ${GLOW_LIGHTNESS_PERCENT}%, ${
        GLOW_ALPHA_BASE * fade
    })`
    const coreColor = `hsla(${hue}, ${SATURATION_PERCENT}%, ${CORE_LIGHTNESS_PERCENT}%, ${
        CORE_ALPHA_BASE * fade
    })`
    return [
        Canvas.Path({
            instructions,
            stroke: glowColor,
            lineWidth: GLOW_LINE_WIDTH,
            lineCap: "Round",
            lineJoin: "Round",
        }),
        Canvas.Path({
            instructions,
            stroke: coreColor,
            lineWidth: CORE_LINE_WIDTH,
            lineCap: "Round",
            lineJoin: "Round",
        }),
    ]
}

const NEBULA_GLOW_COUNT = 3
const NEBULA_GLOW_RADIUS = 280
const NEBULA_DRIFT_SPEEDS = [0.11, 0.07, 0.13]
const NEBULA_OFFSETS_X = [0.3, 0.72, 0.52]
const NEBULA_OFFSETS_Y = [0.4, 0.62, 0.28]
const NEBULA_DRIFT_AMPLITUDES_X = [80, 100, 60]
const NEBULA_DRIFT_AMPLITUDES_Y = [50, 60, 80]
const NEBULA_COLORS: ReadonlyArray<string> = [
    "rgba(120, 35, 200, 0.18)",
    "rgba(28, 90, 200, 0.16)",
    "rgba(220, 30, 140, 0.13)",
]
const NEBULA_FALLBACK_COLOR = "rgba(80, 40, 120, 0.12)"

const nebulaGlowAt = (index: number, elapsedSeconds: number): Canvas.Shape => {
    const fallbackZero = 0
    const fallbackHalf = 0.5
    const driftSpeed = pipe(
        NEBULA_DRIFT_SPEEDS,
        Array.get(index),
        Option.getOrElse(() => fallbackZero)
    )
    const offsetX = pipe(
        NEBULA_OFFSETS_X,
        Array.get(index),
        Option.getOrElse(() => fallbackHalf)
    )
    const offsetY = pipe(
        NEBULA_OFFSETS_Y,
        Array.get(index),
        Option.getOrElse(() => fallbackHalf)
    )
    const amplitudeX = pipe(
        NEBULA_DRIFT_AMPLITUDES_X,
        Array.get(index),
        Option.getOrElse(() => fallbackZero)
    )
    const amplitudeY = pipe(
        NEBULA_DRIFT_AMPLITUDES_Y,
        Array.get(index),
        Option.getOrElse(() => fallbackZero)
    )
    const color = pipe(
        NEBULA_COLORS,
        Array.get(index),
        Option.getOrElse(() => NEBULA_FALLBACK_COLOR)
    )
    const phase = (index / NEBULA_GLOW_COUNT) * TWO_PI
    return Canvas.Circle({
        x:
            CANVAS_WIDTH * offsetX +
            Math.sin(elapsedSeconds * driftSpeed + phase) * amplitudeX,
        y:
            CANVAS_HEIGHT * offsetY +
            Math.cos(elapsedSeconds * driftSpeed + phase) * amplitudeY,
        radius: NEBULA_GLOW_RADIUS,
        fill: color,
    })
}

const nebulaShapes = (elapsedSeconds: number): ReadonlyArray<Canvas.Shape> =>
    Array.makeBy(NEBULA_GLOW_COUNT, (index) =>
        nebulaGlowAt(index, elapsedSeconds)
    )

const backgroundShape = Canvas.Rect({
    x: 0,
    y: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    fill: BACKGROUND_COLOR_TOP,
})

const VIGNETTE_INSET = 1
const VIGNETTE_STRIP_WIDTH = 80
const VIGNETTE_STEPS = 4
const VIGNETTE_ALPHA_PER_STEP = VIGNETTE_ALPHA / VIGNETTE_STEPS

const vignetteStrips: ReadonlyArray<Canvas.Shape> = Array.flatMap(
    Array.makeBy(VIGNETTE_STEPS, (step) => step),
    (step) => {
        const stripWidth = VIGNETTE_STRIP_WIDTH * (1 - step / VIGNETTE_STEPS)
        if (stripWidth <= VIGNETTE_INSET) {
            return []
        }
        const fill = `rgba(2, 1, 8, ${VIGNETTE_ALPHA_PER_STEP})`
        return [
            Canvas.Rect({
                x: 0,
                y: 0,
                width: CANVAS_WIDTH,
                height: stripWidth,
                fill,
            }),
            Canvas.Rect({
                x: 0,
                y: CANVAS_HEIGHT - stripWidth,
                width: CANVAS_WIDTH,
                height: stripWidth,
                fill,
            }),
            Canvas.Rect({
                x: 0,
                y: 0,
                width: stripWidth,
                height: CANVAS_HEIGHT,
                fill,
            }),
            Canvas.Rect({
                x: CANVAS_WIDTH - stripWidth,
                y: 0,
                width: stripWidth,
                height: CANVAS_HEIGHT,
                fill,
            }),
        ]
    }
)

const particleHeadShape = (
    particle: Particle,
    elapsedSeconds: number
): Option.Option<Canvas.Shape> =>
    Option.map(Array.last(particle.trail), (head) => {
        const hue = currentHue(particle, elapsedSeconds)
        const fade = fadeAlpha(particle)
        return Canvas.Circle({
            x: head.x,
            y: head.y,
            radius: HEAD_RADIUS,
            fill: `hsla(${hue}, ${SATURATION_PERCENT}%, ${HEAD_LIGHTNESS_PERCENT}%, ${
                HEAD_ALPHA * fade
            })`,
        })
    })

const mouseIndicator = (
    maybeMousePosition: Option.Option<Point>
): ReadonlyArray<Canvas.Shape> =>
    Option.match(maybeMousePosition, {
        onNone: () => [],
        onSome: (position) => [
            Canvas.Circle({
                x: position.x,
                y: position.y,
                radius: MOUSE_INFLUENCE_RADIUS,
                fill: "rgba(255, 255, 255, 0.04)",
            }),
        ],
    })

export const sceneShapes = (
    model: GenerativeArtModel
): ReadonlyArray<Canvas.Shape> => [
    backgroundShape,
    ...nebulaShapes(model.elapsedSeconds),
    ...Array.flatMap(model.particles, (particle) =>
        particleShapes(particle, model.elapsedSeconds)
    ),
    ...Array.flatMap(model.particles, (particle) =>
        Option.toArray(particleHeadShape(particle, model.elapsedSeconds))
    ),
    ...vignetteStrips,
    ...mouseIndicator(model.maybeMousePosition),
]
