import { Data, Effect, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

export class UserNotFound extends Data.TaggedError("UserNotFound")<{
    readonly id: string
}> {}

export class PermissionDenied extends Data.TaggedError("PermissionDenied")<{
    readonly id: string
    readonly action: string
}> {}

export class RateLimited extends Data.TaggedError("RateLimited")<{
    readonly retry_after_ms: number
}> {}

export type DomainError = UserNotFound | PermissionDenied | RateLimited
export type User = Readonly<{ id: string; name: string }>

export const ErrorTag = S.Union([
    S.Literal("UserNotFound"),
    S.Literal("PermissionDenied"),
    S.Literal("RateLimited"),
])
export type ErrorTag = typeof ErrorTag.Type
export const error_tags: ReadonlyArray<ErrorTag> = [
    "UserNotFound",
    "PermissionDenied",
    "RateLimited",
]

export const Scenario = S.Union([S.Literal("Success"), ErrorTag])
export type Scenario = typeof Scenario.Type
export const scenarios: ReadonlyArray<Scenario> = ["Success", ...error_tags]

export const Stage = S.Union([
    S.Literal("Define"),
    S.Literal("Channel"),
    S.Literal("CatchOne"),
    S.Literal("CatchMany"),
])
export type Stage = typeof Stage.Type
export const stages: ReadonlyArray<Stage> = [
    "Define",
    "Channel",
    "CatchOne",
    "CatchMany",
]

export const Model = S.Struct({
    stage: Stage,
    scenario: Scenario,
    caught_tag: ErrorTag,
    caught_tags: S.Array(ErrorTag),
    has_run: S.Boolean,
})
export type Model = typeof Model.Type

export const SelectedTaggedErrorsStage = taggedStruct(
    "SelectedTaggedErrorsStage",
    {
        stage: Stage,
    }
)
export const SelectedTaggedErrorsScenario = taggedStruct(
    "SelectedTaggedErrorsScenario",
    {
        scenario: Scenario,
    }
)
export const SelectedCaughtTag = taggedStruct("SelectedTaggedErrorsCaughtTag", {
    tag: ErrorTag,
})
export const ToggledCaughtTag = taggedStruct("ToggledTaggedErrorsCaughtTag", {
    tag: ErrorTag,
})
export const ClickedRunTaggedErrors = taggedStruct("ClickedRunTaggedErrors")

export const Message = S.Union([
    SelectedTaggedErrorsStage,
    SelectedTaggedErrorsScenario,
    SelectedCaughtTag,
    ToggledCaughtTag,
    ClickedRunTaggedErrors,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Define",
    scenario: "UserNotFound",
    caught_tag: "UserNotFound",
    caught_tags: ["UserNotFound", "PermissionDenied"],
    has_run: false,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedTaggedErrorsStage: ({ stage }) => ({
                model: evo(model, { stage: () => stage, has_run: () => false }),
                commands: [],
            }),
            SelectedTaggedErrorsScenario: ({ scenario }) => ({
                model: evo(model, {
                    scenario: () => scenario,
                    has_run: () => false,
                }),
                commands: [],
            }),
            SelectedTaggedErrorsCaughtTag: ({ tag }) => ({
                model: evo(model, {
                    caught_tag: () => tag,
                    has_run: () => false,
                }),
                commands: [],
            }),
            ToggledTaggedErrorsCaughtTag: ({ tag }) => ({
                model: evo(model, {
                    caught_tags: (tags) =>
                        tags.includes(tag)
                            ? tags.filter((current) => current !== tag)
                            : [...tags, tag],
                    has_run: () => false,
                }),
                commands: [],
            }),
            ClickedRunTaggedErrors: () => ({
                model: evo(model, { has_run: () => true }),
                commands: [],
            }),
        })
    )

export const loadUser = (
    scenario: Scenario
): Effect.Effect<User, DomainError> =>
    Effect.gen(function* () {
        if (scenario === "UserNotFound") {
            return yield* new UserNotFound({ id: "42" })
        }
        if (scenario === "PermissionDenied") {
            return yield* new PermissionDenied({ id: "42", action: "read" })
        }
        if (scenario === "RateLimited") {
            return yield* new RateLimited({ retry_after_ms: 1500 })
        }
        return { id: "42", name: "Ada" }
    })

// catchTag removes UserNotFound from the typed error channel while leaving the
// other tagged errors untouched.
export const recoverNotFound = (scenario: Scenario) =>
    loadUser(scenario).pipe(
        Effect.catchTag("UserNotFound", (error) =>
            Effect.succeed<User>({ id: error.id, name: "Guest" })
        )
    )

// catchTags gives each handler its already-narrowed tagged error. Handling all
// three cases removes every expected failure from the resulting error channel.
export const recoverAll = (scenario: Scenario) =>
    loadUser(scenario).pipe(
        Effect.catchTags({
            UserNotFound: (error) =>
                Effect.succeed<User>({ id: error.id, name: "Guest" }),
            PermissionDenied: (error) =>
                Effect.succeed<User>({ id: error.id, name: "Read-only" }),
            RateLimited: (_error) =>
                Effect.succeed<User>({ id: "42", name: "Cached Ada" }),
        })
    )

export type Outcome =
    | Readonly<{ _tag: "Success"; user: User }>
    | Readonly<{ _tag: "Failure"; error: DomainError }>
    | Readonly<{ _tag: "Recovered"; from: ErrorTag; value: string }>

export const raw_outcome = (scenario: Scenario): Outcome => {
    switch (scenario) {
        case "Success":
            return {
                _tag: "Success",
                user: { id: "42", name: "Ada" },
            }
        case "UserNotFound":
            return {
                _tag: "Failure",
                error: new UserNotFound({ id: "42" }),
            }
        case "PermissionDenied":
            return {
                _tag: "Failure",
                error: new PermissionDenied({ id: "42", action: "read" }),
            }
        case "RateLimited":
            return {
                _tag: "Failure",
                error: new RateLimited({ retry_after_ms: 1500 }),
            }
    }
}

export const recovered_outcome = (
    scenario: Scenario,
    caught_tags: ReadonlyArray<ErrorTag>
): Outcome => {
    const outcome = raw_outcome(scenario)
    if (
        outcome._tag !== "Failure" ||
        !caught_tags.includes(outcome.error._tag)
    ) {
        return outcome
    }
    switch (outcome.error._tag) {
        case "UserNotFound":
            return {
                _tag: "Recovered",
                from: outcome.error._tag,
                value: `Guest for ${outcome.error.id}`,
            }
        case "PermissionDenied":
            return {
                _tag: "Recovered",
                from: outcome.error._tag,
                value: "Read-only profile",
            }
        case "RateLimited":
            return {
                _tag: "Recovered",
                from: outcome.error._tag,
                value: `Cached user · retry ${outcome.error.retry_after_ms} ms`,
            }
    }
}

export const remaining_errors = (
    caught_tags: ReadonlyArray<ErrorTag>
): ReadonlyArray<ErrorTag> =>
    error_tags.filter((tag) => !caught_tags.includes(tag))

export const channel_label = (tags: ReadonlyArray<ErrorTag>): string =>
    tags.length === 0 ? "never" : tags.join(" | ")

export const error_fields = (
    tag: ErrorTag
): ReadonlyArray<Readonly<[string, string]>> => {
    switch (tag) {
        case "UserNotFound":
            return [["id", "42"]]
        case "PermissionDenied":
            return [
                ["id", "42"],
                ["action", "read"],
            ]
        case "RateLimited":
            return [["retry_after_ms", "1500"]]
    }
}
