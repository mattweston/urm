import {
    Clock,
    Duration,
    Effect,
    Match as M,
    Schema as S,
    Stream,
} from "effect"
import { Subscription, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

const TICK_INTERVAL_MS = 50

export const BASIC_DURATION_MS = 7_000
export const MANY_DURATION_MS = 10_500
export const LOCK_DURATION_MS = 16_000
export const RETRY_DURATION_MS = 13_500

export const Playback = S.Struct({
    has_started: S.Boolean,
    is_running: S.Boolean,
    started_at_ms: S.Number,
    now_ms: S.Number,
})
export type Playback = typeof Playback.Type

export const Model = S.Struct({
    basic: Playback,
    many: Playback,
    lock: Playback,
    retry: Playback,
})
export type Model = typeof Model.Type

export const ClickedPlayBasicQueue = taggedStruct("ClickedPlayBasicQueue")
export const ClickedRestartBasicQueue = taggedStruct("ClickedRestartBasicQueue")
export const ClickedPlayManyQueue = taggedStruct("ClickedPlayManyQueue")
export const ClickedRestartManyQueue = taggedStruct("ClickedRestartManyQueue")
export const ClickedPlayLockQueue = taggedStruct("ClickedPlayLockQueue")
export const ClickedRestartLockQueue = taggedStruct("ClickedRestartLockQueue")
export const ClickedPlayRetryQueue = taggedStruct("ClickedPlayRetryQueue")
export const ClickedRestartRetryQueue = taggedStruct("ClickedRestartRetryQueue")
export const TickedPersistedQueue = taggedStruct("TickedPersistedQueue", {
    now_ms: S.Number,
})

export const Message = S.Union([
    ClickedPlayBasicQueue,
    ClickedRestartBasicQueue,
    ClickedPlayManyQueue,
    ClickedRestartManyQueue,
    ClickedPlayLockQueue,
    ClickedRestartLockQueue,
    ClickedPlayRetryQueue,
    ClickedRestartRetryQueue,
    TickedPersistedQueue,
])
export type Message = typeof Message.Type

const idle_playback = (): Playback =>
    Playback.make({
        has_started: false,
        is_running: false,
        started_at_ms: 0,
        now_ms: 0,
    })

export const init: Model = Model.make({
    basic: idle_playback(),
    many: idle_playback(),
    lock: idle_playback(),
    retry: idle_playback(),
})

const play = (playback: Playback): Playback =>
    playback.is_running
        ? playback
        : Playback.make({
              has_started: true,
              is_running: true,
              started_at_ms: 0,
              now_ms: 0,
          })

const tick = (
    playback: Playback,
    now_ms: number,
    duration_ms: number
): Playback => {
    if (!playback.is_running) return playback

    if (playback.started_at_ms === 0) {
        return Playback.make({
            ...playback,
            started_at_ms: now_ms,
            now_ms,
        })
    }

    const completed_at_ms = playback.started_at_ms + duration_ms
    const is_complete = now_ms >= completed_at_ms

    return Playback.make({
        ...playback,
        is_running: !is_complete,
        now_ms: is_complete ? completed_at_ms : now_ms,
    })
}

export const elapsed_ms = (playback: Playback): number =>
    playback.started_at_ms === 0
        ? 0
        : Math.max(0, playback.now_ms - playback.started_at_ms)

export const progress = (playback: Playback, duration_ms: number): number =>
    Math.min(1, elapsed_ms(playback) / duration_ms)

export const is_complete = (playback: Playback, duration_ms: number): boolean =>
    playback.has_started && progress(playback, duration_ms) >= 1

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedPlayBasicQueue: () => ({
                model: evo(model, { basic: play }),
                commands: [],
            }),
            ClickedRestartBasicQueue: () => ({
                model: evo(model, { basic: () => idle_playback() }),
                commands: [],
            }),
            ClickedPlayManyQueue: () => ({
                model: evo(model, { many: play }),
                commands: [],
            }),
            ClickedRestartManyQueue: () => ({
                model: evo(model, { many: () => idle_playback() }),
                commands: [],
            }),
            ClickedPlayLockQueue: () => ({
                model: evo(model, { lock: play }),
                commands: [],
            }),
            ClickedRestartLockQueue: () => ({
                model: evo(model, { lock: () => idle_playback() }),
                commands: [],
            }),
            ClickedPlayRetryQueue: () => ({
                model: evo(model, { retry: play }),
                commands: [],
            }),
            ClickedRestartRetryQueue: () => ({
                model: evo(model, { retry: () => idle_playback() }),
                commands: [],
            }),
            TickedPersistedQueue: ({ now_ms }) => ({
                model: evo(model, {
                    basic: (value) => tick(value, now_ms, BASIC_DURATION_MS),
                    many: (value) => tick(value, now_ms, MANY_DURATION_MS),
                    lock: (value) => tick(value, now_ms, LOCK_DURATION_MS),
                    retry: (value) => tick(value, now_ms, RETRY_DURATION_MS),
                }),
                commands: [],
            }),
        })
    )

const any_running = (model: Model): boolean =>
    model.basic.is_running ||
    model.many.is_running ||
    model.lock.is_running ||
    model.retry.is_running

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    persistedQueueClock: entry(
        { is_running: S.Boolean },
        {
            modelToDependencies: (model) => ({
                is_running: any_running(model),
            }),
            dependenciesToStream: ({ is_running }) =>
                Stream.when(
                    Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
                        Stream.mapEffect(() => Clock.currentTimeMillis),
                        Stream.map((now_ms) => TickedPersistedQueue({ now_ms }))
                    ),
                    Effect.sync(() => is_running)
                ),
        }
    ),
}))

export type BasicPhase = "idle" | "upload" | "queue" | "worker" | "complete"
export type BasicFrame = Readonly<{
    phase: BasicPhase
    queue_depth: number
    worker_status: "idle" | "processing" | "done"
}>

export const basic_frame = (model: Model): BasicFrame => {
    if (!model.basic.has_started) {
        return { phase: "idle", queue_depth: 0, worker_status: "idle" }
    }

    const elapsed = elapsed_ms(model.basic)
    if (elapsed < 1_400) {
        return { phase: "upload", queue_depth: 0, worker_status: "idle" }
    }
    if (elapsed < 3_350) {
        return { phase: "queue", queue_depth: 1, worker_status: "idle" }
    }
    if (elapsed < BASIC_DURATION_MS) {
        return { phase: "worker", queue_depth: 0, worker_status: "processing" }
    }
    return { phase: "complete", queue_depth: 0, worker_status: "done" }
}

export type ManyJobPhase = "hidden" | "producer" | "queue" | "worker" | "done"
export type ManyFrame = Readonly<{
    queue_depth: number
    workers_online: number
    processed: number
    job_phases: ReadonlyArray<ManyJobPhase>
}>

const many_job_phase = (elapsed: number, index: number): ManyJobPhase => {
    const local = elapsed - index * 650
    if (local < 0) return "hidden"
    if (local < 800) return "producer"
    if (local < 3_000) return "queue"
    if (local < 5_100) return "worker"
    return "done"
}

export const many_frame = (model: Model): ManyFrame => {
    if (!model.many.has_started) {
        return {
            queue_depth: 0,
            workers_online: 1,
            processed: 0,
            job_phases: [
                "hidden",
                "hidden",
                "hidden",
                "hidden",
                "hidden",
                "hidden",
            ],
        }
    }

    const elapsed = elapsed_ms(model.many)
    const job_phases = [0, 1, 2, 3, 4, 5].map((index) =>
        many_job_phase(elapsed, index)
    )

    return {
        queue_depth: job_phases.filter((phase) => phase === "queue").length,
        workers_online: elapsed < 3_500 ? 1 : elapsed < 5_300 ? 2 : 3,
        processed: job_phases.filter((phase) => phase === "done").length,
        job_phases,
    }
}

export type LockFrame = Readonly<{
    owner: "none" | "worker-1" | "worker-2"
    worker_1: "idle" | "processing" | "offline"
    worker_2: "polling" | "processing" | "done"
    lock_remaining_ms: number
    refresh_count: number
    note: string
}>

export const lock_frame = (model: Model): LockFrame => {
    if (!model.lock.has_started) {
        return {
            owner: "none",
            worker_1: "idle",
            worker_2: "polling",
            lock_remaining_ms: 0,
            refresh_count: 0,
            note: "Play to watch worker 1 claim and refresh the lock.",
        }
    }

    const elapsed = elapsed_ms(model.lock)

    if (elapsed < 2_000) {
        return {
            owner: "worker-1",
            worker_1: "processing",
            worker_2: "polling",
            lock_remaining_ms: 4_000 - elapsed,
            refresh_count: 0,
            note: "Worker 1 claimed post #041.",
        }
    }
    if (elapsed < 4_600) {
        return {
            owner: "worker-1",
            worker_1: "processing",
            worker_2: "polling",
            lock_remaining_ms: 6_000 - elapsed,
            refresh_count: 1,
            note: "A successful refresh reset the expiry countdown.",
        }
    }
    if (elapsed < 7_000) {
        return {
            owner: "worker-1",
            worker_1: "processing",
            worker_2: "polling",
            lock_remaining_ms: 8_600 - elapsed,
            refresh_count: 2,
            note: "Worker 1 keeps the lock alive while it is healthy.",
        }
    }
    if (elapsed < 8_600) {
        return {
            owner: "worker-1",
            worker_1: "offline",
            worker_2: "polling",
            lock_remaining_ms: 8_600 - elapsed,
            refresh_count: 2,
            note: "Worker 1 is offline, so lock refreshes have stopped.",
        }
    }
    if (elapsed < 10_300) {
        return {
            owner: "none",
            worker_1: "offline",
            worker_2: "polling",
            lock_remaining_ms: 0,
            refresh_count: 2,
            note: "The lock expired. Worker 2 can claim the job on a later poll.",
        }
    }
    if (elapsed < LOCK_DURATION_MS) {
        return {
            owner: "worker-2",
            worker_1: "offline",
            worker_2: "processing",
            lock_remaining_ms: Math.max(0, LOCK_DURATION_MS - elapsed),
            refresh_count: 2,
            note: "Worker 2 claimed the abandoned job and is processing it.",
        }
    }
    return {
        owner: "none",
        worker_1: "offline",
        worker_2: "done",
        lock_remaining_ms: 0,
        refresh_count: 2,
        note: "Worker 2 acknowledged completion and released the lock.",
    }
}

export type RetryFrame = Readonly<{
    attempt: 0 | 1 | 2
    worker_1: "idle" | "processing" | "failed"
    worker_2: "idle" | "waiting" | "processing" | "done"
    retry_remaining_ms: number
    queue_status: "ready" | "locked" | "retry-delay" | "complete"
    note: string
}>

export const retry_frame = (model: Model): RetryFrame => {
    if (!model.retry.has_started) {
        return {
            attempt: 0,
            worker_1: "idle",
            worker_2: "idle",
            retry_remaining_ms: 0,
            queue_status: "ready",
            note: "Play to watch attempt 1 fail and attempt 2 succeed.",
        }
    }

    const elapsed = elapsed_ms(model.retry)

    if (elapsed < 3_000) {
        return {
            attempt: 1,
            worker_1: "processing",
            worker_2: "idle",
            retry_remaining_ms: 0,
            queue_status: "locked",
            note: "Worker 1 is processing attempt 1.",
        }
    }
    if (elapsed < 8_000) {
        return {
            attempt: 1,
            worker_1: "failed",
            worker_2: "waiting",
            retry_remaining_ms: 8_000 - elapsed,
            queue_status: "retry-delay",
            note: "The handler failed. The lock is released, but retry is delayed for five seconds.",
        }
    }
    if (elapsed < RETRY_DURATION_MS) {
        return {
            attempt: 2,
            worker_1: "failed",
            worker_2: "processing",
            retry_remaining_ms: 0,
            queue_status: "locked",
            note: "The retry delay ended. Worker 2 claimed attempt 2.",
        }
    }
    return {
        attempt: 2,
        worker_1: "failed",
        worker_2: "done",
        retry_remaining_ms: 0,
        queue_status: "complete",
        note: "Attempt 2 succeeded and the job was acknowledged.",
    }
}
