import { animate } from "animejs"

// Imperative motion, kept away from the view.
//
// A Foldkit view is a pure function and snabbdom re-patches on every render, so
// any property the view writes is clobbered mid-animation. These animations
// therefore only ever touch `x`, `y` and `rotate` on the *step* nodes — the
// view sets no transform on those. The main node's scale stays Model-driven
// through the spring, and must not be animated from here.

export const STEP_INDEX_ATTRIBUTE = "step-index"

export const step_node_selector = (index: number): string =>
    `.effect-example [data-${STEP_INDEX_ATTRIBUTE}="${index.toString()}"]`

// Upstream's constants (`useEffectNodeAnimationController`): six jolts to a
// random offset, then a longer settle back to rest.
const SHAKE_COUNT = 6
const SHAKE_INTENSITY = 8
const SHAKE_ROTATION_RANGE = 8
const SHAKE_STEP_MILLIS = 80
const SHAKE_RETURN_MILLIS = 300

export type Keyframe = Readonly<{
    to: number
    duration: number
    ease: string
}>

const jolt = (range: number): number => (Math.random() - 0.5) * range

// Pure, so the shape can be asserted without a DOM: six random jolts followed
// by a settle to exactly 0. Anything that does not end at 0 would leave the
// node permanently displaced.
export const shake_keyframes = (range: number): ReadonlyArray<Keyframe> => [
    ...Array.from({ length: SHAKE_COUNT }, () => ({
        to: jolt(range),
        duration: SHAKE_STEP_MILLIS,
        ease: "inOutQuad",
    })),
    { to: 0, duration: SHAKE_RETURN_MILLIS, ease: "outQuad" },
]

export const shake_intensity = SHAKE_INTENSITY
export const shake_rotation_range = SHAKE_ROTATION_RANGE

export const shake_element = (element: Element): void => {
    // Spread because anime.js types its keyframe lists as mutable arrays and
    // will not accept a readonly one. Each call also wants its own randomness,
    // so x, y and rotate get three separate draws.
    animate(element, {
        x: [...shake_keyframes(SHAKE_INTENSITY)],
        y: [...shake_keyframes(SHAKE_INTENSITY)],
        rotate: [...shake_keyframes(SHAKE_ROTATION_RANGE)],
    })
}
