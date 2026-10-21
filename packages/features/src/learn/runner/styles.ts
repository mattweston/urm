/** # Visual Effect styles
 *
 *  Every class this lesson renders, as Tailwind utilities over the app's theme
 *  tokens. The lesson used to carry a 1,000-line stylesheet; only the
 *  `@keyframes` remain in CSS, because Tailwind has no utility form for them.
 *
 *  Two conventions worth knowing:
 *
 *  - The run-state palette (`--ve-running` and friends) is declared on the root
 *    as arbitrary properties and read by descendants as `var(--ve-…)`. That
 *    keeps the cascade the original relied on — a phase container sets
 *    `--ve-node-fill` and every node inside it repaints — without any of it
 *    living in a stylesheet.
 *  - Animations are `motion-safe:` so they stay off when the reader has asked
 *    for less motion, which is what the original's `prefers-reduced-motion`
 *    guard did.
 */

/** Root. Declares the run-state palette and opts into the app-wide Shiki token
 *  colours; `shiki-tokens` is what makes the highlighted code follow the theme. */
export const ROOT =
    "effect-example shiki-tokens font-[var(--font-code,ui-monospace,monospace)] text-foreground [interpolate-size:allow-keywords] " +
    "[--ve-running:var(--color-primary)] [--ve-succeeded:var(--color-success)] " +
    "[--ve-failed:var(--color-destructive)] [--ve-interrupted:var(--color-warning)] " +
    "[--ve-info:var(--color-chart-2)] [--ve-running-edge:var(--color-primary)] " +
    "[--ve-succeeded-edge:var(--color-success)] " +
    "[--ve-died:color-mix(in_srgb,var(--color-destructive)_65%,var(--color-background))]"

export const MAIN =
    "bg-background px-6 pt-9 pb-20 max-sm:px-4 max-sm:pt-6 max-sm:pb-12 xl:px-20"

export const CONTENT = "mx-auto mt-23 max-w-3xl max-sm:mt-14"

export const HEADER = "mx-auto flex max-w-3xl items-center justify-between"

export const BRAND = "flex items-center gap-[0.6rem]"

const BRAND_MARK =
    "inline-flex size-4 items-center justify-center text-base text-muted-foreground"

/** The mark turns while the effect runs, and only then. */
export const brand_mark = (phase: string): string =>
    phase === "running"
        ? `${BRAND_MARK} text-[var(--ve-running)] motion-safe:animate-[effect-example-brand-spin_1s_linear_infinite]`
        : BRAND_MARK

export const BRAND_TITLE =
    "text-[0.95rem] font-bold tracking-[0.04em] text-foreground"

/** The track is the `::after`. Its colour belongs to the state, never to the
 *  base: two `after:bg-*` utilities on one element are resolved by their order
 *  in the generated stylesheet, not by the order they appear in the class
 *  attribute, so a base colour would win or lose unpredictably. */
const SOUND =
    "cursor-pointer border-0 bg-transparent px-0 py-[0.3rem] text-xs tracking-[0.08em] text-muted-foreground " +
    "after:ml-3 after:inline-block after:h-[1.15rem] after:w-[2.3rem] after:rounded-full after:align-middle after:content-['']"

/** Three states, and the middle one looks like the middle one: sound unless the
 *  system has asked for less. */
export const sound = (preference: string): string =>
    preference === "on"
        ? `${SOUND} after:bg-primary after:shadow-[inset_1.15rem_0_0_var(--color-primary-foreground)]`
        : preference === "system"
          ? `${SOUND} after:bg-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-input))] after:shadow-[inset_0.6rem_0_0_var(--color-primary-foreground)]`
          : `${SOUND} after:bg-input`

export const INTRO_CARD =
    "rounded-[0.9rem] border border-border bg-card p-8 text-xl/[1.55] font-semibold text-card-foreground shadow-[var(--shadow-surface)] [&_p]:inline max-sm:p-5 max-sm:text-base"

export const INTRO_LINK =
    "inline-flex items-baseline gap-[0.35em] text-primary underline decoration-[0.08em] underline-offset-[0.16em]"

export const INTRO_LINK_ICON = "size-[0.8em] shrink-0"

const CATEGORY_TITLE =
    "mb-11 text-[1.35rem] font-extrabold tracking-[0.05em] text-foreground first-letter:text-muted-foreground max-sm:mb-7 max-sm:text-[1.1rem]"

export const category_title = (is_first: boolean): string =>
    is_first ? `${CATEGORY_TITLE} mt-0` : `${CATEGORY_TITLE} mt-28 max-sm:mt-16`

export const CARD =
    "overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] " +
    "bg-linear-to-br from-[color-mix(in_srgb,var(--color-card)_80%,transparent)] to-[color-mix(in_srgb,var(--color-card)_40%,transparent)] " +
    "shadow-[var(--shadow-overlay)]"

export const CARD_HEADING =
    "flex items-center gap-4 rounded-t-2xl border-b border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] " +
    "bg-[color-mix(in_srgb,var(--color-muted)_50%,transparent)] p-4"

export const CARD_TITLE =
    "text-xl font-extrabold whitespace-nowrap text-card-foreground"

/** What tells `Effect.retry (recurs)` apart from `Effect.retry (exponential)`
 *  when the heading is otherwise identical. */
export const CARD_VARIANT =
    "ml-2 text-[0.8rem] font-semibold text-muted-foreground before:content-['('] after:content-[')']"

export const CARD_DESCRIPTION = "mt-[0.2rem] text-xs text-muted-foreground"

export const CARD_TEXT = "flex min-w-0 flex-auto flex-col"

const CARD_ICON =
    "relative inline-flex size-10 min-w-0 shrink-0 grow-0 basis-10 cursor-pointer items-center justify-center " +
    "overflow-hidden rounded-md border-0 p-0 bg-[var(--ve-node-fill,var(--color-primary))] text-primary-foreground " +
    "transition-[background,transform] duration-[180ms] ease-out hover:scale-105 active:scale-95"

/** The fill follows the run state, reusing the same palette the node does so
 *  the two cannot drift apart. */
export const card_icon = (phase: string): string => {
    if (phase === "running")
        return `${CARD_ICON} [--ve-node-fill:var(--ve-running)]`
    if (phase === "succeeded")
        return `${CARD_ICON} [--ve-node-fill:var(--ve-succeeded)]`
    if (phase === "failed")
        return `${CARD_ICON} [--ve-node-fill:var(--ve-failed)]`
    if (phase === "died") return `${CARD_ICON} [--ve-node-fill:var(--ve-died)]`
    if (phase === "interrupted")
        return `${CARD_ICON} [--ve-node-fill:var(--ve-interrupted)]`
    return `${CARD_ICON} [--ve-node-fill:color-mix(in_srgb,var(--color-foreground)_14%,var(--color-card))]`
}

/** Unguarded, as in the original: only the brand spin, the sparkle pulse and
 *  the node success/failure flashes sit behind `prefers-reduced-motion`. */
const ICON_ENTER =
    "animate-[effect-example-icon-enter_180ms_cubic-bezier(0.34,1.56,0.64,1)]"

/** The star keeps turning while the effect runs, as upstream's does. */
const ICON_ENTER_SPIN =
    "animate-[effect-example-icon-enter_180ms_cubic-bezier(0.34,1.56,0.64,1),effect-example-icon-spin_1600ms_linear_180ms_infinite]"

/** The entrance only replays if the element is replaced, so the view keys this
 *  span on the icon name. A class change alone would not restart the keyframe:
 *  the element keeps the animation class throughout, and snabbdom patches it in
 *  place. */
export const card_icon_slot = (name: string, phase: string): string =>
    `inline-flex items-center justify-center ${
        name === "star" && phase === "running" ? ICON_ENTER_SPIN : ICON_ENTER
    }`

export const CARD_ICON_GLYPH = "size-5"

/** The sparkle is painted by masking `currentcolor` with an inline SVG. The
 *  mask stays in CSS: Tailwind leaves `_` separators literal inside `url()`, so
 *  an arbitrary-property version emits a corrupt data URI and paints nothing.
 *  `effect-example-sparkle` carries only that one declaration. */
const SPARKLE = "effect-example-sparkle block size-6 bg-current"

export const sparkle = (phase: string): string =>
    phase === "running"
        ? `${SPARKLE} motion-safe:animate-[effect-example-sparkle-pulse_900ms_ease-in-out_infinite]`
        : SPARKLE

export const CODE = "px-4 pt-5"

/** Must not wrap: the highlight box is one rect per source line, so a wrapped
 *  line would put it in the wrong place. Scroll instead. */
export const CODE_BLOCK =
    "relative m-0 overflow-x-auto border-t border-border bg-muted px-4 py-[1.15rem] text-[0.95rem]/[1.6rem] whitespace-pre text-foreground"

export const CODE_LINE = "block h-[1.6rem] min-w-max leading-[1.6rem]"

/** Scale and opacity come from the spring in the Model, not from CSS: an ease
 *  cannot overshoot, and the original demonstrably does. */
export const CODE_HIGHLIGHT =
    "pointer-events-none absolute top-0 left-0 z-10 rounded-md border border-[color-mix(in_srgb,var(--color-primary)_60%,transparent)] " +
    "bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] shadow-[0_0_10px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] " +
    "[will-change:transform,filter,opacity]"

export const NOTIFICATION =
    "pointer-events-none absolute top-[-12px] left-1/2 z-10 -translate-x-1/2 -translate-y-full"

const NOTIFICATION_BUBBLE =
    "relative block max-w-[220px] rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap " +
    "motion-safe:animate-[effect-example-notification-enter_160ms_ease-out_both]"

/** The failure and death variants shake. The source builds that shake from six
 *  randomised keyframes; CSS cannot randomise, so this is a fixed approximation. */
const SHAKE =
    "motion-safe:animate-[effect-example-notification-enter_160ms_ease-out_both,effect-example-notification-shake_420ms_ease-in-out_120ms_both]"

export const notification_bubble = (variant: string): string => {
    if (variant === "failure")
        return `${NOTIFICATION_BUBBLE} ${SHAKE} bg-[var(--ve-failed)] text-destructive-foreground shadow-[0_10px_30px_color-mix(in_srgb,var(--color-foreground)_22%,transparent),0_4px_16px_color-mix(in_srgb,var(--ve-failed)_35%,transparent)]`
    // Death inverts the surface in every theme — near-foreground ground, red
    // text — rather than being flatly black, which only reads on a dark theme.
    if (variant === "death")
        return `${NOTIFICATION_BUBBLE} ${SHAKE} bg-[color-mix(in_srgb,var(--color-foreground)_95%,var(--color-background))] text-[var(--ve-failed)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ve-failed)_55%,transparent),0_10px_30px_color-mix(in_srgb,var(--color-foreground)_28%,transparent),0_4px_16px_color-mix(in_srgb,var(--ve-failed)_18%,transparent)]`
    return `${NOTIFICATION_BUBBLE} bg-[var(--ve-info)] text-primary-foreground shadow-[0_10px_30px_color-mix(in_srgb,var(--color-foreground)_22%,transparent),0_4px_16px_color-mix(in_srgb,var(--ve-info)_35%,transparent)]`
}

export const NOTIFICATION_ARROW =
    "absolute top-full left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-inherit"

export const notification_text = (variant: string): string =>
    variant === "death"
        ? "inline-block font-bold tracking-[0.08em] uppercase"
        : ""

export const STAGE =
    "flex flex-wrap items-start justify-start gap-6 border-b border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] p-6"

export const CONTROLS = "mt-6 flex flex-wrap items-center gap-3"

export const CONTROLS_LABEL =
    "font-mono text-[0.72rem] tracking-[0.12em] text-muted-foreground"

export const CONTROL_OPTIONS =
    "flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1"

const CONTROL_OPTION =
    "rounded-[0.35rem] px-[0.7rem] py-[0.45rem] font-mono text-[0.72rem] text-muted-foreground"

export const control_option = (is_active: boolean): string =>
    is_active
        ? `${CONTROL_OPTION} bg-background font-semibold text-foreground`
        : CONTROL_OPTION

export const RESULT_EMOJI = "text-2xl/none"
export const RESULT_PRIMITIVE = "text-xl"
export const RESULT_TEMPERATURE = "text-2xl tabular-nums"
export const RESULT_TEMPERATURE_LIST = "inline-flex gap-[0.1rem] text-[1.1rem]"
/** Inside the list the size comes from the list, not the item. */
export const RESULT_TEMPERATURE_IN_LIST = "tabular-nums"

const REF_PANEL =
    "mt-6 inline-flex items-stretch self-start rounded-lg border border-border bg-muted transition-[border-color,background-color]"

/** `just_changed` is set by the Model and cleared on its own timer, so the flash
 *  is a class swap with a transition rather than a keyframe — it can retrigger
 *  on every update without restarting awkwardly. */
export const ref_panel = (just_changed: boolean): string =>
    just_changed
        ? `${REF_PANEL} duration-100 border-primary bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]`
        : `${REF_PANEL} duration-300`

export const REF_PANEL_NAME = "px-4 py-2 text-[0.85rem] text-muted-foreground"
export const REF_PANEL_SEPARATOR = "w-px bg-border"
export const REF_PANEL_VALUE =
    "px-4 py-2 font-mono font-semibold tabular-nums text-foreground"

const SCOPE_PANEL =
    "mx-4 mt-5 rounded-xl border border-dashed border-border p-3 transition-opacity duration-300"

export const scope_panel = (state: string): string =>
    state === "idle" ? `${SCOPE_PANEL} opacity-45` : SCOPE_PANEL

export const SCOPE_PANEL_HEADING =
    "mb-2 flex items-center justify-between font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground"

export const SCOPE_PANEL_STATE = "text-foreground"

export const SCOPE_PANEL_LANES =
    "grid min-h-[3.25rem] grid-cols-[1fr_auto_1fr] items-center gap-2"

export const SCOPE_LANE = "flex flex-wrap gap-[0.4rem]"
export const SCOPE_LANE_CENTRE = `${SCOPE_LANE} justify-center`
export const SCOPE_LANE_END = `${SCOPE_LANE} justify-end`

const FINALIZER_CARD =
    "inline-flex items-center gap-[0.6rem] rounded-lg border border-border bg-muted px-[0.8rem] py-[0.55rem] " +
    "font-mono text-[0.78rem] transition-[border-color,background-color,transform] duration-200"

export const finalizer_card = (state: string): string => {
    if (state === "running")
        return `${FINALIZER_CARD} scale-105 border-primary bg-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]`
    if (state === "completed")
        return `${FINALIZER_CARD} opacity-75 border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)]`
    return FINALIZER_CARD
}

const FINALIZER_CHECK =
    "inline-flex size-[1.15rem] items-center justify-center rounded border border-border text-[0.7rem]"

export const finalizer_check = (state: string): string =>
    state === "completed"
        ? `${FINALIZER_CHECK} border-primary bg-primary text-primary-foreground`
        : FINALIZER_CHECK

export const STEP = "flex flex-col items-center gap-2"

const STEP_NODE =
    "grid size-14 place-items-center rounded-lg border border-border bg-[var(--ve-node-fill)] " +
    "font-mono text-2xl/none font-semibold text-primary-foreground transition-[border-color,background] duration-[160ms]"

export const step_node = (phase: string): string => {
    if (phase === "running")
        return `${STEP_NODE} border-[var(--ve-running-edge)] [--ve-node-fill:var(--ve-running)]`
    if (phase === "succeeded")
        return `${STEP_NODE} border-[var(--ve-succeeded-edge)] [--ve-node-fill:var(--ve-succeeded)]`
    if (phase === "failed")
        return `${STEP_NODE} [--ve-node-fill:var(--ve-failed)]`
    if (phase === "died") return `${STEP_NODE} [--ve-node-fill:var(--ve-died)]`
    if (phase === "interrupted")
        return `${STEP_NODE} [--ve-node-fill:var(--ve-interrupted)]`
    return `${STEP_NODE} [--ve-node-fill:color-mix(in_srgb,var(--color-foreground)_14%,var(--color-card))]`
}

export const STEP_ARROW =
    "grid h-14 place-items-center text-2xl text-muted-foreground"

export const NODE_SLOT = "relative inline-flex flex-col items-center gap-2"

/** The node shrinks to a pill mid-run, so it needs a fixed-height band to stay
 *  centred in. */
export const NODE_FRAME = "relative flex h-14 items-center justify-center"

/** `transform` is excluded from the transition on purpose — the spring writes it
 *  every frame and a transition would smear the physics. */
const NODE =
    "relative flex h-14 w-max min-w-14 cursor-pointer items-center justify-center overflow-hidden rounded-lg " +
    "border border-[color-mix(in_srgb,var(--color-foreground)_20%,transparent)] bg-[var(--ve-node-fill)] px-3 " +
    "[font-family:inherit] text-xl font-semibold text-primary-foreground " +
    "shadow-[0_2px_4px_color-mix(in_srgb,var(--color-foreground)_22%,transparent)] " +
    "[contain:layout_style_paint] [will-change:transform,filter] " +
    "transition-[width,height,border-radius,background-color,opacity] duration-400 ease-out"

const NODE_FILL: Readonly<Record<string, string>> = {
    running: "[--ve-node-fill:var(--ve-running)]",
    succeeded: "[--ve-node-fill:var(--ve-succeeded)]",
    failed: "[--ve-node-fill:var(--ve-failed)]",
    died: "[--ve-node-fill:var(--ve-died)]",
    interrupted: "[--ve-node-fill:var(--ve-interrupted)]",
    idle: "[--ve-node-fill:color-mix(in_srgb,var(--color-foreground)_14%,var(--color-card))]",
}

export const node = (phase: string): string => {
    const fill = NODE_FILL[phase] ?? NODE_FILL["idle"]
    if (phase === "running")
        return `${NODE} ${fill} w-14 h-[22.4px] rounded-[15px] shadow-[0_2px_4px_color-mix(in_srgb,var(--color-foreground)_22%,transparent),0_0_20px_color-mix(in_srgb,var(--ve-running-edge)_30%,transparent)]`
    if (phase === "succeeded")
        return `${NODE} ${fill} motion-safe:animate-[effect-example-success_260ms_ease-out]`
    if (phase === "failed" || phase === "died")
        return `${NODE} ${fill} motion-safe:animate-[effect-example-failure_220ms_ease-in-out]`
    return `${NODE} ${fill}`
}

/** A layer at `mix-blend-mode: overlay`, flashed on each state change; fully
 *  transparent at rest. */
export const NODE_FLASH =
    "pointer-events-none absolute inset-0 rounded-[inherit] bg-[color-mix(in_srgb,var(--color-foreground)_80%,transparent)] " +
    "opacity-0 mix-blend-overlay transition-opacity duration-[180ms] ease-out"

export const NODE_VALUE =
    "relative text-xl font-semibold whitespace-nowrap text-primary-foreground [will-change:opacity,filter]"

export const NODE_LABEL = "text-[0.7rem] text-muted-foreground"

export const TIMELINE = "border border-t-0 border-border bg-muted p-5"

export const TIMELINE_TITLE =
    "m-0 text-[0.7rem] tracking-[0.12em] text-muted-foreground"

export const TIMELINE_TRACK =
    "relative mt-6 grid auto-cols-[minmax(2rem,1fr)] grid-flow-col overflow-x-auto " +
    "before:absolute before:top-[0.35rem] before:right-0 before:left-0 before:h-px before:bg-border before:content-['']"

const TIMELINE_PROGRESS =
    "absolute top-[0.35rem] left-0 h-px bg-[var(--ve-running-edge)] transition-[width] duration-[240ms] ease-out"

export const timeline_progress = (phase: string): string => {
    if (phase === "running") return `${TIMELINE_PROGRESS} w-[55%]`
    if (phase === "succeeded")
        return `${TIMELINE_PROGRESS} w-full bg-[var(--ve-succeeded-edge)]`
    if (phase === "failed" || phase === "interrupted")
        return `${TIMELINE_PROGRESS} w-[55%] bg-[var(--ve-failed)]`
    return `${TIMELINE_PROGRESS} w-0`
}

export const TIMELINE_STEP =
    "z-[1] flex flex-col gap-2 text-[0.7rem] text-muted-foreground"

const TIMELINE_DOT = "size-3 rounded-full border-2 border-border bg-muted"

export const timeline_dot = (phase: string, is_first: boolean): string => {
    if (phase === "succeeded")
        return `${TIMELINE_DOT} border-[var(--ve-succeeded-edge)]`
    if (phase === "running" && is_first)
        return `${TIMELINE_DOT} border-[var(--ve-running-edge)]`
    return TIMELINE_DOT
}
