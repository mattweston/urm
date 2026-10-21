import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    BASIC_DURATION_MS,
    ClickedPlayBasicQueue,
    ClickedPlayLockQueue,
    ClickedPlayManyQueue,
    ClickedPlayRetryQueue,
    ClickedRestartBasicQueue,
    ClickedRestartLockQueue,
    ClickedRestartManyQueue,
    ClickedRestartRetryQueue,
    LOCK_DURATION_MS,
    MANY_DURATION_MS,
    RETRY_DURATION_MS,
    basic_frame,
    is_complete,
    lock_frame,
    many_frame,
    retry_frame,
    type ManyJobPhase,
    type Message,
    type Model,
} from "./persisted-queue.ts"

/** Shared class strings for the four queue demos.
 *
 *  Every colour here is a theme token, so all named themes repaint the demos;
 *  nothing is a literal colour. The class strings are spelled out in full
 *  rather than assembled, because Tailwind scans this file as source text and
 *  never sees a class that was built at runtime.
 */
const DEMO_CLASS =
    "overflow-hidden rounded-[0.9rem] border border-border bg-card text-card-foreground"

const HEADER_CLASS =
    "flex items-center justify-between gap-4 border-b border-border px-[1.1rem] py-4"

const EYEBROW_CLASS =
    "font-mono text-[0.68rem] tracking-[0.12em] text-muted-foreground uppercase"

const TITLE_CLASS = "mt-[0.2rem] text-base"

const BADGE_CLASS =
    "rounded-full border border-border px-2 py-[0.3rem] font-mono text-[0.68rem] tracking-[0.12em] uppercase"

/** The dotted grid every scene sits on. */
const SCENE_CLASS =
    "relative overflow-hidden bg-[linear-gradient(color-mix(in_oklab,currentColor_7%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,currentColor_7%,transparent)_1px,transparent_1px)] bg-size-[24px_24px]"

const BASIC_SCENE_CLASS =
    "grid min-h-[26rem] grid-cols-1 items-center gap-4 px-[1.2rem] py-[2.4rem] sm:min-h-60 sm:grid-cols-3"

/** Three-column scene shared by the lock and retry demos. */
const SPLIT_SCENE_CLASS =
    "grid grid-cols-1 items-center gap-4 px-[1.2rem] py-[1.2rem] sm:grid-cols-[minmax(0,1fr)_minmax(7rem,0.75fr)_minmax(0,1fr)] sm:py-[2.2rem]"

const CARD_CLASS =
    "grid place-items-center gap-1 min-h-[5.2rem] p-[0.8rem] rounded-xl border border-border bg-muted text-center transition-[border-color,box-shadow,opacity,transform] duration-[260ms] ease-out"

const CARD_ACTIVE_CLASS =
    "border-success/70 shadow-[0_0_0_3px_--alpha(var(--color-success)/14%)]"

const METRICS_CLASS =
    "flex items-stretch border-y border-border sm:items-center"

const METRIC_CLASS =
    "grid flex-1 min-w-0 gap-[0.2rem] px-4 py-[0.72rem] border-l border-border first:border-l-0"

const NOTE_CLASS =
    "min-h-[3.6rem] m-0 px-[1.05rem] py-[0.9rem] text-[0.82rem] leading-relaxed text-muted-foreground"

const CONTROLS_CLASS =
    "grid grid-cols-2 justify-end border-t border-border sm:flex"

const BUTTON_CLASS =
    "min-w-0 border-l border-border px-4 py-[0.8rem] text-inherit cursor-pointer transition-[background-color,opacity] duration-150 hover:not-disabled:bg-accent disabled:cursor-default disabled:opacity-[0.38] sm:min-w-[7.5rem]"

/** The travelling job token in the basic demo. Hidden on narrow screens, where
 *  the three nodes stack and there is no horizontal track to travel along. */
const BASIC_TOKEN_CLASS =
    "absolute top-[calc(50%-1rem)] z-[3] hidden w-[3.8rem] h-8 -translate-x-1/2 place-items-center rounded-full bg-warning text-warning-foreground font-mono text-[0.72rem] font-bold leading-none shadow-[0_8px_26px_oklch(0_0_0/22%)] transition-[left,opacity,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:grid"

const BASIC_TOKEN_PHASE: Readonly<Record<string, string>> = {
    idle: "left-[10%] opacity-0",
    upload: "left-[16.66%]",
    queue: "left-[50%]",
    worker: "left-[83.33%]",
    complete: "left-[83.33%] bg-success",
}

const MANY_SCENE_CLASS = "min-h-[21rem]"

const MANY_LABEL_CLASS =
    "absolute left-4 font-mono text-[0.62rem] font-bold leading-none tracking-[0.12em] text-muted-foreground"

const MANY_BOX_CLASS =
    "absolute grid place-items-center border border-border bg-muted font-mono text-[0.75rem] font-bold leading-none"

const MANY_API_CLASS = "top-[2.15rem] w-[3.4rem] h-12 rounded-[0.65rem]"

const MANY_QUEUE_CLASS =
    "top-[9.15rem] left-[22%] right-[22%] h-[3.4rem] rounded-full"

const MANY_WORKER_CLASS =
    "bottom-[2.2rem] w-[3.8rem] h-12 rounded-[0.65rem] opacity-[0.28] transition-[opacity,border-color,box-shadow] duration-300"

const MANY_WORKER_ONLINE_CLASS =
    "opacity-100 border-success/60 shadow-[0_0_0_3px_--alpha(var(--color-success)/10%)]"

const MANY_JOB_CLASS =
    "absolute z-[4] grid w-[1.55rem] h-[1.55rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-warning text-warning-foreground font-mono text-[0.66rem] font-extrabold leading-none shadow-[0_5px_14px_oklch(0_0_0/20%)] transition-[left,top,opacity,background-color] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"

/** Where each of the six jobs sits at each stage. The producer and worker
 *  columns line up under the three replicas; the queue fans them out so the
 *  backlog reads left to right. */
const MANY_JOB_LANE: ReadonlyArray<
    Readonly<{ producer: string; queue: string; worker: string }>
> = [
    { producer: "left-[20%]", queue: "left-[30%]", worker: "left-[20%]" },
    { producer: "left-[50%]", queue: "left-[38%]", worker: "left-[50%]" },
    { producer: "left-[80%]", queue: "left-[46%]", worker: "left-[80%]" },
    { producer: "left-[20%]", queue: "left-[54%]", worker: "left-[20%]" },
    { producer: "left-[50%]", queue: "left-[62%]", worker: "left-[50%]" },
    { producer: "left-[80%]", queue: "left-[70%]", worker: "left-[80%]" },
]

const many_job_class = (phase: ManyJobPhase, index: number): string => {
    const lane = MANY_JOB_LANE[index] ?? MANY_JOB_LANE[0]
    if (lane === undefined) return MANY_JOB_CLASS
    if (phase === "hidden")
        return `${MANY_JOB_CLASS} ${lane.producer} opacity-0`
    if (phase === "producer")
        return `${MANY_JOB_CLASS} ${lane.producer} top-[3.65rem]`
    if (phase === "queue")
        return `${MANY_JOB_CLASS} ${lane.queue} top-[10.85rem]`
    if (phase === "worker")
        return `${MANY_JOB_CLASS} ${lane.worker} top-[17.2rem]`
    return `${MANY_JOB_CLASS} ${lane.worker} top-[18.8rem] opacity-0 bg-success`
}

/** A worker that is offline or has failed is dimmed and outlined rather than
 *  filled, so a stalled worker reads differently from an idle one. */
const worker_card_class = (status: string): string => {
    if (status === "processing") return `${CARD_CLASS} ${CARD_ACTIVE_CLASS}`
    if (status === "done") return `${CARD_CLASS} border-success/65`
    if (status === "failed")
        return `${CARD_CLASS} opacity-[0.48] border-dashed border-destructive/65`
    if (status === "offline")
        return `${CARD_CLASS} opacity-[0.48] border-dashed`
    return CARD_CLASS
}

const MUTED_CLASS = "text-muted-foreground"

const status_label = (
    model: Model,
    key: "basic" | "many" | "lock" | "retry",
    duration_ms: number
): string => {
    const playback = model[key]
    if (!playback.has_started) return "READY"
    if (is_complete(playback, duration_ms)) return "COMPLETE"
    return playback.is_running ? "PLAYING" : "PAUSED"
}

const button = <ParentMessage>(
    label: string,
    message: Message,
    is_disabled: boolean,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [...attributes.button, h.Class(BUTTON_CLASS)],
                    [label]
                ),
        },
        h
    )

const controls = <ParentMessage>(
    config: Readonly<{
        is_running: boolean
        play: Message
        restart: Message
    }>,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class(CONTROLS_CLASS)],
        [
            button("↻ Restart", config.restart, false, to_parent_message, h),
            button(
                "▷ Play",
                config.play,
                config.is_running,
                to_parent_message,
                h
            ),
        ]
    )

const badge = <ParentMessage>(
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html => h.span([h.Class(BADGE_CLASS)], [value])

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class(METRIC_CLASS)],
        [
            h.span([h.Class(`${EYEBROW_CLASS} truncate`)], [label]),
            h.strong([h.Class("truncate text-[0.88rem]")], [value]),
        ]
    )

const demo = <ParentMessage>(
    config: Readonly<{
        eyebrow: string
        title: string
        status: string
        scene: Html
        metrics: ReadonlyArray<Html>
        note: string
        controls: Html
    }>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(DEMO_CLASS)],
        [
            h.header(
                [h.Class(HEADER_CLASS)],
                [
                    h.div(
                        [],
                        [
                            h.div([h.Class(EYEBROW_CLASS)], [config.eyebrow]),
                            h.h3([h.Class(TITLE_CLASS)], [config.title]),
                        ]
                    ),
                    badge(config.status, h),
                ]
            ),
            config.scene,
            h.div([h.Class(METRICS_CLASS)], config.metrics),
            h.p([h.Class(NOTE_CLASS)], [config.note]),
            config.controls,
        ]
    )

const basic_scene = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const frame = basic_frame(model)
    return h.div(
        [h.Class(`${SCENE_CLASS} ${BASIC_SCENE_CLASS}`)],
        [
            h.div(
                [h.Class(CARD_CLASS)],
                [
                    h.strong([], ["UPLOAD"]),
                    h.span([h.Class(MUTED_CLASS)], ["API"]),
                ]
            ),
            h.div(
                [h.Class(CARD_CLASS)],
                [
                    h.strong([], ["QUEUE"]),
                    h.span(
                        [h.Class(MUTED_CLASS)],
                        [`${frame.queue_depth} job`]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        frame.worker_status === "processing"
                            ? `${CARD_CLASS} ${CARD_ACTIVE_CLASS}`
                            : CARD_CLASS
                    ),
                ],
                [
                    h.strong([], ["WORKER"]),
                    h.span([h.Class(MUTED_CLASS)], [frame.worker_status]),
                ]
            ),
            h.div(
                [
                    h.Class(
                        `${BASIC_TOKEN_CLASS} ${BASIC_TOKEN_PHASE[frame.phase] ?? ""}`
                    ),
                ],
                ["#041"]
            ),
        ]
    )
}

const many_scene = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const frame = many_frame(model)
    const token = (phase: ManyJobPhase, index: number): Html =>
        h.div([h.Class(many_job_class(phase, index))], [`${index + 1}`])

    return h.div(
        [h.Class(`${SCENE_CLASS} ${MANY_SCENE_CLASS}`)],
        [
            h.div([h.Class(`${MANY_LABEL_CLASS} top-4`)], ["API REPLICAS"]),
            h.div(
                [h.Class(`${MANY_LABEL_CLASS} top-[8.1rem]`)],
                ["SHARED QUEUE"]
            ),
            h.div([h.Class(`${MANY_LABEL_CLASS} bottom-4`)], ["WORKERS"]),
            h.div(
                [
                    h.Class(
                        `${MANY_BOX_CLASS} ${MANY_API_CLASS} left-[10%] sm:left-[18%]`
                    ),
                ],
                ["A"]
            ),
            h.div(
                [
                    h.Class(
                        `${MANY_BOX_CLASS} ${MANY_API_CLASS} left-[calc(50%-1.7rem)]`
                    ),
                ],
                ["B"]
            ),
            h.div(
                [
                    h.Class(
                        `${MANY_BOX_CLASS} ${MANY_API_CLASS} right-[10%] sm:right-[18%]`
                    ),
                ],
                ["C"]
            ),
            h.div(
                [h.Class(`${MANY_BOX_CLASS} ${MANY_QUEUE_CLASS}`)],
                [`${frame.queue_depth} queued`]
            ),
            h.div(
                [
                    h.Class(
                        `${MANY_BOX_CLASS} ${MANY_WORKER_CLASS} left-[10%] sm:left-[18%] ${frame.workers_online >= 1 ? MANY_WORKER_ONLINE_CLASS : ""}`
                    ),
                ],
                ["W1"]
            ),
            h.div(
                [
                    h.Class(
                        `${MANY_BOX_CLASS} ${MANY_WORKER_CLASS} left-[calc(50%-1.9rem)] ${frame.workers_online >= 2 ? MANY_WORKER_ONLINE_CLASS : ""}`
                    ),
                ],
                ["W2"]
            ),
            h.div(
                [
                    h.Class(
                        `${MANY_BOX_CLASS} ${MANY_WORKER_CLASS} right-[10%] sm:right-[18%] ${frame.workers_online >= 3 ? MANY_WORKER_ONLINE_CLASS : ""}`
                    ),
                ],
                ["W3"]
            ),
            ...frame.job_phases.map(token),
        ]
    )
}

const lock_scene = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const frame = lock_frame(model)
    const remaining = Math.max(0, frame.lock_remaining_ms / 1_000).toFixed(1)

    return h.div(
        [h.Class(`${SCENE_CLASS} ${SPLIT_SCENE_CLASS}`)],
        [
            h.div(
                [h.Class(worker_card_class(frame.worker_1))],
                [
                    h.strong([], ["WORKER 1"]),
                    h.span([h.Class(MUTED_CLASS)], [frame.worker_1]),
                ]
            ),
            h.div(
                [
                    h.Class(
                        frame.owner === "none"
                            ? `${CARD_CLASS} border-success/65 shadow-[0_0_0_3px_--alpha(var(--color-success)/10%)]`
                            : `${CARD_CLASS} border-warning/65 shadow-[0_0_0_3px_--alpha(var(--color-warning)/10%)]`
                    ),
                ],
                [
                    h.strong(
                        [],
                        [frame.owner === "none" ? "UNLOCKED" : "LOCKED"]
                    ),
                    h.span(
                        [h.Class(MUTED_CLASS)],
                        [frame.owner === "none" ? "available" : `${remaining}s`]
                    ),
                    h.small(
                        [h.Class(MUTED_CLASS)],
                        [frame.owner.replace("worker-", "worker ")]
                    ),
                ]
            ),
            h.div(
                [h.Class(worker_card_class(frame.worker_2))],
                [
                    h.strong([], ["WORKER 2"]),
                    h.span([h.Class(MUTED_CLASS)], [frame.worker_2]),
                ]
            ),
        ]
    )
}

const retry_scene = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const frame = retry_frame(model)
    const remaining = Math.max(0, frame.retry_remaining_ms / 1_000).toFixed(1)

    return h.div(
        [h.Class(`${SCENE_CLASS} ${SPLIT_SCENE_CLASS}`)],
        [
            h.div(
                [h.Class(worker_card_class(frame.worker_1))],
                [
                    h.strong([], ["WORKER 1"]),
                    h.span([h.Class(MUTED_CLASS)], [frame.worker_1]),
                ]
            ),
            h.div(
                [
                    h.Class(
                        frame.queue_status === "retry-delay"
                            ? `${CARD_CLASS} border-warning/65 shadow-[0_0_0_3px_--alpha(var(--color-warning)/10%)]`
                            : frame.queue_status === "complete"
                              ? `${CARD_CLASS} border-success/65`
                              : CARD_CLASS
                    ),
                ],
                [
                    h.strong([], ["POST #041"]),
                    h.span(
                        [h.Class(MUTED_CLASS)],
                        [
                            frame.attempt === 0
                                ? "waiting"
                                : `attempt ${frame.attempt}`,
                        ]
                    ),
                    h.small(
                        [h.Class(MUTED_CLASS)],
                        [
                            frame.queue_status === "retry-delay"
                                ? `retry in ${remaining}s`
                                : frame.queue_status,
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(worker_card_class(frame.worker_2))],
                [
                    h.strong([], ["WORKER 2"]),
                    h.span([h.Class(MUTED_CLASS)], [frame.worker_2]),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const basic = basic_frame(model)
    const many = many_frame(model)
    const lock = lock_frame(model)
    const retry = retry_frame(model)

    return h.div(
        [h.Class("grid gap-5")],
        [
            demo(
                {
                    eyebrow: "UPLOAD → QUEUE → WORKER",
                    title: "LinkedIn De-Slopper",
                    status: status_label(model, "basic", BASIC_DURATION_MS),
                    scene: basic_scene(model, h),
                    metrics: [
                        metric("queue", `${basic.queue_depth}`, h),
                        metric("worker", basic.worker_status, h),
                    ],
                    note: "The API can return as soon as the job is persisted; the worker consumes it independently.",
                    controls: controls(
                        {
                            is_running: model.basic.is_running,
                            play: ClickedPlayBasicQueue(),
                            restart: ClickedRestartBasicQueue(),
                        },
                        to_parent_message,
                        h
                    ),
                },
                h
            ),
            demo(
                {
                    eyebrow: "MANY-TO-MANY",
                    title: "Shared Persisted Queue",
                    status: status_label(model, "many", MANY_DURATION_MS),
                    scene: many_scene(model, h),
                    metrics: [
                        metric("queued", `${many.queue_depth}`, h),
                        metric("workers", `${many.workers_online}`, h),
                        metric("processed", `${many.processed}/6`, h),
                    ],
                    note: "Three API replicas feed the same durable queue; extra workers appear as the backlog grows.",
                    controls: controls(
                        {
                            is_running: model.many.is_running,
                            play: ClickedPlayManyQueue(),
                            restart: ClickedRestartManyQueue(),
                        },
                        to_parent_message,
                        h
                    ),
                },
                h
            ),
            demo(
                {
                    eyebrow: "LOCK",
                    title: "Claim, Refresh, Expire, Reclaim",
                    status: status_label(model, "lock", LOCK_DURATION_MS),
                    scene: lock_scene(model, h),
                    metrics: [
                        metric("owner", lock.owner, h),
                        metric("refreshes", `${lock.refresh_count}`, h),
                    ],
                    note: lock.note,
                    controls: controls(
                        {
                            is_running: model.lock.is_running,
                            play: ClickedPlayLockQueue(),
                            restart: ClickedRestartLockQueue(),
                        },
                        to_parent_message,
                        h
                    ),
                },
                h
            ),
            demo(
                {
                    eyebrow: "FAILURE & RETRY",
                    title: "Five-Second Retry Delay",
                    status: status_label(model, "retry", RETRY_DURATION_MS),
                    scene: retry_scene(model, h),
                    metrics: [
                        metric("attempt", `${retry.attempt || "—"}`, h),
                        metric("queue", retry.queue_status, h),
                    ],
                    note: retry.note,
                    controls: controls(
                        {
                            is_running: model.retry.is_running,
                            play: ClickedPlayRetryQueue(),
                            restart: ClickedRestartRetryQueue(),
                        },
                        to_parent_message,
                        h
                    ),
                },
                h
            ),
        ]
    )
}
