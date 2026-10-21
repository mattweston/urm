import { Match as M, Option, Result, Schema as S, Unify } from "effect"
import type { Effect, Types } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Unify examples
// -----------------------------------------------------------------------------

type Assert<T extends true> = T

export type OptionUnion = Option.Option<string> | Option.Option<number>

export type UnifiedOption = Unify.Unify<OptionUnion>

export type OptionUnifiesToPublicType = Assert<
    Types.Equals<UnifiedOption, Option.Option<string | number>>
>

export type ResultUnion =
    | Result.Result<string, "err-1">
    | Result.Result<number, "err-2">

export type UnifiedResult = Unify.Unify<ResultUnion>

export type ResultUnifiesToPublicType = Assert<
    Types.Equals<
        UnifiedResult,
        Result.Result<string | number, "err-1" | "err-2">
    >
>

export type EffectUnion =
    | Effect.Effect<string, "err-1", "dep-1">
    | Effect.Effect<number, "err-2", "dep-2">

export type UnifiedEffect = Unify.Unify<EffectUnion>

export type EffectUnifiesToPublicType = Assert<
    Types.Equals<
        UnifiedEffect,
        Effect.Effect<string | number, "err-1" | "err-2", "dep-1" | "dep-2">
    >
>

// The three protocol symbol types are exported as well as their declared
// unique-symbol keys. They are meant for type positions, not runtime lookup.
export type UnifySymbolType = Unify.unifySymbol
export type TypeSymbolType = Unify.typeSymbol
export type IgnoreSymbolType = Unify.ignoreSymbol

export interface TextProtocol {
    readonly kind: "TextProtocol"
    readonly value: string
    [Unify.typeSymbol]?: string
    [Unify.unifySymbol]?: {
        readonly Public: () => string
    }
}

export interface NumberProtocol {
    readonly kind: "NumberProtocol"
    readonly value: number
    [Unify.typeSymbol]?: number
    [Unify.unifySymbol]?: {
        readonly Public: () => number
    }
}

export type CustomProtocolUnion = TextProtocol | NumberProtocol
export type UnifiedCustomProtocol = Unify.Unify<CustomProtocolUnion>

export type CustomProtocolUnifies = Assert<
    Types.Equals<UnifiedCustomProtocol, string | number>
>

export interface VisibleAndDebug<A> {
    readonly value: A
    [Unify.typeSymbol]?: A
    [Unify.unifySymbol]?: {
        readonly Public: () => A
        readonly Debug: () => { readonly debug: A }
    }
    [Unify.ignoreSymbol]?: {
        readonly Debug: true
    }
}

export interface VisibleAndDebugWithoutIgnore<A> {
    readonly value: A
    [Unify.typeSymbol]?: A
    [Unify.unifySymbol]?: {
        readonly Public: () => A
        readonly Debug: () => { readonly debug: A }
    }
}

export type IgnoredDebug = Unify.Unify<VisibleAndDebug<string>>
export type IncludedDebug = Unify.Unify<VisibleAndDebugWithoutIgnore<string>>

export type IgnoreSymbolRemovesProtocolEntry = Assert<
    Types.Equals<IgnoredDebug, string>
>

export type WithoutIgnoreBothEntriesContribute = Assert<
    Types.Equals<IncludedDebug, string | { readonly debug: string }>
>

export const option_string_or_number = (
    kind: "String" | "Number"
): OptionUnion => (kind === "String" ? Option.some("Ada") : Option.some(42))

export const unified_option_factory = Unify.unify(option_string_or_number)

export type UnifiedOptionFactoryReturn = ReturnType<
    typeof unified_option_factory
>

export type UnifiedOptionFactoryCheck = Assert<
    Types.Equals<UnifiedOptionFactoryReturn, Option.Option<string | number>>
>

export const result_string_or_number = (
    kind: "String" | "Number",
    should_fail: boolean
): ResultUnion => {
    if (should_fail) {
        return kind === "String" ? Result.fail("err-1") : Result.fail("err-2")
    }

    return kind === "String" ? Result.succeed("Ada") : Result.succeed(42)
}

export const unified_result_factory = Unify.unify(result_string_or_number)

export const curried_option_factory =
    (prefix: string) =>
    (kind: "String" | "Number"): OptionUnion =>
        kind === "String" ? Option.some(`${prefix}Ada`) : Option.some(42)

export const unified_curried_option_factory = Unify.unify(
    curried_option_factory
)

export type UnifiedCurriedOptionReturn = ReturnType<
    ReturnType<typeof unified_curried_option_factory>
>

export type UnifiedCurriedOptionCheck = Assert<
    Types.Equals<UnifiedCurriedOptionReturn, Option.Option<string | number>>
>

export const plain_value = {
    answer: 42,
} as const

export const unified_plain_value = Unify.unify(plain_value)

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["BuiltIns", "Protocol", "Ignore", "Helper"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "BuiltIns",
    "Protocol",
    "Ignore",
    "Helper",
]

export const BuiltInMode = S.Literals(["Option", "Result", "Effect"])
export type BuiltInMode = typeof BuiltInMode.Type

export const ValueKind = S.Literals(["String", "Number"])
export type ValueKind = typeof ValueKind.Type

export const HelperMode = S.Literals(["Value", "Function", "Curried"])
export type HelperMode = typeof HelperMode.Type

export const Model = S.Struct({
    stage: Stage,
    builtInMode: BuiltInMode,
    valueKind: ValueKind,
    resultShouldFail: S.Boolean,
    helperMode: HelperMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedUnifyStage: {
        stage: Stage,
    },
    SelectedUnifyBuiltInMode: {
        builtInMode: BuiltInMode,
    },
    SelectedUnifyValueKind: {
        valueKind: ValueKind,
    },
    ToggledUnifyResultFailure: {},
    SelectedUnifyHelperMode: {
        helperMode: HelperMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "BuiltIns",
    builtInMode: "Option",
    valueKind: "String",
    resultShouldFail: false,
    helperMode: "Function",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
        SelectedUnifyStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),
        SelectedUnifyBuiltInMode: ({ builtInMode }) => ({
            model: modifyFields(model, {
                builtInMode: () => builtInMode,
            }),
        }),
        SelectedUnifyValueKind: ({ valueKind }) => ({
            model: modifyFields(model, {
                valueKind: () => valueKind,
            }),
        }),
        ToggledUnifyResultFailure: () => ({
            model: modifyFields(model, {
                resultShouldFail: (value) => !value,
            }),
        }),
        SelectedUnifyHelperMode: ({ helperMode }) => ({
            model: modifyFields(model, {
                helperMode: () => helperMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const built_in_raw_type = (mode: BuiltInMode): string => {
    switch (mode) {
        case "Option":
            return "Option<string> | Option<number>"
        case "Result":
            return 'Result<string, "err-1"> | Result<number, "err-2">'
        case "Effect":
            return 'Effect<string, "err-1", "dep-1"> | Effect<number, "err-2", "dep-2">'
    }
}

export const built_in_unified_type = (mode: BuiltInMode): string => {
    switch (mode) {
        case "Option":
            return "Option<string | number>"
        case "Result":
            return 'Result<string | number, "err-1" | "err-2">'
        case "Effect":
            return 'Effect<string | number, "err-1" | "err-2", "dep-1" | "dep-2">'
    }
}

export const format_option = (option: Option.Option<string | number>): string =>
    Option.match(option, {
        onNone: () => "None",
        onSome: (value) => `Some(${JSON.stringify(value)})`,
    })

export const format_result = (
    result: Result.Result<string | number, "err-1" | "err-2">
): string =>
    Result.match(result, {
        onSuccess: (value) => `Success(${JSON.stringify(value)})`,
        onFailure: (error) => `Failure(${JSON.stringify(error)})`,
    })

export const built_in_runtime_value = (model: Model): string => {
    switch (model.builtInMode) {
        case "Option":
            return format_option(unified_option_factory(model.valueKind))
        case "Result":
            return format_result(
                unified_result_factory(model.valueKind, model.resultShouldFail)
            )
        case "Effect":
            return "type-only example · Effect is not executed by this panel"
    }
}

export const protocol_symbols: ReadonlyArray<
    Readonly<{
        name: string
        purpose: string
    }>
> = [
    {
        name: "typeSymbol",
        purpose: "carries the source union that the protocol reads",
    },
    {
        name: "unifySymbol",
        purpose: "maps protocol entries to the public widened type",
    },
    {
        name: "ignoreSymbol",
        purpose: "removes named protocol entries from that widening",
    },
]

export const protocol_input_type = (kind: ValueKind): string =>
    kind === "String" ? "TextProtocol" : "NumberProtocol"

export const protocol_witness = (kind: ValueKind): string =>
    kind === "String" ? '"Ada"' : "42"

export const ignored_protocol_type = (): string =>
    "Unify<VisibleAndDebug<string>> → string"

export const included_protocol_type = (): string =>
    "Unify<VisibleAndDebugWithoutIgnore<string>> → string | { readonly debug: string }"

export const helper_expression = (mode: HelperMode): string => {
    switch (mode) {
        case "Value":
            return "Unify.unify({ answer: 42 })"
        case "Function":
            return "Unify.unify(option_string_or_number)(kind)"
        case "Curried":
            return 'Unify.unify(curried_option_factory)("value:")(kind)'
    }
}

export const helper_runtime_value = (
    mode: HelperMode,
    kind: ValueKind
): string => {
    switch (mode) {
        case "Value":
            return JSON.stringify(unified_plain_value)
        case "Function":
            return format_option(unified_option_factory(kind))
        case "Curried":
            return format_option(unified_curried_option_factory("value:")(kind))
    }
}

export const helper_type_result = (mode: HelperMode): string => {
    switch (mode) {
        case "Value":
            return "same value type (no protocol union to normalize)"
        case "Function":
            return "(kind) => Option<string | number>"
        case "Curried":
            return "(prefix) => (kind) => Option<string | number>"
    }
}
