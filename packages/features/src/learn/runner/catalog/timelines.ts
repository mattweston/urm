import type { ExampleKey } from "../catalog.ts"
import { all_step_labels, all_timeline } from "./concurrency/effect-all.ts"
import type { ExampleOptions } from "./options.ts"
import { race_step_labels, race_timeline } from "./concurrency/effect-race.ts"
import {
    race_all_step_labels,
    race_all_timeline,
} from "./concurrency/effect-race-all.ts"
import {
    for_each_step_labels,
    for_each_timeline,
} from "./concurrency/effect-for-each.ts"
import {
    retry_recurs_timeline,
    retry_step_labels,
} from "./schedule/effect-retry-recurs.ts"
import {
    exponential_step_labels,
    retry_exponential_timeline,
} from "./schedule/effect-retry-exponential.ts"
import {
    repeat_spaced_step_labels,
    repeat_spaced_timeline,
} from "./schedule/effect-repeat-spaced.ts"
import {
    repeat_while_step_labels,
    repeat_while_timeline,
} from "./schedule/effect-repeat-while.ts"
import {
    all_short_circuit_step_labels,
    all_short_circuit_timeline,
} from "./error-handling/effect-all-short-circuit.ts"
import {
    or_else_step_labels,
    or_else_timeline,
} from "./error-handling/effect-or-else.ts"
import {
    first_success_of_step_labels,
    first_success_of_timeline,
} from "./error-handling/effect-first-success-of.ts"
import {
    timeout_step_labels,
    timeout_timeline,
} from "./error-handling/effect-timeout.ts"
import {
    eventually_step_labels,
    eventually_timeline,
} from "./error-handling/effect-eventually.ts"
import {
    partition_step_labels,
    partition_timeline,
} from "./error-handling/effect-partition.ts"
import {
    validate_step_labels,
    validate_timeline,
} from "./error-handling/effect-validate.ts"
import {
    ref_make_initial,
    ref_make_name,
    ref_make_step_labels,
    ref_make_timeline,
} from "./ref/ref-make.ts"
import {
    ref_update_and_get_initial,
    ref_update_and_get_name,
    ref_update_and_get_step_labels,
    ref_update_and_get_timeline,
} from "./ref/ref-update-and-get.ts"
import {
    add_finalizer_step_labels,
    add_finalizer_timeline,
} from "./scope/effect-add-finalizer.ts"
import {
    acquire_release_step_labels,
    acquire_release_timeline,
} from "./scope/effect-acquire-release.ts"
import type { StepEvent } from "./timeline.ts"

export type ExampleTimeline = Readonly<{
    labels: ReadonlyArray<string>
    events: (options: ExampleOptions) => ReadonlyArray<StepEvent>
    // The panels this example draws beside its nodes. Kept here rather than
    // branched on the key in `update` and again in `view`, so one example's
    // chrome is described in exactly one place.
    ref?: Readonly<{ name: string; initial: string }>
    has_scope?: boolean
}>

// The constructor examples run as a single node with no inner steps — the node
// itself is the whole picture.
const no_steps: ExampleTimeline = { labels: [], events: () => [] }

const fixed = (
    labels: ReadonlyArray<string>,
    events: ReadonlyArray<StepEvent>
): ExampleTimeline => ({ labels, events: () => events })

// A `Record` rather than a `Match`: adding an `ExampleKey` fails to compile
// until its steps are declared here, which is the check the old nested ternary
// in `update.ts` could not give.
export const example_timelines: Record<ExampleKey, ExampleTimeline> = {
    Succeed: no_steps,
    Fail: no_steps,
    Die: no_steps,
    Sync: no_steps,
    Promise: no_steps,
    Sleep: no_steps,
    All: { labels: all_step_labels, events: all_timeline },
    Race: fixed(race_step_labels, race_timeline),
    RaceAll: fixed(race_all_step_labels, race_all_timeline),
    ForEach: fixed(for_each_step_labels, for_each_timeline),
    AllShortCircuit: fixed(
        all_short_circuit_step_labels,
        all_short_circuit_timeline
    ),
    OrElse: fixed(or_else_step_labels, or_else_timeline),
    FirstSuccessOf: fixed(
        first_success_of_step_labels,
        first_success_of_timeline
    ),
    Timeout: fixed(timeout_step_labels, timeout_timeline),
    Eventually: fixed(eventually_step_labels, eventually_timeline),
    Partition: fixed(partition_step_labels, partition_timeline),
    Validate: fixed(validate_step_labels, validate_timeline),
    RetryRecurs: fixed(retry_step_labels, retry_recurs_timeline),
    RetryExponential: fixed(
        exponential_step_labels,
        retry_exponential_timeline
    ),
    RepeatSpaced: fixed(repeat_spaced_step_labels, repeat_spaced_timeline),
    RepeatWhile: fixed(repeat_while_step_labels, repeat_while_timeline),
    RefMake: {
        ...fixed(ref_make_step_labels, ref_make_timeline),
        ref: { name: ref_make_name, initial: ref_make_initial },
    },
    RefUpdateAndGet: {
        ...fixed(ref_update_and_get_step_labels, ref_update_and_get_timeline),
        ref: {
            name: ref_update_and_get_name,
            initial: ref_update_and_get_initial,
        },
    },
    AddFinalizer: {
        labels: add_finalizer_step_labels,
        events: add_finalizer_timeline,
        has_scope: true,
    },
    AcquireRelease: {
        ...fixed(acquire_release_step_labels, acquire_release_timeline),
        has_scope: true,
    },
}
