import { Match, Match as M, Option, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Match examples
// -----------------------------------------------------------------------------

// Match.value matches one value immediately.
const immediate_input: {
    readonly type: "user" | "admin"
    readonly name: string
} = {
    type: "user",
    name: "Ada",
}

export const immediate_match = Match.value(immediate_input).pipe(
    Match.when({ type: "user" }, (user) => `User: ${user.name}`),
    Match.when({ type: "admin" }, (admin) => `Admin: ${admin.name}`),
    Match.orElse(() => "Unknown")
)

// Match.type builds a reusable matcher function.
export const describe_primitive = Match.type<string | number | boolean>().pipe(
    Match.when(Match.string, (value) => `string:${value.toUpperCase()}`),
    Match.when(Match.number, (value) => `number:${value * 2}`),
    Match.when(Match.boolean, (value) => `boolean:${value ? "yes" : "no"}`),
    Match.exhaustive
)

export type User = Readonly<{
    role: "admin" | "editor" | "viewer"
    active: boolean
}>

// Patterns are ordered. More specific cases can come first.
export const access_label = Match.type<User>().pipe(
    Match.when({ role: "admin" }, () => "full access"),
    Match.when(
        {
            role: "editor",
            active: true,
        },
        () => "edit access"
    ),
    Match.when(
        {
            role: "editor",
            active: false,
        },
        () => "editor suspended"
    ),
    Match.when({ role: "viewer" }, () => "read only"),
    Match.exhaustive
)

export type RequestState =
    | Readonly<{ _tag: "Idle" }>
    | Readonly<{ _tag: "Loading" }>
    | Readonly<{
          _tag: "Success"
          data: string
      }>
    | Readonly<{
          _tag: "Error"
          message: string
      }>

// tagsExhaustive maps every member of a _tag discriminated union.
export const describe_state = Match.type<RequestState>().pipe(
    Match.tagsExhaustive({
        Idle: () => "Nothing requested",
        Loading: () => "Loading…",
        Success: ({ data }) => `Loaded: ${data}`,
        Error: ({ message }) => `Error: ${message}`,
    })
)

export type AccessRole = "admin" | "editor" | "viewer"

// Compile-time exhaustive matcher.
export const complete_role = Match.type<AccessRole>().pipe(
    Match.when("admin", () => "full access"),
    Match.when("editor", () => "edit access"),
    Match.when("viewer", () => "read only"),
    Match.exhaustive
)

// Partial matcher finalized as Option.
export const optional_role = Match.type<AccessRole>().pipe(
    Match.when("admin", () => "full access"),
    Match.when("editor", () => "edit access"),
    Match.option
)

// Partial matcher finalized as Result.
// Unmatched input becomes the Failure value.
export const result_role = Match.type<AccessRole>().pipe(
    Match.when("admin", () => "full access"),
    Match.when("editor", () => "edit access"),
    Match.result
)

// Partial matcher finalized with a default.
export const fallback_role = Match.type<AccessRole>().pipe(
    Match.when("admin", () => "full access"),
    Match.when("editor", () => "edit access"),
    Match.orElse((role) => `fallback:${role}`)
)

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Entry"),
    S.Literal("Patterns"),
    S.Literal("Tags"),
    S.Literal("Complete"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Entry",
    "Patterns",
    "Tags",
    "Complete",
]

export const EntryMode = S.Union([S.Literal("Value"), S.Literal("Type")])
export type EntryMode = typeof EntryMode.Type

export const PrimitiveKind = S.Union([
    S.Literal("String"),
    S.Literal("Number"),
    S.Literal("Boolean"),
])
export type PrimitiveKind = typeof PrimitiveKind.Type

export const Role = S.Union([
    S.Literal("admin"),
    S.Literal("editor"),
    S.Literal("viewer"),
])
export type Role = typeof Role.Type

export const StateKind = S.Union([
    S.Literal("Idle"),
    S.Literal("Loading"),
    S.Literal("Success"),
    S.Literal("Error"),
])
export type StateKind = typeof StateKind.Type

export const CompletionMode = S.Union([
    S.Literal("Exhaustive"),
    S.Literal("Option"),
    S.Literal("Result"),
    S.Literal("Fallback"),
])
export type CompletionMode = typeof CompletionMode.Type

export const Model = S.Struct({
    stage: Stage,

    entry_mode: EntryMode,
    primitive_kind: PrimitiveKind,

    pattern_role: Role,
    pattern_active: S.Boolean,

    state_kind: StateKind,

    completion_mode: CompletionMode,
    completion_role: Role,
})
export type Model = typeof Model.Type

export const SelectedMatchStage = taggedStruct("SelectedMatchStage", {
    stage: Stage,
})

export const SelectedMatchEntryMode = taggedStruct("SelectedMatchEntryMode", {
    entry_mode: EntryMode,
})

export const SelectedMatchPrimitiveKind = taggedStruct(
    "SelectedMatchPrimitiveKind",
    { primitive_kind: PrimitiveKind }
)

export const SelectedMatchPatternRole = taggedStruct(
    "SelectedMatchPatternRole",
    { pattern_role: Role }
)

export const ToggledMatchPatternActive = taggedStruct(
    "ToggledMatchPatternActive"
)

export const SelectedMatchStateKind = taggedStruct("SelectedMatchStateKind", {
    state_kind: StateKind,
})

export const SelectedMatchCompletionMode = taggedStruct(
    "SelectedMatchCompletionMode",
    { completion_mode: CompletionMode }
)

export const SelectedMatchCompletionRole = taggedStruct(
    "SelectedMatchCompletionRole",
    { completion_role: Role }
)

export const Message = S.Union([
    SelectedMatchStage,

    SelectedMatchEntryMode,
    SelectedMatchPrimitiveKind,

    SelectedMatchPatternRole,
    ToggledMatchPatternActive,

    SelectedMatchStateKind,

    SelectedMatchCompletionMode,
    SelectedMatchCompletionRole,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Entry",

    entry_mode: "Type",
    primitive_kind: "String",

    pattern_role: "editor",
    pattern_active: true,

    state_kind: "Success",

    completion_mode: "Exhaustive",
    completion_role: "viewer",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedMatchStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedMatchEntryMode: ({ entry_mode }) => ({
                model: modifyFields(model, {
                    entry_mode: () => entry_mode,
                }),
                commands: [],
            }),

            SelectedMatchPrimitiveKind: ({ primitive_kind }) => ({
                model: modifyFields(model, {
                    primitive_kind: () => primitive_kind,
                }),
                commands: [],
            }),

            SelectedMatchPatternRole: ({ pattern_role }) => ({
                model: modifyFields(model, {
                    pattern_role: () => pattern_role,
                }),
                commands: [],
            }),

            ToggledMatchPatternActive: () => ({
                model: modifyFields(model, {
                    pattern_active: (active) => !active,
                }),
                commands: [],
            }),

            SelectedMatchStateKind: ({ state_kind }) => ({
                model: modifyFields(model, {
                    state_kind: () => state_kind,
                }),
                commands: [],
            }),

            SelectedMatchCompletionMode: ({ completion_mode }) => ({
                model: modifyFields(model, {
                    completion_mode: () => completion_mode,
                }),
                commands: [],
            }),

            SelectedMatchCompletionRole: ({ completion_role }) => ({
                model: modifyFields(model, {
                    completion_role: () => completion_role,
                }),
                commands: [],
            }),
        })
    )

export const primitive_value = (
    kind: PrimitiveKind
): string | number | boolean => {
    switch (kind) {
        case "String":
            return "hello"
        case "Number":
            return 21
        case "Boolean":
            return true
    }
}

export const entry_output = (model: Model): string => {
    if (model.entry_mode === "Value") {
        return Match.value(primitive_value(model.primitive_kind)).pipe(
            Match.when(
                Match.string,
                (value) => `string:${value.toUpperCase()}`
            ),
            Match.when(Match.number, (value) => `number:${value * 2}`),
            Match.when(
                Match.boolean,
                (value) => `boolean:${value ? "yes" : "no"}`
            ),
            Match.exhaustive
        )
    }

    return describe_primitive(primitive_value(model.primitive_kind))
}

export const pattern_user = (model: Model): User => ({
    role: model.pattern_role,
    active: model.pattern_active,
})

export const pattern_output = (model: Model): string =>
    // This expression is not callable. Type 'never' has no call signatures.
    access_label(pattern_user(model))

export const request_state = (kind: StateKind): RequestState => {
    switch (kind) {
        case "Idle":
            return { _tag: "Idle" }
        case "Loading":
            return { _tag: "Loading" }
        case "Success":
            return {
                _tag: "Success",
                data: "Ada",
            }
        case "Error":
            return {
                _tag: "Error",
                message: "timeout",
            }
    }
}

export const state_output = (kind: StateKind): string =>
    describe_state(request_state(kind))

export const completion_output = (
    model: Model
): Readonly<{
    output: string
    tone: "success" | "none" | "failure" | "fallback"
    detail: string
}> => {
    const role = model.completion_role

    switch (model.completion_mode) {
        case "Exhaustive":
            return {
                output: complete_role(role),
                tone: "success",
                detail: "All three Role cases are handled. Removing one handler makes Match.exhaustive fail to type-check.",
            }

        case "Option": {
            const result = optional_role(role)
            return Option.match(result, {
                onNone: () => ({
                    output: "Option.none()",
                    tone: "none" as const,
                    detail: "Unmatched input is expected and becomes None.",
                }),
                onSome: (value) => ({
                    output: `Option.some(${JSON.stringify(value)})`,
                    tone: "success" as const,
                    detail: "Matched output is wrapped in Some.",
                }),
            })
        }

        case "Result": {
            const result = result_role(role)
            return Result.match(result, {
                onSuccess: (value) => ({
                    output: `Success(${JSON.stringify(value)})`,
                    tone: "success" as const,
                    detail: "A matched case becomes Result.Success.",
                }),
                onFailure: (unmatched) => ({
                    output: `Failure(${JSON.stringify(unmatched)})`,
                    tone: "failure" as const,
                    detail: "The unmatched input itself is preserved in Result.Failure.",
                }),
            })
        }

        case "Fallback":
            return {
                output: fallback_role(role),
                tone: role === "viewer" ? "fallback" : "success",
                detail: "orElse always produces a concrete output for any case left unmatched.",
            }
    }
}
