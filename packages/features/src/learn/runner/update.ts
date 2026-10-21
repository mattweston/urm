import {
    Clock,
    Duration,
    Effect,
    Match as M,
    Option,
    Random,
    Ref,
    Schedule,
    Queue,
    Schema as S,
    Stream,
} from "effect"
import { Command, ManagedResource, Subscription, type Update } from "foldkit"
import { modifyFields } from "foldkit/struct"

import {
    next_sound_preference,
    AudioAvailable,
    AudioResource,
    AudioReleased,
    AudioRunDied,
    AudioRunFailed,
    AudioRunInterrupted,
    AudioRunReset,
    AudioRunStarted,
    AudioRunSucceeded,
    AudioStepFailed,
    AudioStepInterrupted,
    AudioStepRunning,
    AudioStepSucceeded,
    AudioControlChanged,
    AudioFinalizerCreated,
    AudioFinalizerFinished,
    AudioFinalizerRunning,
    AudioRefUpdated,
    AudioNotification,
    AudioUnavailable,
    acquire_audio,
    PlaySound,
    release_audio,
    type AudioService,
    type SoundCue,
} from "./audio.ts"
import { example_by_key, ExampleKey } from "./catalog.ts"
import {
    all_step_degrees,
    all_step_durations,
} from "./catalog/concurrency/effect-all.ts"
import { default_example_options, ExampleOptions } from "./catalog/options.ts"
import {
    ref_make_after_update,
    ref_make_attempts,
    ref_make_before_update,
    ref_make_gap,
    ref_make_result,
} from "./catalog/ref/ref-make.ts"
import {
    ref_update_and_get_durations,
    ref_update_and_get_result,
    ref_update_and_get_settle_lag,
} from "./catalog/ref/ref-update-and-get.ts"
import {
    add_finalizer_defect,
    add_finalizer_error,
    add_finalizer_register_at,
    add_finalizer_success,
    add_finalizer_work_duration,
} from "./catalog/scope/effect-add-finalizer.ts"
import {
    acquire_release_acquire_spans,
    acquire_release_result,
    acquire_release_work_duration,
} from "./catalog/scope/effect-acquire-release.ts"
import {
    race_step_durations,
    race_step_values,
} from "./catalog/concurrency/effect-race.ts"
import {
    race_all_step_durations,
    race_all_step_values,
} from "./catalog/concurrency/effect-race-all.ts"
import {
    for_each_step_degrees,
    for_each_step_durations,
} from "./catalog/concurrency/effect-for-each.ts"
import {
    retry_attempt_duration,
    retry_attempt_messages,
} from "./catalog/schedule/effect-retry-recurs.ts"
import {
    exponential_attempt_duration,
    exponential_attempt_messages,
} from "./catalog/schedule/effect-retry-exponential.ts"
import {
    repeat_spaced_attempt_duration,
    repeat_spaced_messages,
} from "./catalog/schedule/effect-repeat-spaced.ts"
import { repeat_while_durations } from "./catalog/schedule/effect-repeat-while.ts"
import {
    all_short_circuit_balance_value,
    all_short_circuit_durations,
    all_short_circuit_error,
} from "./catalog/error-handling/effect-all-short-circuit.ts"
import {
    or_else_durations,
    or_else_error,
    or_else_value,
} from "./catalog/error-handling/effect-or-else.ts"
import {
    first_success_of_durations,
    first_success_of_errors,
    first_success_of_value,
} from "./catalog/error-handling/effect-first-success-of.ts"
import {
    timeout_delivery_millis,
    timeout_error,
    timeout_limit_millis,
} from "./catalog/error-handling/effect-timeout.ts"
import {
    eventually_attempt_duration,
    eventually_attempt_messages,
    eventually_retry_gap_millis,
    eventually_value,
} from "./catalog/error-handling/effect-eventually.ts"
import {
    partition_durations,
    partition_error,
    partition_outcomes,
} from "./catalog/error-handling/effect-partition.ts"
import {
    validate_durations,
    validate_ok,
    validate_vibes_error,
} from "./catalog/error-handling/effect-validate.ts"
import {
    NOTIFICATION_DURATION_MILLIS,
    release_scope,
    type StepEvent,
} from "./catalog/timeline.ts"
import { example_timelines } from "./catalog/timelines.ts"
import {
    AddedFinalizer,
    ChangedReducedMotion,
    ClearedStepHover,
    ShookNode,
    ChangedFinalizerState,
    ChangedScopeState,
    ClearedRefFlash,
    SetRefValue,
    CompletedConcurrencyStep,
    InterruptedConcurrencyStep,
    FailedConcurrencyStep,
    DismissedNotification,
    HighlightedCode,
    RaisedNotification,
    StartedConcurrencyStep,
    StartedSleep,
    SucceededRun,
    TickedElapsed,
    UpdatedElapsed,
    type Message,
} from "./message.ts"
import {
    Died,
    Failed,
    Finalizer,
    FinalizerState,
    Idle,
    Interrupted,
    Model,
    NotificationVariant,
    Running,
    RunDied,
    RunFailed,
    RunOutcome,
    RunSucceeded,
    Notification,
    RefValue,
    ScopeState,
    Spring,
    spring_at_rest,
    Succeeded,
    ConcurrencyStep,
    type ExampleState,
} from "./model.ts"
import { create_identifier } from "./identifier.ts"
import { shake_element, step_node_selector } from "./animation.ts"
import {
    emoji,
    primitive,
    result_text,
    ResultValue,
    temperature,
    temperatures,
} from "./result.ts"
import { example_key_for_route, type ExampleRoute } from "./route.ts"
import { tokenize } from "./shiki.ts"

const TICK_INTERVAL = Duration.millis(16)
const TICK_SECONDS = 0.016

// Damping ratio ~0.69: underdamped, so the box overshoots its target and
// settles back, which is the motion the original shows.
const SPRING_STIFFNESS = 170
const SPRING_DAMPING = 18
const SPRING_EPSILON = 0.001

const step_spring = (spring: Spring, target: number): Spring => {
    const acceleration =
        SPRING_STIFFNESS * (target - spring.position) -
        SPRING_DAMPING * spring.velocity
    const velocity = spring.velocity + acceleration * TICK_SECONDS

    return Spring.make({
        position: spring.position + velocity * TICK_SECONDS,
        velocity,
    })
}

const spring_settled = (spring: Spring, target: number): boolean =>
    Math.abs(target - spring.position) < SPRING_EPSILON &&
    Math.abs(spring.velocity) < SPRING_EPSILON

// The highlight is shown once a run has produced something to point at.
// The spring's destination. A hovered step shows the box regardless of where
// the run is, which is how the code and the nodes read as one picture.
export const highlight_target_for = (model: Model): number =>
    Option.isSome(model.hovered_step) ? 1 : highlight_target(model.state)

const highlight_target = (state: ExampleState): number =>
    M.value(state).pipe(
        M.withReturnType<number>(),
        M.tagsExhaustive({
            Idle: () => 0,
            Running: () => 0,
            Succeeded: () => 1,
            Failed: () => 1,
            Died: () => 1,
            Interrupted: () => 0,
        })
    )

const StartSleep = Command.define("StartSleep", {
    args: { run_id: S.Number },
    messages: [StartedSleep],
    execute: ({ run_id }) =>
        Clock.currentTimeMillis.pipe(
            Effect.map((started_at_millis) =>
                StartedSleep({ run_id, started_at_millis })
            )
        ),
})

// A `Record` rather than a 21-arm `Match`: `pipe` tops out at 20 arguments, and
// the table makes a forgotten example a compile error rather than a run that
// silently does nothing.
type RunProgram = (options: ExampleOptions) => Effect.Effect<RunOutcome, string>

const run_programs: Record<ExampleKey, RunProgram> = {
    Succeed: () => Effect.succeed(RunSucceeded({ value: primitive("42") })),
    Fail: () => Effect.succeed(RunFailed({ error: "Kaboom!" })),
    Die: () => Effect.succeed(RunDied({ defect: "FATAL: System corrupted" })),
    // The first example with a non-deterministic result, so the
    // randomness stays inside the Effect rather than in `update`.
    Sync: () =>
        Effect.sync(() =>
            RunSucceeded({ value: primitive(String(Math.random())) })
        ),
    // The first example that actually takes time — 600-900ms, so it is
    // also the first to show the running pill and the elapsed counter.
    Sleep: () =>
        Effect.sleep(Duration.seconds(3)).pipe(
            Effect.as(RunSucceeded({ value: primitive("Refreshed!") }))
        ),
    Promise: () =>
        Effect.gen(function* () {
            const delay = yield* Random.nextIntBetween(600, 900)
            yield* Effect.sleep(Duration.millis(delay))
            const degrees = yield* Random.nextIntBetween(45, 75)

            return RunSucceeded({ value: temperature(degrees) })
        }),
    All: ({ concurrency_mode }) => {
        const effects = all_step_degrees.map((degrees, index) =>
            Effect.sleep(Duration.millis(all_step_durations[index] ?? 0)).pipe(
                Effect.as(degrees)
            )
        )

        const combined =
            concurrency_mode === "Sequential"
                ? Effect.all(effects)
                : Effect.all(effects, {
                      concurrency:
                          concurrency_mode === "Numbered" ? 2 : "unbounded",
                  })

        return combined.pipe(
            Effect.map((degrees) =>
                RunSucceeded({ value: temperatures(degrees) })
            )
        )
    },
    Race: () => {
        const tortoise = Effect.sleep(
            Duration.millis(race_step_durations[0] ?? 0)
        ).pipe(Effect.as(race_step_values[0] ?? emoji("")))
        const achilles = Effect.sleep(
            Duration.millis(race_step_durations[1] ?? 0)
        ).pipe(Effect.as(race_step_values[1] ?? emoji("")))

        return Effect.race(tortoise, achilles).pipe(
            Effect.map((winner) => RunSucceeded({ value: winner }))
        )
    },
    RaceAll: () =>
        Effect.raceAll(
            race_all_step_values.map((value, index) =>
                Effect.sleep(
                    Duration.millis(race_all_step_durations[index] ?? 0)
                ).pipe(Effect.as(value))
            )
        ).pipe(Effect.map((winner) => RunSucceeded({ value: winner }))),
    ForEach: () => {
        const effects = for_each_step_degrees.map((degrees, index) =>
            Effect.sleep(
                Duration.millis(for_each_step_durations[index] ?? 0)
            ).pipe(Effect.as(degrees))
        )

        return Effect.forEach(effects, (effect) => effect).pipe(
            Effect.map((degrees) =>
                RunSucceeded({ value: temperatures(degrees) })
            )
        )
    },
    // Sequential, so `credit` failing means `payment` is never
    // reached — the node stays idle, which is the short circuit.
    AllShortCircuit: () => {
        const [balance_duration = 0, credit_duration = 0] =
            all_short_circuit_durations
        const balance = Effect.sleep(Duration.millis(balance_duration)).pipe(
            Effect.as(all_short_circuit_balance_value)
        )
        const credit = Effect.sleep(Duration.millis(credit_duration)).pipe(
            Effect.andThen(() => Effect.fail(all_short_circuit_error))
        )
        const payment = Effect.succeed(primitive("Ka-ching!"))

        return Effect.all([balance, credit, payment]).pipe(
            Effect.map((values) =>
                RunSucceeded({
                    value: primitive(values.map(result_text).join(", ")),
                })
            )
        )
    },
    OrElse: () => {
        const [shoot_duration = 0, question_duration = 0] = or_else_durations
        const shoot = Effect.sleep(Duration.millis(shoot_duration)).pipe(
            Effect.andThen(() => Effect.fail(or_else_error))
        )
        const question = Effect.sleep(Duration.millis(question_duration)).pipe(
            Effect.as(or_else_value)
        )

        return shoot.pipe(
            Effect.catch(() => question),
            Effect.map((value) => RunSucceeded({ value }))
        )
    },
    FirstSuccessOf: () => {
        const [weather = 0, sensor = 0, backup = 0] = first_success_of_durations
        const down = (
            duration: number,
            error: string
        ): Effect.Effect<ResultValue, string> =>
            Effect.sleep(Duration.millis(duration)).pipe(
                Effect.andThen(() => Effect.fail(error))
            )
        const sources: ReadonlyArray<Effect.Effect<ResultValue, string>> = [
            down(weather, first_success_of_errors[0] ?? ""),
            down(sensor, first_success_of_errors[1] ?? ""),
            Effect.sleep(Duration.millis(backup)).pipe(
                Effect.as(first_success_of_value)
            ),
        ]

        return Effect.firstSuccessOf(sources).pipe(
            Effect.map((value) => RunSucceeded({ value }))
        )
    },
    // The delivery never arrives — the limit is what resolves the run,
    // and the error belongs to the timeout rather than to the pizza.
    Timeout: () =>
        Effect.sleep(Duration.millis(timeout_delivery_millis)).pipe(
            Effect.as(emoji("🍕")),
            Effect.timeout(Duration.millis(timeout_limit_millis)),
            Effect.map((value) => RunSucceeded({ value })),
            Effect.catch(() =>
                Effect.succeed(RunFailed({ error: timeout_error }))
            )
        ),
    Eventually: () =>
        Effect.gen(function* () {
            const attempt = yield* Ref.make(0)
            const swipe_card = Effect.gen(function* () {
                yield* Effect.sleep(
                    Duration.millis(eventually_attempt_duration)
                )
                const index = yield* Ref.getAndUpdate(
                    attempt,
                    (current) => current + 1
                )
                const message = eventually_attempt_messages[index]

                if (message === undefined) {
                    return eventually_value
                }

                return yield* Effect.fail(message)
            })

            return yield* swipe_card.pipe(
                Effect.retry(
                    Schedule.spaced(
                        Duration.millis(eventually_retry_gap_millis)
                    )
                ),
                Effect.map((value) => RunSucceeded({ value }))
            )
        }),
    // Nothing short-circuits: every lick runs, and both halves of the
    // tuple are counted at the end.
    Partition: () =>
        Effect.partition(
            partition_outcomes,
            (value, index) =>
                Effect.sleep(
                    Duration.millis(partition_durations[index] ?? 0)
                ).pipe(
                    Effect.andThen(() =>
                        value === undefined
                            ? Effect.fail(partition_error)
                            : Effect.succeed(value)
                    )
                ),
            { concurrency: "unbounded" }
        ).pipe(
            Effect.map(([failures, successes]) =>
                RunSucceeded({
                    value: primitive(
                        `👹 ${failures.length.toString()} 😇 ${successes.length.toString()}`
                    ),
                })
            )
        ),
    // `validate` keeps going after a check fails, so the run ends with
    // a count of the errors rather than the first one.
    Validate: () => {
        const [length = 0, complexity = 0, vibes = 0] = validate_durations
        const checks: ReadonlyArray<Effect.Effect<ResultValue, string>> = [
            Effect.sleep(Duration.millis(length)).pipe(Effect.as(validate_ok)),
            Effect.sleep(Duration.millis(complexity)).pipe(
                Effect.as(validate_ok)
            ),
            Effect.sleep(Duration.millis(vibes)).pipe(
                Effect.andThen(() => Effect.fail(validate_vibes_error))
            ),
        ]

        return Effect.validate(checks, (check) => check).pipe(
            Effect.map(() =>
                RunSucceeded({ value: primitive("Password Accepted!") })
            ),
            Effect.catch((errors) =>
                Effect.succeed(
                    RunFailed({
                        error: `${errors.length.toString()} error${errors.length === 1 ? "" : "s"}`,
                    })
                )
            )
        )
    },
    RetryRecurs: () =>
        Effect.gen(function* () {
            const attempt = yield* Ref.make(0)
            const wake_up = Effect.gen(function* () {
                yield* Effect.sleep(Duration.millis(retry_attempt_duration))
                const index = yield* Ref.getAndUpdate(
                    attempt,
                    (current) => current + 1
                )
                const message =
                    retry_attempt_messages[
                        Math.min(index, retry_attempt_messages.length - 1)
                    ] ?? "Asleep Forever"

                return yield* Effect.fail(message)
            })
            const snooze_schedule = Schedule.spaced(Duration.seconds(2)).pipe(
                Schedule.upTo({ times: 4 })
            )

            return yield* wake_up.pipe(
                Effect.retry(snooze_schedule),
                Effect.map((value) => RunSucceeded({ value: primitive(value) }))
            )
        }),
    RetryExponential: () =>
        Effect.gen(function* () {
            const attempt = yield* Ref.make(0)
            const park = Effect.gen(function* () {
                yield* Effect.sleep(
                    Duration.millis(exponential_attempt_duration)
                )
                const index = yield* Ref.getAndUpdate(
                    attempt,
                    (current) => current + 1
                )

                if (index >= exponential_attempt_messages.length) {
                    return "🚗 Parked!"
                }

                return yield* Effect.fail(
                    exponential_attempt_messages[index] ?? "Focus."
                )
            })

            return yield* park.pipe(
                Effect.retry(Schedule.exponential(Duration.millis(700))),
                Effect.map((value) => RunSucceeded({ value: primitive(value) }))
            )
        }),
    RepeatSpaced: () =>
        Effect.gen(function* () {
            const attempt = yield* Ref.make(0)
            const check_phone = Effect.gen(function* () {
                yield* Effect.sleep(
                    Duration.millis(repeat_spaced_attempt_duration)
                )
                const index = yield* Ref.getAndUpdate(
                    attempt,
                    (current) => current + 1
                )

                if (index >= repeat_spaced_messages.length) {
                    return yield* Effect.fail("phone died")
                }

                return repeat_spaced_messages[index] ?? ""
            })

            return yield* check_phone.pipe(
                Effect.repeat(Schedule.spaced(Duration.seconds(2))),
                Effect.map((count) =>
                    RunSucceeded({ value: primitive(String(count)) })
                )
            )
        }),
    RepeatWhile: () =>
        Effect.gen(function* () {
            const amount_consumed = yield* Ref.make(0)
            const eat_hotdog = Effect.gen(function* () {
                const index = yield* Ref.getAndUpdate(
                    amount_consumed,
                    (current) => current + 1
                )
                yield* Effect.sleep(
                    Duration.millis(repeat_while_durations[index] ?? 650)
                )
                return "🌭".repeat(index + 1)
            })
            const schedule = Schedule.spaced(Duration.millis(400)).pipe(
                Schedule.upTo({ duration: Duration.seconds(10) })
            )

            yield* eat_hotdog.pipe(Effect.repeat(schedule))
            const total = yield* Ref.get(amount_consumed)
            return RunSucceeded({
                value: primitive(`🤢 ${total.toString()} Hotdogs!`),
            })
        }),
    RefMake: () =>
        Effect.gen(function* () {
            const counter = yield* Ref.make(0)

            // The gap belongs *between* attempts, not after the last one —
            // a trailing gap would hold the result back past the final node.
            yield* Effect.forEach(
                Array.from({ length: ref_make_attempts }, (_, index) => index),
                (index) =>
                    Effect.gen(function* () {
                        if (index > 0) {
                            yield* Effect.sleep(Duration.millis(ref_make_gap))
                        }

                        yield* Effect.sleep(
                            Duration.millis(ref_make_before_update)
                        )
                        yield* Ref.updateAndGet(counter, (n) => n + 1)
                        yield* Effect.sleep(
                            Duration.millis(ref_make_after_update)
                        )
                    })
            )

            return RunSucceeded({ value: ref_make_result })
        }),
    // Five fibers on one Ref. Nothing coordinates them and no update is lost,
    // which is the entire point of `updateAndGet` over a plain variable.
    RefUpdateAndGet: () =>
        Effect.gen(function* () {
            const counter = yield* Ref.make(0)

            yield* Effect.all(
                ref_update_and_get_durations.map((duration) =>
                    Effect.gen(function* () {
                        yield* Effect.sleep(Duration.millis(duration))
                        yield* Ref.updateAndGet(counter, (n) => n + 1)
                        yield* Effect.sleep(
                            Duration.millis(ref_update_and_get_settle_lag)
                        )
                    })
                ),
                { concurrency: "unbounded" }
            )

            return RunSucceeded({ value: ref_update_and_get_result })
        }),
    AddFinalizer: ({ finalizer_outcome }) =>
        Effect.gen(function* () {
            yield* Effect.sleep(Duration.millis(add_finalizer_register_at))
            yield* Effect.addFinalizer(() => Effect.void)
            yield* Effect.sleep(Duration.millis(add_finalizer_work_duration))

            if (finalizer_outcome === "Fail") {
                return RunFailed({ error: add_finalizer_error })
            }

            if (finalizer_outcome === "Die") {
                return RunDied({ defect: add_finalizer_defect })
            }

            // Upstream sleeps for an hour; `never` says the same thing without
            // pretending there is a deadline. Only a tap ends this run.
            if (finalizer_outcome === "Interrupt") {
                return yield* Effect.never
            }

            return RunSucceeded({ value: add_finalizer_success })
        }).pipe(Effect.scoped),
    AcquireRelease: () =>
        Effect.gen(function* () {
            for (const span of acquire_release_acquire_spans) {
                yield* Effect.acquireRelease(
                    Effect.sleep(Duration.millis(span)),
                    () => Effect.void
                )
            }

            yield* Effect.sleep(Duration.millis(acquire_release_work_duration))

            return RunSucceeded({ value: acquire_release_result })
        }).pipe(Effect.scoped),
}

const RunExample = Command.define("RunExample", {
    args: {
        run_id: S.Number,
        key: ExampleKey,
        options: ExampleOptions,
    },
    messages: [SucceededRun],
    execute: ({ run_id, key, options }) =>
        run_programs[key](options).pipe(
            Effect.catch((error) =>
                Effect.succeed(RunFailed({ error: String(error) }))
            ),
            Effect.bindTo("outcome"),
            Effect.bind("completed_at_millis", () => Clock.currentTimeMillis),
            Effect.map(({ outcome, completed_at_millis }) =>
                SucceededRun({ run_id, completed_at_millis, outcome })
            )
        ),
})

const ReadElapsed = Command.define("ReadElapsed", {
    args: { run_id: S.Number, started_at_millis: S.Number },
    messages: [UpdatedElapsed],
    execute: ({ run_id, started_at_millis }) =>
        Clock.currentTimeMillis.pipe(
            Effect.map((now_millis) =>
                UpdatedElapsed({
                    run_id,
                    elapsed_millis: Math.max(0, now_millis - started_at_millis),
                })
            )
        ),
})

// Tokenising is async and can fail (the grammar chunk may not load); a failure
// leaves `code` empty and the view falls back to plain unhighlighted text.
const HighlightCode = Command.define("HighlightCode", {
    args: { key: ExampleKey, options: ExampleOptions },
    messages: [HighlightedCode],
    execute: ({ key, options }) => {
        const example = example_by_key(key, options)

        return Effect.tryPromise(() =>
            tokenize(example.code.language, example.code.source)
        ).pipe(
            Effect.map((code) => HighlightedCode({ code })),
            Effect.catch(() => Effect.succeed(HighlightedCode({ code: [] })))
        )
    },
})

const StartConcurrencyStep = Command.define("StartConcurrencyStep", {
    args: { run_id: S.Number, index: S.Number, delay_millis: S.Number },
    messages: [StartedConcurrencyStep],
    execute: ({ run_id, index, delay_millis }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.andThen(Clock.currentTimeMillis),
            Effect.map((started_at_millis) =>
                StartedConcurrencyStep({ run_id, index, started_at_millis })
            )
        ),
})

const CompleteConcurrencyStep = Command.define("CompleteConcurrencyStep", {
    args: {
        run_id: S.Number,
        index: S.Number,
        delay_millis: S.Number,
        value: ResultValue,
    },
    messages: [CompletedConcurrencyStep],
    execute: ({ run_id, index, delay_millis, value }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.andThen(Clock.currentTimeMillis),
            Effect.map((completed_at_millis) =>
                CompletedConcurrencyStep({
                    run_id,
                    index,
                    completed_at_millis,
                    value,
                })
            )
        ),
})

const InterruptConcurrencyStep = Command.define("InterruptConcurrencyStep", {
    args: { run_id: S.Number, index: S.Number, delay_millis: S.Number },
    messages: [InterruptedConcurrencyStep],
    execute: ({ run_id, index, delay_millis }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.andThen(Clock.currentTimeMillis),
            Effect.map((interrupted_at_millis) =>
                InterruptedConcurrencyStep({
                    run_id,
                    index,
                    interrupted_at_millis,
                })
            )
        ),
})

const FailConcurrencyStep = Command.define("FailConcurrencyStep", {
    args: {
        run_id: S.Number,
        index: S.Number,
        delay_millis: S.Number,
        error: S.String,
    },
    messages: [FailedConcurrencyStep],
    execute: ({ run_id, index, delay_millis, error }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.andThen(Clock.currentTimeMillis),
            Effect.map((failed_at_millis) =>
                FailedConcurrencyStep({
                    run_id,
                    index,
                    failed_at_millis,
                    error,
                })
            )
        ),
})

const DEATH_GLITCH_CHARSET = "@#$%&*/=-+?!~<>\\|"

const death_glitch_text = (message: string): string => {
    const length = Math.min(Math.max(Array.from(message).length, 6), 16)

    return Array.from({ length }, () => {
        const index = Math.floor(Math.random() * DEATH_GLITCH_CHARSET.length)
        return DEATH_GLITCH_CHARSET[index] ?? DEATH_GLITCH_CHARSET[0]
    }).join("")
}

// The id and the death variant's glitch text are both random, so they are
// generated here rather than in `update`, which has to stay pure.
const RaiseNotification = Command.define("RaiseNotification", {
    args: {
        message: S.String,
        variant: NotificationVariant,
        delay_millis: S.Number,
        duration_millis: S.Number,
        show_on_hover: S.Boolean,
    },
    messages: [RaisedNotification],
    execute: ({
        message,
        variant,
        delay_millis,
        duration_millis,
        show_on_hover,
    }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.andThen(
                Effect.sync(() =>
                    RaisedNotification({
                        notification: Notification.make({
                            id: create_identifier(),
                            text:
                                variant === "death"
                                    ? death_glitch_text(message)
                                    : message,
                            label: message,
                            variant,
                            duration_millis,
                            show_on_hover,
                        }),
                    })
                )
            )
        ),
})

const SetRef = Command.define("SetRef", {
    args: { delay_millis: S.Number, value: S.String },
    messages: [SetRefValue],
    execute: ({ delay_millis, value }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.as(SetRefValue({ value }))
        ),
})

// The flash is a property of the value having *just* changed, so it clears
// itself the way a notification dismisses itself.
const REF_FLASH_MILLIS = 400

const ClearRefFlash = Command.define("ClearRefFlash", {
    args: { delay_millis: S.Number },
    messages: [ClearedRefFlash],
    execute: ({ delay_millis }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.as(ClearedRefFlash())
        ),
})

const SetScope = Command.define("SetScope", {
    args: { delay_millis: S.Number, state: ScopeState },
    messages: [ChangedScopeState],
    execute: ({ delay_millis, state }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.as(ChangedScopeState({ state }))
        ),
})

const AddFinalizerCard = Command.define("AddFinalizerCard", {
    args: { delay_millis: S.Number, id: S.String, name: S.String },
    messages: [AddedFinalizer],
    execute: ({ delay_millis, id, name }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.as(
                AddedFinalizer({
                    finalizer: Finalizer.make({ id, name, state: "Pending" }),
                })
            )
        ),
})

const SetFinalizer = Command.define("SetFinalizer", {
    args: {
        delay_millis: S.Number,
        id: S.String,
        state: FinalizerState,
    },
    messages: [ChangedFinalizerState],
    execute: ({ delay_millis, id, state }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.as(ChangedFinalizerState({ id, state }))
        ),
})

// The first imperative animation in this port. It runs from a Command rather
// than a Mount because the cause is a Message — Foldkit's own guidance for
// Model changes that must drive the DOM — and because a Mount's args are fixed
// at insert, so it could never learn that *this* step just failed.
const ShakeNode = Command.define("ShakeNode", {
    args: { index: S.Number },
    messages: [ShookNode],
    execute: ({ index }) =>
        Effect.sync(() => {
            const element = globalThis.document.querySelector(
                step_node_selector(index)
            )

            if (element !== null) {
                shake_element(element)
            }

            return ShookNode()
        }),
})

const STEP_HOVER_HIDE_MILLIS = 220

const ClearStepHover = Command.define("ClearStepHover", {
    args: { token: S.Number },
    messages: [ClearedStepHover],
    execute: ({ token }) =>
        Effect.sleep(Duration.millis(STEP_HOVER_HIDE_MILLIS)).pipe(
            Effect.as(ClearedStepHover({ token }))
        ),
})

const DismissNotification = Command.define("DismissNotification", {
    args: { id: S.String, delay_millis: S.Number },
    messages: [DismissedNotification],
    execute: ({ id, delay_millis }) =>
        Effect.sleep(Duration.millis(delay_millis)).pipe(
            Effect.as(DismissedNotification({ id }))
        ),
})

type UpdateReturn = Update.Return<Model, Message, AudioService>

const is_running = (state: ExampleState): boolean =>
    M.value(state).pipe(
        M.withReturnType<boolean>(),
        M.tagsExhaustive({
            Idle: () => false,
            Running: () => true,
            Succeeded: () => false,
            Failed: () => false,
            Died: () => false,
            Interrupted: () => false,
        })
    )

// `System` defers to `prefers-reduced-motion`: someone who asked for less
// motion is taken to have asked for less noise too.
const sound_enabled = (model: Model): boolean =>
    model.sound_preference === "Off"
        ? false
        : model.sound_preference === "On"
          ? true
          : !model.prefers_reduced_motion

const play_sound = (model: Model, cue: SoundCue) =>
    sound_enabled(model) ? [PlaySound({ cue })] : []

const step_labels_for = (key: ExampleKey): ReadonlyArray<string> =>
    example_timelines[key].labels

// The catalog describes a run as events; this is the only place that knows
// which Command carries each one.
const step_event_command = (run_id: number, event: StepEvent) => {
    switch (event.kind) {
        case "start":
            return StartConcurrencyStep({
                run_id,
                index: event.index,
                delay_millis: event.at_millis,
            })
        case "complete":
            return CompleteConcurrencyStep({
                run_id,
                index: event.index,
                delay_millis: event.at_millis,
                value: event.value,
            })
        case "fail":
            return FailConcurrencyStep({
                run_id,
                index: event.index,
                delay_millis: event.at_millis,
                error: event.error,
            })
        case "interrupt":
            return InterruptConcurrencyStep({
                run_id,
                index: event.index,
                delay_millis: event.at_millis,
            })
        case "notify":
            return RaiseNotification({
                message: event.message,
                variant: event.variant,
                delay_millis: event.at_millis,
                duration_millis: event.duration_millis,
                show_on_hover: event.show_on_hover,
            })
        case "ref":
            return SetRef({
                delay_millis: event.at_millis,
                value: event.value,
            })
        case "scope":
            return SetScope({
                delay_millis: event.at_millis,
                state: event.phase,
            })
        case "finalizer_added":
            return AddFinalizerCard({
                delay_millis: event.at_millis,
                id: event.id,
                name: event.name,
            })
        case "finalizer_running":
            return SetFinalizer({
                delay_millis: event.at_millis,
                id: event.id,
                state: "Running",
            })
        case "finalizer_completed":
            return SetFinalizer({
                delay_millis: event.at_millis,
                id: event.id,
                state: "Completed",
            })
    }
}

const idle_concurrency_steps = (key: ExampleKey) =>
    step_labels_for(key).map((label, index) =>
        ConcurrencyStep.make({ index, label, state: Idle() })
    )

const idle_ref_value = (key: ExampleKey): Option.Option<RefValue> => {
    const ref = example_timelines[key].ref

    return ref === undefined
        ? Option.none()
        : Option.some(
              RefValue.make({
                  name: ref.name,
                  value: ref.initial,
                  just_changed: false,
              })
          )
}

// Everything a fresh run starts from. Route changes, a control change and a
// reset all mean the same thing, and each one used to have to remember the
// full list of fields.
const idle_run_fields = (key: ExampleKey) => ({
    concurrency_steps: () => idle_concurrency_steps(key),
    scope_state: () => "Idle" as const,
    finalizers: () => [],
    ref_value: () => idle_ref_value(key),
})

// Finalizers still pending when a run ends early — an interrupt — have to run
// anyway. That is the guarantee, so the release is emitted here rather than
// pre-scheduled with the rest of the timeline.
const release_pending_finalizers = (model: Model) => {
    const pending = model.finalizers.filter(
        (finalizer) => finalizer.state === "Pending"
    )

    if (pending.length === 0) {
        return []
    }

    return release_scope(
        0,
        pending.map((finalizer) => finalizer.id)
    ).events.map((event) => step_event_command(model.next_run_id, event))
}

export const init = (route: ExampleRoute): UpdateReturn => {
    const selected_example_key = example_key_for_route(route)

    return {
        model: Model.make({
            route,
            state: Idle(),
            next_run_id: 1,
            selected_example_key,
            options: default_example_options,
            concurrency_steps: idle_concurrency_steps(selected_example_key),
            scope_state: "Idle",
            finalizers: [],
            ref_value: idle_ref_value(selected_example_key),
            sound_preference: "System",
            prefers_reduced_motion: false,
            highlight: spring_at_rest,
            highlight_rects: [],
            hovered_step: Option.none(),
            hover_token: 0,
            notification: Option.none(),
            is_notification_visible: false,
            is_node_hovered: false,
            is_control_hovered: false,
            code: [],
        }),
        commands: [
            HighlightCode({
                key: selected_example_key,
                options: default_example_options,
            }),
        ],
    }
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedExampleRoute: ({ route }) => ({
                model: modifyFields(model, {
                    route: () => route,
                    selected_example_key: () => example_key_for_route(route),
                    ...idle_run_fields(example_key_for_route(route)),
                    state: () => Idle(),
                    next_run_id: (next_run_id) => next_run_id + 1,
                    highlight: () => spring_at_rest,
                    highlight_rects: () => [],
                    hovered_step: () => Option.none(),
                    notification: () => Option.none(),
                    is_notification_visible: () => false,
                    code: () => [],
                }),
                commands: [
                    HighlightCode({
                        key: example_key_for_route(route),
                        options: model.options,
                    }),
                ],
            }),
            HighlightedCode: ({ code }) => ({
                model: modifyFields(model, { code: () => code }),
                commands: [],
            }),
            MeasuredHighlights: ({ rects }) => ({
                model: modifyFields(model, { highlight_rects: () => rects }),
                commands: [],
            }),
            HoveredStep: ({ index }) => ({
                model: modifyFields(model, {
                    hovered_step: () => Option.some(index),
                    hover_token: (token) => token + 1,
                }),
                commands: [],
            }),
            // The box lingers briefly rather than snapping back to the result,
            // so sweeping across a row of nodes does not strobe.
            UnhoveredStep: () => ({
                model: modifyFields(model, { hover_token: (token) => token + 1 }),
                commands: [ClearStepHover({ token: model.hover_token + 1 })],
            }),
            // Only the most recent unhover may clear; an intervening hover has
            // already bumped the token past this one.
            ClearedStepHover: ({ token }) => ({
                model:
                    token === model.hover_token
                        ? modifyFields(model, { hovered_step: () => Option.none() })
                        : model,
                commands: [],
            }),
            RaisedNotification: ({ notification }) => ({
                model: modifyFields(model, {
                    notification: () => Option.some(notification),
                    is_notification_visible: () => true,
                }),
                commands: [
                    ...play_sound(model, AudioNotification()),
                    DismissNotification({
                        id: notification.id,
                        delay_millis: notification.duration_millis,
                    }),
                ],
            }),
            // Only the notification still on screen may dismiss itself; a
            // newer run's bubble must not be cancelled by an older timer.
            DismissedNotification: ({ id }) => ({
                model: modifyFields(model, {
                    is_notification_visible: (visible) =>
                        Option.match(model.notification, {
                            onNone: () => visible,
                            onSome: (current) =>
                                current.id === id ? false : visible,
                        }),
                }),
                commands: [],
            }),
            HoveredNode: () => ({
                model: modifyFields(model, { is_node_hovered: () => true }),
                commands: [],
            }),
            UnhoveredNode: () => ({
                model: modifyFields(model, { is_node_hovered: () => false }),
                commands: [],
            }),
            HoveredControl: () => ({
                model: modifyFields(model, { is_control_hovered: () => true }),
                commands: [],
            }),
            UnhoveredControl: () => ({
                model: modifyFields(model, { is_control_hovered: () => false }),
                commands: [],
            }),
            // Run, interrupt, or reset — which one depends on where the run is,
            // because the original gives the node a single gesture.
            ClickedNode: () =>
                M.value(model.state).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Idle", () => ({
                        model,
                        commands: [
                            ...play_sound(model, AudioRunStarted()),
                            StartSleep({ run_id: model.next_run_id }),
                        ],
                    })),
                    M.tag("Running", ({ elapsed_millis }) => ({
                        model: modifyFields(model, {
                            state: () =>
                                Interrupted({
                                    duration_millis: elapsed_millis,
                                }),
                            concurrency_steps: (steps) =>
                                steps.map((step) =>
                                    ConcurrencyStep.make({
                                        index: step.index,
                                        label: step.label,
                                        state: M.value(step.state).pipe(
                                            M.tag("Running", () =>
                                                Interrupted({
                                                    duration_millis:
                                                        elapsed_millis,
                                                })
                                            ),
                                            M.orElse(() => step.state)
                                        ),
                                    })
                                ),
                        }),
                        commands: [
                            ...play_sound(model, AudioRunInterrupted()),
                            ...release_pending_finalizers(model),
                        ],
                    })),
                    M.orElse(() => ({
                        model: modifyFields(model, {
                            state: () => Idle(),
                            next_run_id: (next_run_id) => next_run_id + 1,
                            ...idle_run_fields(model.selected_example_key),
                        }),
                        commands: play_sound(model, AudioRunReset()),
                    }))
                ),
            ChangedReducedMotion: ({ prefers }) => ({
                model: modifyFields(model, { prefers_reduced_motion: () => prefers }),
                commands: [],
            }),
            ToggledSound: () => ({
                model: modifyFields(model, {
                    sound_preference: next_sound_preference,
                }),
                commands: [],
            }),
            ChangedConcurrencyMode: ({ mode }) => {
                const options = ExampleOptions.make({
                    concurrency_mode: mode,
                    finalizer_outcome: model.options.finalizer_outcome,
                })

                return {
                    model: modifyFields(model, {
                        options: () => options,
                        state: () => Idle(),
                        next_run_id: (next_run_id) => next_run_id + 1,
                        ...idle_run_fields("All"),
                        highlight: () => spring_at_rest,
                        highlight_rects: () => [],
                        hovered_step: () => Option.none(),
                        code: () => [],
                    }),
                    commands: [
                        ...play_sound(model, AudioControlChanged()),
                        HighlightCode({ key: "All", options }),
                    ],
                }
            },
            // The outcome control rewrites the snippet as well as the run, so
            // it re-tokenises exactly the way the concurrency control does.
            ChangedFinalizerOutcome: ({ outcome }) => {
                const options = ExampleOptions.make({
                    concurrency_mode: model.options.concurrency_mode,
                    finalizer_outcome: outcome,
                })

                return {
                    model: modifyFields(model, {
                        options: () => options,
                        state: () => Idle(),
                        next_run_id: (next_run_id) => next_run_id + 1,
                        ...idle_run_fields("AddFinalizer"),
                        highlight: () => spring_at_rest,
                        highlight_rects: () => [],
                        hovered_step: () => Option.none(),
                        code: () => [],
                    }),
                    commands: [
                        ...play_sound(model, AudioControlChanged()),
                        HighlightCode({ key: "AddFinalizer", options }),
                    ],
                }
            },
            SetRefValue: ({ value }) => ({
                model: modifyFields(model, {
                    ref_value: (ref_value) =>
                        Option.map(ref_value, (ref) =>
                            RefValue.make({
                                name: ref.name,
                                value,
                                just_changed: true,
                            })
                        ),
                }),
                commands: [
                    ...play_sound(model, AudioRefUpdated()),
                    ClearRefFlash({ delay_millis: REF_FLASH_MILLIS }),
                ],
            }),
            ClearedRefFlash: () => ({
                model: modifyFields(model, {
                    ref_value: (ref_value) =>
                        Option.map(ref_value, (ref) =>
                            RefValue.make({
                                name: ref.name,
                                value: ref.value,
                                just_changed: false,
                            })
                        ),
                }),
                commands: [],
            }),
            ChangedScopeState: ({ state }) => ({
                model: modifyFields(model, { scope_state: () => state }),
                commands: [],
            }),
            AddedFinalizer: ({ finalizer }) => ({
                model: modifyFields(model, {
                    finalizers: (finalizers) =>
                        finalizers.some(
                            (existing) => existing.id === finalizer.id
                        )
                            ? finalizers
                            : [...finalizers, finalizer],
                }),
                commands: play_sound(model, AudioFinalizerCreated()),
            }),
            ChangedFinalizerState: ({ id, state }) => ({
                model: modifyFields(model, {
                    finalizers: (finalizers) =>
                        finalizers.map((finalizer) =>
                            finalizer.id === id
                                ? Finalizer.make({
                                      id: finalizer.id,
                                      name: finalizer.name,
                                      state,
                                  })
                                : finalizer
                        ),
                }),
                commands:
                    state === "Completed"
                        ? play_sound(model, AudioFinalizerFinished())
                        : state === "Running"
                          ? play_sound(model, AudioFinalizerRunning())
                          : [],
            }),
            StartedConcurrencyStep: ({ run_id, index, started_at_millis }) =>
                M.value(model.state).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Running", (state) => ({
                        model:
                            state.run_id === run_id
                                ? modifyFields(model, {
                                      concurrency_steps: (steps) =>
                                          steps.map((step) =>
                                              step.index === index
                                                  ? ConcurrencyStep.make({
                                                        index: step.index,
                                                        label: step.label,
                                                        state: Running({
                                                            run_id,
                                                            started_at_millis,
                                                            elapsed_millis: 0,
                                                        }),
                                                    })
                                                  : step
                                          ),
                                  })
                                : model,
                        commands:
                            state.run_id === run_id
                                ? play_sound(model, AudioStepRunning())
                                : [],
                    })),
                    M.orElse(() => ({ model, commands: [] }))
                ),
            CompletedConcurrencyStep: ({
                run_id,
                index,
                completed_at_millis,
                value,
            }) =>
                M.value(model.state).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Running", (state) => ({
                        model:
                            state.run_id === run_id
                                ? modifyFields(model, {
                                      concurrency_steps: (steps) =>
                                          steps.map((step) =>
                                              step.index === index
                                                  ? ConcurrencyStep.make({
                                                        index: step.index,
                                                        label: step.label,
                                                        state: M.value(
                                                            step.state
                                                        ).pipe(
                                                            M.tag(
                                                                "Running",
                                                                (running) =>
                                                                    Succeeded({
                                                                        duration_millis:
                                                                            completed_at_millis -
                                                                            running.started_at_millis,
                                                                        result: value,
                                                                    })
                                                            ),
                                                            M.orElse(
                                                                () => step.state
                                                            )
                                                        ),
                                                    })
                                                  : step
                                          ),
                                  })
                                : model,
                        commands:
                            state.run_id === run_id
                                ? play_sound(model, AudioStepSucceeded())
                                : [],
                    })),
                    M.orElse(() => ({ model, commands: [] }))
                ),
            InterruptedConcurrencyStep: ({
                run_id,
                index,
                interrupted_at_millis,
            }) =>
                M.value(model.state).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Running", (state) => ({
                        model:
                            state.run_id === run_id
                                ? modifyFields(model, {
                                      concurrency_steps: (steps) =>
                                          steps.map((step) =>
                                              step.index === index
                                                  ? ConcurrencyStep.make({
                                                        index: step.index,
                                                        label: step.label,
                                                        state: M.value(
                                                            step.state
                                                        ).pipe(
                                                            M.tag(
                                                                "Running",
                                                                (running) =>
                                                                    Interrupted(
                                                                        {
                                                                            duration_millis:
                                                                                interrupted_at_millis -
                                                                                running.started_at_millis,
                                                                        }
                                                                    )
                                                            ),
                                                            M.orElse(
                                                                () => step.state
                                                            )
                                                        ),
                                                    })
                                                  : step
                                          ),
                                  })
                                : model,
                        commands:
                            state.run_id === run_id
                                ? play_sound(model, AudioStepInterrupted())
                                : [],
                    })),
                    M.orElse(() => ({ model, commands: [] }))
                ),
            FailedConcurrencyStep: ({
                run_id,
                index,
                failed_at_millis,
                error,
            }) =>
                M.value(model.state).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Running", (state) => ({
                        model:
                            state.run_id === run_id
                                ? modifyFields(model, {
                                      concurrency_steps: (steps) =>
                                          steps.map((step) =>
                                              step.index === index
                                                  ? ConcurrencyStep.make({
                                                        index: step.index,
                                                        label: step.label,
                                                        state: M.value(
                                                            step.state
                                                        ).pipe(
                                                            M.tag(
                                                                "Running",
                                                                (running) =>
                                                                    Failed({
                                                                        duration_millis:
                                                                            failed_at_millis -
                                                                            running.started_at_millis,
                                                                        error,
                                                                    })
                                                            ),
                                                            M.orElse(
                                                                () => step.state
                                                            )
                                                        ),
                                                    })
                                                  : step
                                          ),
                                  })
                                : model,
                        commands:
                            state.run_id === run_id
                                ? [
                                      ...play_sound(model, AudioStepFailed()),
                                      // Reduced motion silences the shake the same
                                      // way it silences `System` sound.
                                      ...(model.prefers_reduced_motion
                                          ? []
                                          : [ShakeNode({ index })]),
                                  ]
                                : [],
                    })),
                    M.orElse(() => ({ model, commands: [] }))
                ),
            StartedSleep: ({ run_id, started_at_millis }) => ({
                model: modifyFields(model, {
                    state: () =>
                        Running({
                            run_id,
                            started_at_millis,
                            elapsed_millis: 0,
                        }),
                    next_run_id: (next_run_id) => next_run_id + 1,
                }),
                commands: [
                    RunExample({
                        run_id,
                        key: model.selected_example_key,
                        options: model.options,
                    }),
                    ...example_timelines[model.selected_example_key]
                        .events(model.options)
                        .map((event) => step_event_command(run_id, event)),
                    ...example_by_key(
                        model.selected_example_key,
                        model.options
                    ).notifications.map((notification) =>
                        RaiseNotification({
                            message: notification.message,
                            variant: notification.variant,
                            delay_millis: notification.after_millis,
                            duration_millis: notification.duration_millis,
                            show_on_hover: notification.show_on_hover,
                        })
                    ),
                ],
            }),
            PlayedSound: () => ({ model, commands: [] }),
            ShookNode: () => ({ model, commands: [] }),
            // Acquiring the player is what the toggle really asks for; the
            // first cue is played once it is actually available.
            AudioAvailable: () => ({
                model,
                commands: [PlaySound({ cue: AudioRunStarted() })],
            }),
            AudioUnavailable: () => ({
                model: modifyFields(model, { sound_preference: () => "Off" }),
                commands: [],
            }),
            AudioReleased: () => ({ model, commands: [] }),
            SucceededRun: ({ run_id, completed_at_millis, outcome }) =>
                M.value(model.state).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Running", (state) =>
                        state.run_id === run_id
                            ? {
                                  model: modifyFields(model, {
                                      state: () => {
                                          const duration_millis =
                                              completed_at_millis -
                                              state.started_at_millis

                                          return M.value(outcome).pipe(
                                              M.withReturnType<ExampleState>(),
                                              M.tagsExhaustive({
                                                  RunSucceeded: ({ value }) =>
                                                      Succeeded({
                                                          duration_millis,
                                                          result: value,
                                                      }),
                                                  RunFailed: ({ error }) =>
                                                      Failed({
                                                          duration_millis,
                                                          error,
                                                      }),
                                                  RunDied: ({ defect }) =>
                                                      Died({
                                                          duration_millis,
                                                          defect,
                                                      }),
                                              })
                                          )
                                      },
                                  }),
                                  commands: [
                                      ...play_sound(
                                          model,
                                          M.value(outcome).pipe(
                                              M.withReturnType<SoundCue>(),
                                              M.tagsExhaustive({
                                                  RunSucceeded: () =>
                                                      AudioRunSucceeded(),
                                                  RunFailed: () =>
                                                      AudioRunFailed(),
                                                  RunDied: () => AudioRunDied(),
                                              })
                                          )
                                      ),
                                      // PORT NOTE: in the source each example's
                                      // `build` decides whether to notify. This
                                      // port reimplements the programs inline,
                                      // so the notification is derived from the
                                      // outcome instead — every failure and
                                      // defect raises one. That matches the two
                                      // ported examples exactly; revisit when a
                                      // failing example should stay quiet.
                                      ...M.value(outcome).pipe(
                                          M.withReturnType<
                                              ReadonlyArray<
                                                  Command.Command<
                                                      Message,
                                                      never,
                                                      AudioService
                                                  >
                                              >
                                          >(),
                                          M.tagsExhaustive({
                                              RunSucceeded: () => [],
                                              RunFailed: ({ error }) => [
                                                  RaiseNotification({
                                                      message: error,
                                                      variant: "failure",
                                                      delay_millis: 0,
                                                      duration_millis:
                                                          NOTIFICATION_DURATION_MILLIS,
                                                      show_on_hover: true,
                                                  }),
                                              ],
                                              RunDied: ({ defect }) => [
                                                  RaiseNotification({
                                                      message: defect,
                                                      variant: "death",
                                                      delay_millis: 0,
                                                      duration_millis:
                                                          NOTIFICATION_DURATION_MILLIS,
                                                      show_on_hover: true,
                                                  }),
                                              ],
                                          })
                                      ),
                                  ],
                              }
                            : { model, commands: [] }
                    ),
                    M.orElse(() => ({ model, commands: [] }))
                ),
            // Every frame advances the spring, whether or not a run is in
            // flight — the box is still settling after the run finishes.
            TickedElapsed: () => {
                const ticked = modifyFields(model, {
                    highlight: (spring) =>
                        step_spring(spring, highlight_target_for(model)),
                })

                return M.value(model.state).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Running", ({ run_id, started_at_millis }) => ({
                        model: ticked,
                        commands: [ReadElapsed({ run_id, started_at_millis })],
                    })),
                    M.orElse(() => ({ model: ticked, commands: [] }))
                )
            },
            UpdatedElapsed: ({ run_id, elapsed_millis }) =>
                M.value(model.state).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tag("Running", (state) =>
                        state.run_id === run_id
                            ? {
                                  model: modifyFields(model, {
                                      state: () =>
                                          Running({
                                              run_id: state.run_id,
                                              started_at_millis:
                                                  state.started_at_millis,
                                              elapsed_millis,
                                          }),
                                  }),
                                  commands: [],
                              }
                            : { model, commands: [] }
                    ),
                    M.orElse(() => ({ model, commands: [] }))
                ),
        })
    )

// The tick has two customers now. Gating it on `is_running` alone would freeze
// the spring the instant the run finished — exactly when it has to animate.
export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    // Watched unconditionally: the sound preference is only one customer, and
    // the shake needs it whatever the sound is set to.
    reduced_motion: entry(
        { watching: S.Boolean },
        {
            modelToDependencies: () => ({ watching: true }),
            dependenciesToStream: ({ watching }) =>
                Stream.when(
                    Stream.callback<Message>((queue) =>
                        Effect.acquireRelease(
                            Effect.sync(() => {
                                const query = globalThis.matchMedia(
                                    "(prefers-reduced-motion: reduce)"
                                )
                                const emit = () =>
                                    Queue.offerUnsafe(
                                        queue,
                                        ChangedReducedMotion({
                                            prefers: query.matches,
                                        })
                                    )

                                query.addEventListener("change", emit)
                                emit()

                                return { query, emit }
                            }),
                            ({ query, emit }) =>
                                Effect.sync(() => {
                                    query.removeEventListener("change", emit)
                                })
                        ).pipe(Effect.flatMap(() => Effect.never))
                    ),
                    Effect.sync(() => watching)
                ),
        }
    ),
    frames: entry(
        { is_animating: S.Boolean },
        {
            modelToDependencies: (model) => ({
                is_animating:
                    is_running(model.state) ||
                    !spring_settled(
                        model.highlight,
                        highlight_target_for(model)
                    ),
            }),
            dependenciesToStream: ({ is_animating }) =>
                Stream.when(
                    Stream.tick(TICK_INTERVAL).pipe(Stream.map(TickedElapsed)),
                    Effect.sync(() => is_animating)
                ),
        }
    ),
}))

export const managedResources = ManagedResource.make<Model, Message>()(
    (entry) => ({
        effect_example_audio: entry(S.Option(S.Null), {
            resource: AudioResource,
            modelToMaybeRequirements: (model) =>
                sound_enabled(model) ? Option.some(null) : Option.none(),
            acquire: () => acquire_audio,
            release: release_audio,
            onAcquired: () => AudioAvailable(),
            onReleased: () => AudioReleased(),
            onAcquireError: () => AudioUnavailable(),
        }),
    })
)
