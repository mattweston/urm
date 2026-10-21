import {
    Clock,
    Duration,
    Effect,
    Match as M,
    Schema as S,
    Stream,
} from "effect"
import { taggedStruct } from "foldkit/schema"

const TICK_INTERVAL_MS = 20
const FLASH_MS = 500

export const NotStarted = taggedStruct("FoldkitTimerNotStarted")
export const Running = taggedStruct("FoldkitTimerRunning", {
    started_at_ms: S.Number,
    now_ms: S.Number,
})
export const Settled = taggedStruct("FoldkitTimerSettled", {
    duration_ms: S.Number,
    completed_at_ms: S.Number,
    now_ms: S.Number,
})

export const Timer = S.Union([NotStarted, Running, Settled])
export type Timer = typeof Timer.Type

export const not_started: Timer = NotStarted()
export const start = (): Timer => Running({ started_at_ms: 0, now_ms: 0 })

export const tick = (timer: Timer, now_ms: number): Timer =>
    M.value(timer).pipe(
        M.withReturnType<Timer>(),
        M.tagsExhaustive({
            FoldkitTimerNotStarted: () => timer,
            FoldkitTimerRunning: ({ started_at_ms }) =>
                Running({
                    started_at_ms: started_at_ms === 0 ? now_ms : started_at_ms,
                    now_ms,
                }),
            FoldkitTimerSettled: ({ duration_ms, completed_at_ms }) =>
                Settled({ duration_ms, completed_at_ms, now_ms }),
        })
    )

export const settle = (timer: Timer): Timer =>
    M.value(timer).pipe(
        M.withReturnType<Timer>(),
        M.tagsExhaustive({
            FoldkitTimerNotStarted: () => timer,
            FoldkitTimerRunning: ({ started_at_ms, now_ms }) =>
                Settled({
                    duration_ms:
                        started_at_ms === 0 ? 0 : now_ms - started_at_ms,
                    completed_at_ms: now_ms,
                    now_ms,
                }),
            FoldkitTimerSettled: () => timer,
        })
    )

export const elapsed_ms = (timer: Timer): number =>
    M.value(timer).pipe(
        M.withReturnType<number>(),
        M.tagsExhaustive({
            FoldkitTimerNotStarted: () => 0,
            FoldkitTimerRunning: ({ started_at_ms, now_ms }) =>
                started_at_ms === 0 ? 0 : now_ms - started_at_ms,
            FoldkitTimerSettled: ({ duration_ms }) => duration_ms,
        })
    )

export const is_running = (timer: Timer): boolean =>
    timer._tag === "FoldkitTimerRunning"
export const just_completed = (timer: Timer): boolean =>
    timer._tag === "FoldkitTimerSettled" &&
    timer.now_ms - timer.completed_at_ms < FLASH_MS
export const is_ticking = (timer: Timer): boolean =>
    is_running(timer) || just_completed(timer)

export const tick_stream = <Message>(
    is_active: boolean,
    to_message: (now_ms: number) => Message
): Stream.Stream<Message> =>
    Stream.when(
        Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
            Stream.mapEffect(() => Clock.currentTimeMillis),
            Stream.map(to_message)
        ),
        Effect.sync(() => is_active)
    )
