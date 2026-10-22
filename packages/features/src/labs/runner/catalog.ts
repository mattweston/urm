import { Schema as S } from "effect"

import { HighlightSelector, type CodeSnippet } from "./snippet-highlights.ts"
import { define } from "./catalog/define.ts"
import { all_example } from "./catalog/concurrency/effect-all.ts"
import type { ExampleOptions } from "./catalog/options.ts"
import { race_example } from "./catalog/concurrency/effect-race.ts"
import { race_all_example } from "./catalog/concurrency/effect-race-all.ts"
import { for_each_example } from "./catalog/concurrency/effect-for-each.ts"
import { retry_recurs_example } from "./catalog/schedule/effect-retry-recurs.ts"
import { retry_exponential_example } from "./catalog/schedule/effect-retry-exponential.ts"
import { repeat_spaced_example } from "./catalog/schedule/effect-repeat-spaced.ts"
import { repeat_while_example } from "./catalog/schedule/effect-repeat-while.ts"
import { all_short_circuit_example } from "./catalog/error-handling/effect-all-short-circuit.ts"
import { or_else_example } from "./catalog/error-handling/effect-or-else.ts"
import { first_success_of_example } from "./catalog/error-handling/effect-first-success-of.ts"
import { timeout_example } from "./catalog/error-handling/effect-timeout.ts"
import { eventually_example } from "./catalog/error-handling/effect-eventually.ts"
import { partition_example } from "./catalog/error-handling/effect-partition.ts"
import { validate_example } from "./catalog/error-handling/effect-validate.ts"
import { ref_make_example } from "./catalog/ref/ref-make.ts"
import { ref_update_and_get_example } from "./catalog/ref/ref-update-and-get.ts"
import { add_finalizer_example } from "./catalog/scope/effect-add-finalizer.ts"
import { acquire_release_example } from "./catalog/scope/effect-acquire-release.ts"

// PORT NOTE: upstream (`.context/visual-effect`) carries 25 entries. Each one
// needs a route and a `RunExample` arm, so they arrive a category at a time
// rather than as a wall of dead sidebar links. Ref and Scope are still to come.
export const ExampleKey = S.Literals([
    "Succeed",
    "Fail",
    "Die",
    "Sync",
    "Promise",
    "Sleep",
    "All",
    "Race",
    "RaceAll",
    "ForEach",
    "AllShortCircuit",
    "OrElse",
    "FirstSuccessOf",
    "Timeout",
    "Eventually",
    "Partition",
    "Validate",
    "RetryRecurs",
    "RetryExponential",
    "RepeatSpaced",
    "RepeatWhile",
    "RefMake",
    "RefUpdateAndGet",
    "AddFinalizer",
    "AcquireRelease",
])
export type ExampleKey = typeof ExampleKey.Type

// A notification the example raises partway through its own run. The source
// expresses these imperatively inside `build` (`yield* notifications.notify`),
// but a Foldkit Command emits exactly one Message, so the schedule is declared
// here and issued as its own delayed command when the run starts.
export type TimedNotification = Readonly<{
    after_millis: number
    message: string
    variant: "info" | "failure" | "death"
    duration_millis: number
    show_on_hover: boolean
}>

// `subtitle` is upstream's `variant` — what separates the two `Effect.retry`
// entries, or `Effect.all` from `Effect.all (short circuit)`. Without it the
// nav shows the same name twice and the card heading cannot tell you which of
// the two you opened.
export type Example = Readonly<{
    key: ExampleKey
    title: string
    subtitle?: string
    description: string
    code: CodeSnippet
    notifications: ReadonlyArray<TimedNotification>
}>

export type ExampleCategory = Readonly<{
    label: string
    examples: ReadonlyArray<Example>
}>

const succeed_example = define({
    key: "Succeed",
    title: "Effect.succeed",
    description: "Create an effect that always succeeds with a given value",
    source: "const value = Effect.succeed(42)",
    result_highlight: HighlightSelector.Text({ text: "Effect.succeed(42)" }),
})

// PORT NOTE: the source's build also calls
// `Notifications.notify("Kaboom!", { duration: "2 seconds", showOnHover: true })`.
// The notification bubble is not ported yet — `Effect.die` needs the same
// machinery, so it is worth porting once rather than twice.
const fail_example = define({
    key: "Fail",
    title: "Effect.fail",
    description: "Create an effect that represents a recoverable error",
    source: 'const error = Effect.fail("Kaboom!")',
    result_highlight: HighlightSelector.Text({
        text: 'Effect.fail("Kaboom!")',
    }),
})

const die_example = define({
    key: "Die",
    title: "Effect.die",
    description:
        "Create an effect that terminates with an unrecoverable defect",
    source: 'const death = Effect.die(new Error("FATAL: System corrupted"))',
    result_highlight: HighlightSelector.Text({
        text: 'Effect.die(new Error("FATAL: System corrupted"))',
    }),
})

const sync_example = define({
    key: "Sync",
    title: "Effect.sync",
    description:
        "Create an effect from a synchronous side-effectful computation",
    source: "const random = Effect.sync(() => Math.random())",
    result_highlight: HighlightSelector.Text({
        text: "Effect.sync(() => Math.random())",
    }),
})

// The first multi-line snippet. `readTemperature` also appears on line 1, so
// the selector carries the `("london")` argument to stay unambiguous — an
// ambiguous Text selector throws at import rather than guessing.
const promise_example = define({
    key: "Promise",
    title: "Effect.promise",
    description:
        "Create an effect from an asynchronous computation guaranteed to succeed",
    source: [
        "function readTemperature(location: string) {",
        "  return Effect.promise(() =>",
        '    fetch("slow.weather.com/api/" + location)',
        "      .then((response) => response.json)",
        "  )",
        "}",
        "",
        'const result = readTemperature("london")',
    ].join("\n"),
    result_highlight: HighlightSelector.Text({
        text: 'readTemperature("london")',
    }),
})

const sleep_example = define({
    key: "Sleep",
    title: "Effect.sleep",
    description:
        "Create an effect that suspends execution for a given duration",
    source: [
        "const result = Effect.gen(function* () {",
        '  yield* Effect.sleep("3 seconds")',
        '  return "Refreshed!"',
        "})",
    ].join("\n"),
    result_highlight: HighlightSelector.Text({
        text: 'Effect.sleep("3 seconds")',
    }),
    // The source sleeps 1s, notifies for 2s, then sleeps the remaining 2s.
    // Note there is no `showOnHover` on this one, unlike fail and die.
    notifications: [
        {
            after_millis: 1_000,
            message: "😴",
            variant: "info",
            duration_millis: 2_000,
            show_on_hover: false,
        },
    ],
})

const constructor_examples: ReadonlyArray<Example> = [
    succeed_example,
    fail_example,
    die_example,
    sync_example,
    promise_example,
    sleep_example,
]

const error_handling_examples: ReadonlyArray<Example> = [
    all_short_circuit_example,
    or_else_example,
    first_success_of_example,
    timeout_example,
    eventually_example,
    partition_example,
    validate_example,
]

const ref_examples: ReadonlyArray<Example> = [
    ref_make_example,
    ref_update_and_get_example,
]

const scope_examples = (options: ExampleOptions): ReadonlyArray<Example> => [
    add_finalizer_example(options.finalizer_outcome),
    acquire_release_example,
]

export const examples = (options: ExampleOptions): ReadonlyArray<Example> => [
    all_example(options.concurrency_mode),
    race_example,
    race_all_example,
    for_each_example,
    ...error_handling_examples,
    retry_recurs_example,
    retry_exponential_example,
    repeat_spaced_example,
    repeat_while_example,
    ...ref_examples,
    ...scope_examples(options),
    ...constructor_examples,
]

export const first_example: Example = succeed_example

export const example_by_key = (
    key: ExampleKey,
    options: ExampleOptions
): Example =>
    examples(options).find((example) => example.key === key) ?? first_example

// The label under the example's node.
export const example_node_label = (key: ExampleKey): string => {
    switch (key) {
        case "AllShortCircuit":
        case "OrElse":
        case "FirstSuccessOf":
        case "Timeout":
        case "Eventually":
        case "Partition":
        case "Validate":
            return "result"
        case "Fail":
            return "error"
        case "Die":
            return "defect"
        case "Sync":
            return "random"
        case "Promise":
            return "temperature"
        case "Sleep":
            return "result"
        case "All":
            return "temperatures"
        case "Race":
            return "winner"
        case "RaceAll":
            return "winner"
        case "ForEach":
            return "temperatures"
        case "RetryRecurs":
            return "result"
        case "RetryExponential":
            return "result"
        case "RepeatSpaced":
            return "result"
        case "RepeatWhile":
            return "result"
        case "RefMake":
            return "repeat"
        case "RefUpdateAndGet":
            return "concurrent"
        case "AddFinalizer":
            return "effect"
        case "AcquireRelease":
            return "result"
        default:
            return "value"
    }
}

export const categories = (
    options: ExampleOptions
): ReadonlyArray<ExampleCategory> => [
    {
        label: "Concurrency",
        examples: [
            all_example(options.concurrency_mode),
            race_example,
            race_all_example,
            for_each_example,
        ],
    },
    {
        label: "Error Handling",
        examples: error_handling_examples,
    },
    {
        label: "Schedule",
        examples: [
            retry_recurs_example,
            retry_exponential_example,
            repeat_spaced_example,
            repeat_while_example,
        ],
    },
    {
        label: "Ref",
        examples: ref_examples,
    },
    {
        label: "Scope",
        examples: scope_examples(options),
    },
    {
        label: "Constructors",
        examples: [
            succeed_example,
            fail_example,
            die_example,
            sync_example,
            promise_example,
            sleep_example,
        ],
    },
]

export const category_for = (
    key: ExampleKey,
    options: ExampleOptions
): string =>
    categories(options).find((category) =>
        category.examples.some((example) => example.key === key)
    )?.label ?? "Examples"
