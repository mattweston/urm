import { Schema as S } from "effect"

// The controls an example can put above its node. Upstream calls these
// configuration panels; two examples have one, and each panel rewrites the
// snippet as well as the run.
//
// They travel bundled rather than as separate parameters because every
// signature that builds an example takes all of them — `examples`,
// `example_by_key`, `categories`, the timelines table and the `RunExample`
// command. A third control should not mean touching all six again.

export const ConcurrencyMode = S.Literals([
    "Sequential",
    "Numbered",
    "Unbounded",
])
export type ConcurrencyMode = typeof ConcurrencyMode.Type

export const FinalizerOutcome = S.Literals([
    "Succeed",
    "Fail",
    "Die",
    "Interrupt",
])
export type FinalizerOutcome = typeof FinalizerOutcome.Type

export const ExampleOptions = S.Struct({
    concurrency_mode: ConcurrencyMode,
    finalizer_outcome: FinalizerOutcome,
})
export type ExampleOptions = typeof ExampleOptions.Type

export const default_example_options = ExampleOptions.make({
    concurrency_mode: "Sequential",
    finalizer_outcome: "Succeed",
})
