import { RegExp as RegExpModule, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL REGEXP PROGRAMS
// -----------------------------------------------------------------------------

export const native_constructor_same = RegExpModule.RegExp === globalThis.RegExp

export const hello_pattern = new RegExpModule.RegExp("hello", "i")

export const hello_matches = {
    upper: hello_pattern.test("Hello World"),
    miss: hello_pattern.test("goodbye"),
} as const

export const describe_unknown = (input: unknown): string => {
    if (
        !RegExpModule.isRegExp(input) ||
        !(input instanceof globalThis.RegExp)
    ) {
        return "not a RegExp"
    }

    return `/${input.source}/${input.flags}`
}

export const special_text = "price: $5.00 + tax?"
export const escaped_special_text = RegExpModule.escape(special_text)

export const literal_pattern = (text: string): RegExp =>
    new RegExpModule.RegExp(`^${RegExpModule.escape(text)}$`, "u")

export type LiteralProbe = Readonly<{
    source: string
    exact: boolean
    extra: boolean
}>

export const literal_probe = (text: string): LiteralProbe => {
    const pattern = literal_pattern(text)

    return {
        source: pattern.source,
        exact: pattern.test(text),
        extra: pattern.test(`${text}!`),
    }
}

export type StatefulProbe = Readonly<{
    first: boolean
    afterFirst: number
    second: boolean
    afterSecond: number
    third: boolean
    afterThird: number
}>

export const stateful_probe = (): StatefulProbe => {
    const pattern = new RegExpModule.RegExp("a", "g")
    const input = "a a"

    const first = pattern.test(input)
    const afterFirst = pattern.lastIndex
    const second = pattern.test(input)
    const afterSecond = pattern.lastIndex
    const third = pattern.test(input)
    const afterThird = pattern.lastIndex

    return {
        first,
        afterFirst,
        second,
        afterSecond,
        third,
        afterThird,
    }
}

export type FlagProbe = Readonly<{
    valid: boolean
    invalidMessage: string
}>

export const flag_probe = (): FlagProbe => {
    const valid = new RegExpModule.RegExp("hello", "iu").test("HELLO")

    let invalidMessage = ""

    try {
        new RegExpModule.RegExp("hello", "not-a-flag")
    } catch (error: unknown) {
        invalidMessage = error instanceof Error ? error.name : "unknown error"
    }

    return {
        valid,
        invalidMessage,
    }
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Construct"),
    S.Literal("Narrow"),
    S.Literal("Escape"),
    S.Literal("Compose"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Construct",
    "Narrow",
    "Escape",
    "Compose",
]

export const ConstructCase = S.Union([
    S.Literal("Alias"),
    S.Literal("Pattern"),
    S.Literal("Flags"),
    S.Literal("Native"),
])
export type ConstructCase = typeof ConstructCase.Type

export const construct_cases: ReadonlyArray<ConstructCase> = [
    "Alias",
    "Pattern",
    "Flags",
    "Native",
]

export const NarrowCase = S.Union([
    S.Literal("RegExp"),
    S.Literal("String"),
    S.Literal("Unknown"),
    S.Literal("Instanceof"),
])
export type NarrowCase = typeof NarrowCase.Type

export const narrow_cases: ReadonlyArray<NarrowCase> = [
    "RegExp",
    "String",
    "Unknown",
    "Instanceof",
]

export const EscapeCase = S.Union([
    S.Literal("Meta"),
    S.Literal("Plain"),
    S.Literal("Slash"),
    S.Literal("Backslash"),
])
export type EscapeCase = typeof EscapeCase.Type

export const escape_cases: ReadonlyArray<EscapeCase> = [
    "Meta",
    "Plain",
    "Slash",
    "Backslash",
]

export const ComposeCase = S.Union([
    S.Literal("Literal"),
    S.Literal("Anchors"),
    S.Literal("Flags"),
    S.Literal("State"),
])
export type ComposeCase = typeof ComposeCase.Type

export const compose_cases: ReadonlyArray<ComposeCase> = [
    "Literal",
    "Anchors",
    "Flags",
    "State",
]

export const Model = S.Struct({
    stage: Stage,
    constructCase: ConstructCase,
    narrowCase: NarrowCase,
    escapeCase: EscapeCase,
    composeCase: ComposeCase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Construct: {
        eyebrow: "the Effect namespace exposes JavaScript's native constructor",
        title: "Construct ordinary RegExp values without leaving the Effect namespace",
        description:
            "RegExp.RegExp is globalThis.RegExp. Patterns created through it are normal JavaScript RegExp instances with the same source, flags, methods, lastIndex behavior, and constructor errors.",
        code: `const pattern =
    new RegExp.RegExp(
        "hello",
        "i"
    )

pattern.test("Hello World")
// true

RegExp.RegExp ===
    globalThis.RegExp
// true`,
        apis: ["RegExp.RegExp", "globalThis.RegExp"],
        notice: "This module does not introduce a new regular-expression runtime. The constructor export is an alias to the native JavaScript constructor, so normal JavaScript RegExp semantics still apply.",
    },

    Narrow: {
        eyebrow: "unknown input can be narrowed before RegExp-specific access",
        title: "Use isRegExp as a type guard at mixed or untyped boundaries",
        description:
            "RegExp.isRegExp accepts unknown and narrows successful values to the native RegExp type. The vendored Effect implementation delegates to Predicate.isRegExp, which uses instanceof RegExp.",
        code: `const describe = (
    input: unknown
): string =>
    RegExp.isRegExp(input)
        ? input.source
        : "not a regexp"

RegExp.isRegExp(/a/)
// true

RegExp.isRegExp("a")
// false`,
        apis: ["RegExp.isRegExp", "Predicate.isRegExp"],
        notice: "The guard answers whether a value is already a native RegExp. It does not parse strings into patterns and it does not validate arbitrary pattern source text.",
    },

    Escape: {
        eyebrow: "turn data into literal pattern source",
        title: "Escape metacharacters before embedding dynamic text in a pattern",
        description:
            "RegExp.escape prefixes JavaScript regular-expression syntax characters with a backslash. Ordinary characters are left alone, so user or data-driven text can be inserted as a literal fragment rather than interpreted as pattern operators.",
        code: `const text =
    "price: $5.00 + tax?"

const escaped =
    RegExp.escape(text)

const exact =
    new RegExp.RegExp(
        \`^\${escaped}$\`,
        "u"
    )`,
        apis: ["RegExp.escape", "RegExp.RegExp"],
        notice: "escape is for pattern source. It does not choose flags, add anchors, parse replacement strings, or decide the surrounding regular-expression structure for you.",
    },

    Compose: {
        eyebrow:
            "safe literal fragments still live inside native RegExp semantics",
        title: "Compose dynamic patterns while keeping structure and state explicit",
        description:
            "A common pattern is to escape dynamic text, then add trusted structure such as anchors or prefixes. Flags remain constructor input, and stateful g/y expressions still mutate lastIndex during test or exec calls.",
        code: `const literal = (
    text: string
) =>
    new RegExp.RegExp(
        \`^\${RegExp.escape(text)}$\`,
        "u"
    )

literal("a*b").test("a*b")
// true`,
        apis: ["RegExp.escape", "RegExp.RegExp", "RegExp.prototype.lastIndex"],
        notice: "Escaping the dynamic fragment prevents that fragment from becoming regex syntax. It does not make every surrounding pattern automatically safe or stateless; the trusted shell and flags remain your responsibility.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const construct_snapshot = (model: Model): Snapshot => {
    switch (model.constructCase) {
        case "Alias":
            return {
                input: "RegExp.RegExp",
                operation: "compare with globalThis.RegExp",
                result: String(native_constructor_same),
                invariant: "Effect exposes the native constructor itself",
                implementation: "export const RegExp = globalThis.RegExp",
                guidance:
                    "Use the Effect namespace when you want one import surface without changing JavaScript RegExp behavior.",
            }

        case "Pattern":
            return {
                input: 'new RegExp.RegExp("hello", "i")',
                operation: 'test("Hello World") · test("goodbye")',
                result: `${String(hello_matches.upper)} · ${String(hello_matches.miss)}`,
                invariant: "native source + native test semantics",
                implementation: `source = "${hello_pattern.source}" · flags = "${hello_pattern.flags}"`,
                guidance:
                    "The Effect export gives you a normal RegExp instance, so standard methods remain available.",
            }

        case "Flags": {
            const probe = flag_probe()

            return {
                input: '"hello" with flags "iu" / "not-a-flag"',
                operation: "construct both patterns",
                result: `${String(probe.valid)} · ${probe.invalidMessage}`,
                invariant: "flag validation belongs to the native constructor",
                implementation: "invalid or duplicate flags throw SyntaxError",
                guidance:
                    "Treat dynamic flags as a separate validated input; RegExp.escape only transforms pattern text.",
            }
        }

        case "Native":
            return {
                input: "native RegExp instance",
                operation: "read source · flags · lastIndex · call test/exec",
                result: "ordinary JavaScript RegExp behavior",
                invariant: "no Effect wrapper object is introduced",
                implementation:
                    "constructor identity is exactly globalThis.RegExp",
                guidance:
                    "Use standard JavaScript RegExp documentation for runtime methods and flag semantics.",
            }
    }
}

export const narrow_snapshot = (model: Model): Snapshot => {
    switch (model.narrowCase) {
        case "RegExp":
            return {
                input: "/abc/i",
                operation: "RegExp.isRegExp(input)",
                result: String(RegExpModule.isRegExp(/abc/i)),
                invariant: "successful check narrows unknown to RegExp",
                implementation: "Predicate.isRegExp(input)",
                guidance:
                    "Use the guard before reading source, flags, or RegExp methods from unknown data.",
            }

        case "String":
            return {
                input: '"abc"',
                operation: "RegExp.isRegExp(input)",
                result: String(RegExpModule.isRegExp("abc")),
                invariant: "pattern-looking strings are still strings",
                implementation: "the guard does not attempt construction",
                guidance:
                    "Construct a RegExp explicitly when a string is intended to become pattern source.",
            }

        case "Unknown":
            return {
                input: "unknown value",
                operation: "branch on isRegExp",
                result: "RegExp branch | fallback branch",
                invariant: "type narrowing follows the runtime check",
                implementation: "input instanceof RegExp",
                guidance:
                    "Keep parsing and validation separate from type detection at generic boundaries.",
            }

        case "Instanceof":
            return {
                input: "Predicate.isRegExp implementation",
                operation: "input instanceof RegExp",
                result: "native instanceof semantics",
                invariant:
                    "the guard follows the current realm's constructor identity",
                implementation: "no duck-typing on source/test/exec properties",
                guidance:
                    "If values can cross JavaScript realms, remember that instanceof-based guards have the usual cross-realm caveat.",
            }
    }
}

export const escape_snapshot = (model: Model): Snapshot => {
    switch (model.escapeCase) {
        case "Meta":
            return {
                input: special_text,
                operation: "RegExp.escape(input)",
                result: escaped_special_text,
                invariant: "regex metacharacters become literal characters",
                implementation: "prefix matched syntax characters with \\\\",
                guidance:
                    "Escape untrusted or data-driven literal fragments before interpolating them into pattern source.",
            }

        case "Plain":
            return {
                input: "hello-world_123",
                operation: "RegExp.escape(input)",
                result: RegExpModule.escape("hello-world_123"),
                invariant: "ordinary text is preserved",
                implementation: "only regex syntax characters are replaced",
                guidance:
                    "Escaping is safe to apply even when a fragment happens to contain no regex syntax.",
            }

        case "Slash":
            return {
                input: "api/v1/users",
                operation: "RegExp.escape(input)",
                result: RegExpModule.escape("api/v1/users"),
                invariant: "forward slash is escaped too",
                implementation:
                    "the module's replacement character class includes /",
                guidance:
                    "This keeps escaped fragments convenient whether source is inspected, embedded, or moved between constructor/literal contexts.",
            }

        case "Backslash":
            return {
                input: String.raw`C:\\temp\\file.txt`,
                operation: "RegExp.escape(input)",
                result: RegExpModule.escape(String.raw`C:\\temp\\file.txt`),
                invariant: "existing backslashes are themselves made literal",
                implementation: "\\ becomes \\\\ in pattern source",
                guidance:
                    "Do not hand-count slashes; escape the data fragment and let the constructor consume the resulting source string.",
            }
    }
}

export const compose_snapshot = (model: Model): Snapshot => {
    switch (model.composeCase) {
        case "Literal": {
            const probe = literal_probe("a*b")

            return {
                input: 'dynamic text = "a*b"',
                operation: "escape → construct",
                result: `/${probe.source}/u`,
                invariant: "* is data, not a quantifier",
                implementation: "trusted shell + escaped dynamic fragment",
                guidance:
                    "Escape the fragment at the point where data crosses into regex source.",
            }
        }

        case "Anchors": {
            const probe = literal_probe("a*b")

            return {
                input: 'literal_pattern("a*b")',
                operation: 'test("a*b") · test("a*b!")',
                result: `${String(probe.exact)} · ${String(probe.extra)}`,
                invariant:
                    "anchors are trusted structure outside the escaped fragment",
                implementation: "^ + escaped text + $",
                guidance:
                    "Keep operator syntax in code and dynamic literal data inside escape().",
            }
        }

        case "Flags": {
            const probe = flag_probe()

            return {
                input: 'pattern source + flags "iu"',
                operation: "native constructor validates flags",
                result: `match=${String(probe.valid)} · invalid=${probe.invalidMessage}`,
                invariant: "escape never transforms or validates flags",
                implementation:
                    "flags are a separate RegExp constructor parameter",
                guidance:
                    "Whitelist dynamic flags independently if callers are allowed to choose them.",
            }
        }

        case "State": {
            const probe = stateful_probe()

            return {
                input: '/a/g against "a a"',
                operation: "test three times",
                result: `${String(probe.first)}@${String(probe.afterFirst)} · ${String(probe.second)}@${String(probe.afterSecond)} · ${String(probe.third)}@${String(probe.afterThird)}`,
                invariant: "g/y expressions carry mutable lastIndex",
                implementation: "native RegExp state; not Effect-managed state",
                guidance:
                    "Avoid casually reusing global/sticky regex instances when callers expect independent tests.",
            }
        }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRegExpStage: {
        stage: Stage,
    },
    SelectedRegExpConstructCase: {
        constructCase: ConstructCase,
    },
    SelectedRegExpNarrowCase: {
        narrowCase: NarrowCase,
    },
    SelectedRegExpEscapeCase: {
        escapeCase: EscapeCase,
    },
    SelectedRegExpComposeCase: {
        composeCase: ComposeCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Construct",
    constructCase: "Alias",
    narrowCase: "Unknown",
    escapeCase: "Meta",
    composeCase: "Literal",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ConstructCasePayload = Readonly<{
    constructCase: ConstructCase
}>

type NarrowCasePayload = Readonly<{
    narrowCase: NarrowCase
}>

type EscapeCasePayload = Readonly<{
    escapeCase: EscapeCase
}>

type ComposeCasePayload = Readonly<{
    composeCase: ComposeCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRegExpStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedRegExpConstructCase: ({
            constructCase,
        }: ConstructCasePayload) => ({
            model: modifyFields(model, {
                constructCase: () => constructCase,
            }),
        }),

        SelectedRegExpNarrowCase: ({ narrowCase }: NarrowCasePayload) => ({
            model: modifyFields(model, {
                narrowCase: () => narrowCase,
            }),
        }),

        SelectedRegExpEscapeCase: ({ escapeCase }: EscapeCasePayload) => ({
            model: modifyFields(model, {
                escapeCase: () => escapeCase,
            }),
        }),

        SelectedRegExpComposeCase: ({ composeCase }: ComposeCasePayload) => ({
            model: modifyFields(model, {
                composeCase: () => composeCase,
            }),
        }),
    })
