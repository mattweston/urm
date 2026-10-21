import { Array as Arr, Match as M, Schema as S, Symbol as Sym } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Symbol examples
// -----------------------------------------------------------------------------

// Effect's Symbol module intentionally exposes one focused runtime guard.
export const is_global_symbol = Sym.isSymbol(globalThis.Symbol.for("app/user"))

export const is_string_symbol = Sym.isSymbol("app/user")

// The type predicate narrows unknown -> symbol.
export const describe_symbol = (value: unknown): string => {
    if (!Sym.isSymbol(value)) {
        return "not a symbol"
    }

    // value is symbol here.
    const registry_key = globalThis.Symbol.keyFor(value)

    return registry_key === undefined
        ? `local symbol: ${value.description ?? "(no description)"}`
        : `global symbol: ${registry_key}`
}

// Refinement composes with Effect Array.filter.
export const mixed_values: ReadonlyArray<unknown> = [
    globalThis.Symbol.for("user"),
    "user",
    42,
    globalThis.Symbol("local"),
    null,
]

export const only_symbols = Arr.filter(mixed_values, Sym.isSymbol)
// inferred: Array<symbol>

// Native JavaScript identity examples, included to explain why symbols are
// useful identifiers after the Effect guard has narrowed the boundary value.
export const LocalA = globalThis.Symbol("token")
export const LocalB = globalThis.Symbol("token")
export const GlobalA = globalThis.Symbol.for("token")
export const GlobalB = globalThis.Symbol.for("token")

export const local_symbols_are_equal = LocalA === LocalB
export const global_symbols_are_equal = GlobalA === GlobalB

// Symbols can be object keys without colliding with string keys.
export const Secret = globalThis.Symbol("secret")

export const keyed_object = {
    visible: "public",
    [Secret]: "private",
}

export const string_keys = Object.keys(keyed_object)
export const symbol_keys = Object.getOwnPropertySymbols(keyed_object)
export const all_keys = Reflect.ownKeys(keyed_object)

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Guard"),
    S.Literal("Refine"),
    S.Literal("Filter"),
    S.Literal("Identity"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Guard",
    "Refine",
    "Filter",
    "Identity",
]

export const BoundaryKind = S.Union([
    S.Literal("GlobalSymbol"),
    S.Literal("LocalSymbol"),
    S.Literal("String"),
    S.Literal("Number"),
    S.Literal("Null"),
])
export type BoundaryKind = typeof BoundaryKind.Type

export const IdentityMode = S.Union([
    S.Literal("Local"),
    S.Literal("Global"),
    S.Literal("Keys"),
])
export type IdentityMode = typeof IdentityMode.Type

export const Model = S.Struct({
    stage: Stage,

    boundary_kind: BoundaryKind,

    refine_kind: BoundaryKind,

    filter_include_local: S.Boolean,
    filter_include_global: S.Boolean,

    identity_mode: IdentityMode,
})
export type Model = typeof Model.Type

export const SelectedSymbolStage = taggedStruct("SelectedSymbolStage", {
    stage: Stage,
})

export const SelectedSymbolBoundaryKind = taggedStruct(
    "SelectedSymbolBoundaryKind",
    { boundary_kind: BoundaryKind }
)

export const SelectedSymbolRefineKind = taggedStruct(
    "SelectedSymbolRefineKind",
    { refine_kind: BoundaryKind }
)

export const ToggledLocalSymbolInFilter = taggedStruct(
    "ToggledLocalSymbolInFilter"
)
export const ToggledGlobalSymbolInFilter = taggedStruct(
    "ToggledGlobalSymbolInFilter"
)

export const SelectedSymbolIdentityMode = taggedStruct(
    "SelectedSymbolIdentityMode",
    { identity_mode: IdentityMode }
)

export const Message = S.Union([
    SelectedSymbolStage,

    SelectedSymbolBoundaryKind,

    SelectedSymbolRefineKind,

    ToggledLocalSymbolInFilter,
    ToggledGlobalSymbolInFilter,

    SelectedSymbolIdentityMode,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Guard",

    boundary_kind: "GlobalSymbol",

    refine_kind: "LocalSymbol",

    filter_include_local: true,
    filter_include_global: true,

    identity_mode: "Local",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedSymbolStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedSymbolBoundaryKind: ({ boundary_kind }) => ({
                model: modifyFields(model, {
                    boundary_kind: () => boundary_kind,
                }),
                commands: [],
            }),

            SelectedSymbolRefineKind: ({ refine_kind }) => ({
                model: modifyFields(model, {
                    refine_kind: () => refine_kind,
                }),
                commands: [],
            }),

            ToggledLocalSymbolInFilter: () => ({
                model: modifyFields(model, {
                    filter_include_local: (value) => !value,
                }),
                commands: [],
            }),

            ToggledGlobalSymbolInFilter: () => ({
                model: modifyFields(model, {
                    filter_include_global: (value) => !value,
                }),
                commands: [],
            }),

            SelectedSymbolIdentityMode: ({ identity_mode }) => ({
                model: modifyFields(model, {
                    identity_mode: () => identity_mode,
                }),
                commands: [],
            }),
        })
    )

export const value_for_kind = (kind: BoundaryKind): unknown => {
    switch (kind) {
        case "GlobalSymbol":
            return globalThis.Symbol.for("app/user")
        case "LocalSymbol":
            return globalThis.Symbol("app/user")
        case "String":
            return "app/user"
        case "Number":
            return 42
        case "Null":
            return null
    }
}

export const value_label = (kind: BoundaryKind): string => {
    switch (kind) {
        case "GlobalSymbol":
            return 'Symbol.for("app/user")'
        case "LocalSymbol":
            return 'Symbol("app/user")'
        case "String":
            return '"app/user"'
        case "Number":
            return "42"
        case "Null":
            return "null"
    }
}

export const guard_result = (kind: BoundaryKind): boolean =>
    Sym.isSymbol(value_for_kind(kind))

export const refined_description = (kind: BoundaryKind): string =>
    describe_symbol(value_for_kind(kind))

export const filter_source = (model: Model): ReadonlyArray<unknown> => [
    ...(model.filter_include_global ? [globalThis.Symbol.for("user")] : []),
    "user",
    42,
    ...(model.filter_include_local ? [globalThis.Symbol("local")] : []),
    null,
]

export const filtered_symbols = (model: Model): Array<symbol> =>
    Arr.filter(filter_source(model), Sym.isSymbol)

export const unknown_label = (value: unknown): string => {
    if (Sym.isSymbol(value)) {
        const key = globalThis.Symbol.keyFor(value)
        return key === undefined
            ? `Symbol(${value.description ?? ""})`
            : `Symbol.for(${key})`
    }
    if (typeof value === "string") {
        return `"${value}"`
    }
    return String(value)
}

export const identity_result = (
    mode: IdentityMode
): Readonly<{
    headline: string
    detail: string
    left: string
    right: string
}> => {
    switch (mode) {
        case "Local":
            return {
                headline: "false",
                detail: "Two Symbol(description) calls create two different identities.",
                left: 'Symbol("token")',
                right: 'Symbol("token")',
            }
        case "Global":
            return {
                headline: "true",
                detail: "Symbol.for(key) reads from the global symbol registry, so the same key resolves to the same symbol.",
                left: 'Symbol.for("token")',
                right: 'Symbol.for("token")',
            }
        case "Keys":
            return {
                headline: "symbol key stays separate",
                detail: "Object.keys sees only string keys; Reflect.ownKeys and getOwnPropertySymbols can see the symbol key.",
                left: 'Object.keys → ["visible"]',
                right: "Reflect.ownKeys → visible + Symbol(secret)",
            }
    }
}
