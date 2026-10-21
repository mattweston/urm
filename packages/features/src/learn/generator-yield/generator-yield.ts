import { Context, Data, Effect, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

export type User = Readonly<{ id: string; name: string }>
export type Post = Readonly<{ id: string; title: string }>
export type Profile = Readonly<{
    user: User
    posts: ReadonlyArray<Post>
}>

export class UserNotFound extends Data.TaggedError("UserNotFound")<{
    readonly id: string
}> {}

export class PostsUnavailable extends Data.TaggedError("PostsUnavailable")<{
    readonly user_id: string
}> {}

export class UserRepo extends Context.Service<
    UserRepo,
    {
        readonly find: (id: string) => Effect.Effect<User, UserNotFound>
    }
>()("learn/GeneratorYield/UserRepo") {}

export class PostsRepo extends Context.Service<
    PostsRepo,
    {
        readonly forUser: (
            user_id: string
        ) => Effect.Effect<ReadonlyArray<Post>, PostsUnavailable>
    }
>()("learn/GeneratorYield/PostsRepo") {}

// A compiled example of the mechanism the visual lab explains:
// A becomes an ordinary local value after each yield*, while E and R compose.
export const profileProgram = Effect.gen(function* () {
    const users = yield* UserRepo
    const posts = yield* PostsRepo

    const user = yield* users.find("42")
    const user_posts = yield* posts.forUser(user.id)

    return { user, posts: user_posts } satisfies Profile
})

// A failed yielded Effect exits the generator before later statements run.
export const failFastProgram = Effect.gen(function* () {
    const user = yield* Effect.fail(new UserNotFound({ id: "missing" }))

    // This is unreachable at runtime after the failed yield* above.
    return yield* Effect.succeed(user)
})

// The explicit return makes the branch exit visible to TypeScript's own
// control-flow analysis as well as to Effect's runtime.
export const greet = (user: User | undefined) =>
    Effect.gen(function* () {
        if (user === undefined) {
            return yield* Effect.fail(new UserNotFound({ id: "42" }))
        }
        return `Hello, ${user.name}`
    })

export const Stage = S.Union([
    S.Literal("Unwrap"),
    S.Literal("Channels"),
    S.Literal("FailFast"),
    S.Literal("Narrowing"),
])
export type Stage = typeof Stage.Type
export const stages: ReadonlyArray<Stage> = [
    "Unwrap",
    "Channels",
    "FailFast",
    "Narrowing",
]

export const Step = S.Union([
    S.Literal(0),
    S.Literal(1),
    S.Literal(2),
    S.Literal(3),
])
export type Step = typeof Step.Type

export const FailurePoint = S.Union([
    S.Literal("None"),
    S.Literal("User"),
    S.Literal("Posts"),
])
export type FailurePoint = typeof FailurePoint.Type

export const NarrowingMode = S.Union([
    S.Literal("YieldOnly"),
    S.Literal("ReturnYield"),
])
export type NarrowingMode = typeof NarrowingMode.Type

export const Model = S.Struct({
    stage: Stage,
    unwrap_step: Step,
    unwrap_log: S.Array(S.String),
    channel_step: Step,
    failure_point: FailurePoint,
    fail_fast_has_run: S.Boolean,
    fail_fast_log: S.Array(S.String),
    narrowing_mode: NarrowingMode,
    user_is_present: S.Boolean,
})
export type Model = typeof Model.Type

export const SelectedGeneratorYieldStage = taggedStruct(
    "SelectedGeneratorYieldStage",
    {
        stage: Stage,
    }
)
export const ClickedAdvanceGeneratorYieldUnwrap = taggedStruct(
    "ClickedAdvanceGeneratorYieldUnwrap"
)
export const ClickedResetGeneratorYieldUnwrap = taggedStruct(
    "ClickedResetGeneratorYieldUnwrap"
)
export const ClickedAdvanceGeneratorYieldChannels = taggedStruct(
    "ClickedAdvanceGeneratorYieldChannels"
)
export const ClickedResetGeneratorYieldChannels = taggedStruct(
    "ClickedResetGeneratorYieldChannels"
)
export const SelectedGeneratorYieldFailurePoint = taggedStruct(
    "SelectedGeneratorYieldFailurePoint",
    {
        failure_point: FailurePoint,
    }
)
export const ClickedRunGeneratorYieldFailFast = taggedStruct(
    "ClickedRunGeneratorYieldFailFast"
)
export const ClickedResetGeneratorYieldFailFast = taggedStruct(
    "ClickedResetGeneratorYieldFailFast"
)
export const SelectedGeneratorYieldNarrowingMode = taggedStruct(
    "SelectedGeneratorYieldNarrowingMode",
    { mode: NarrowingMode }
)
export const ClickedToggleGeneratorYieldUserPresence = taggedStruct(
    "ClickedToggleGeneratorYieldUserPresence"
)

export const Message = S.Union([
    SelectedGeneratorYieldStage,
    ClickedAdvanceGeneratorYieldUnwrap,
    ClickedResetGeneratorYieldUnwrap,
    ClickedAdvanceGeneratorYieldChannels,
    ClickedResetGeneratorYieldChannels,
    SelectedGeneratorYieldFailurePoint,
    ClickedRunGeneratorYieldFailFast,
    ClickedResetGeneratorYieldFailFast,
    SelectedGeneratorYieldNarrowingMode,
    ClickedToggleGeneratorYieldUserPresence,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Unwrap",
    unwrap_step: 0,
    unwrap_log: [],
    channel_step: 0,
    failure_point: "Posts",
    fail_fast_has_run: false,
    fail_fast_log: [],
    narrowing_mode: "ReturnYield",
    user_is_present: false,
})

type UpdateReturn = Update.Return<Model, Message>

const next_step = (step: Step): Step =>
    step === 0 ? 1 : step === 1 ? 2 : step === 2 ? 3 : 3

const append = (
    values: ReadonlyArray<string>,
    value: string
): ReadonlyArray<string> => [...values, value]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedGeneratorYieldStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),
            ClickedAdvanceGeneratorYieldUnwrap: () => {
                const step = next_step(model.unwrap_step)
                if (step === model.unwrap_step) return { model, commands: [] }
                const entry =
                    step === 1
                        ? 'yield* users.find("42") → User { name: "Ada" }'
                        : step === 2
                          ? "yield* posts.forUser(user.id) → Post[2]"
                          : "return → Profile"
                return {
                    model: modifyFields(model, {
                        unwrap_step: () => step,
                        unwrap_log: (log) => append(log, entry),
                    }),
                    commands: [],
                }
            },
            ClickedResetGeneratorYieldUnwrap: () => ({
                model: modifyFields(model, {
                    unwrap_step: () => 0,
                    unwrap_log: () => [],
                }),
                commands: [],
            }),
            ClickedAdvanceGeneratorYieldChannels: () => ({
                model: modifyFields(model, {
                    channel_step: (step) => next_step(step),
                }),
                commands: [],
            }),
            ClickedResetGeneratorYieldChannels: () => ({
                model: modifyFields(model, { channel_step: () => 0 }),
                commands: [],
            }),
            SelectedGeneratorYieldFailurePoint: ({ failure_point }) => ({
                model: modifyFields(model, {
                    failure_point: () => failure_point,
                    fail_fast_has_run: () => false,
                    fail_fast_log: () => [],
                }),
                commands: [],
            }),
            ClickedRunGeneratorYieldFailFast: () => {
                const log: Array<string> = []
                if (model.failure_point === "User") {
                    log.push("findUser · started")
                    log.push("findUser · failed: UserNotFound")
                    log.push("generator · stopped")
                } else {
                    log.push("findUser · success")
                    log.push("loadPosts · started")
                    if (model.failure_point === "Posts") {
                        log.push("loadPosts · failed: PostsUnavailable")
                        log.push("generator · stopped")
                    } else {
                        log.push("loadPosts · success")
                        log.push("formatProfile · ran")
                        log.push("generator · returned Profile")
                    }
                }
                return {
                    model: modifyFields(model, {
                        fail_fast_has_run: () => true,
                        fail_fast_log: () => log,
                    }),
                    commands: [],
                }
            },
            ClickedResetGeneratorYieldFailFast: () => ({
                model: modifyFields(model, {
                    fail_fast_has_run: () => false,
                    fail_fast_log: () => [],
                }),
                commands: [],
            }),
            SelectedGeneratorYieldNarrowingMode: ({ mode }) => ({
                model: modifyFields(model, { narrowing_mode: () => mode }),
                commands: [],
            }),
            ClickedToggleGeneratorYieldUserPresence: () => ({
                model: modifyFields(model, {
                    user_is_present: (is_present) => !is_present,
                }),
                commands: [],
            }),
        })
    )

export type ChannelState = Readonly<{
    success: string
    error: string
    requirements: string
}>

export const channel_state = (step: Step): ChannelState => {
    if (step === 0) {
        return {
            success: "Effect.gen body",
            error: "never",
            requirements: "never",
        }
    }
    if (step === 1) {
        return {
            success: "User",
            error: "UserNotFound",
            requirements: "UserRepo",
        }
    }
    if (step === 2) {
        return {
            success: "Post[]",
            error: "UserNotFound | PostsUnavailable",
            requirements: "UserRepo | PostsRepo",
        }
    }
    return {
        success: "Profile",
        error: "UserNotFound | PostsUnavailable",
        requirements: "UserRepo | PostsRepo",
    }
}
