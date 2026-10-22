/** # Learn lesson catalogue
 *
 *  One descriptor per routed lesson. The Learn index cards and the sidebar nav
 *  are both generated from this list, so adding a lesson to the catalogue is a
 *  single entry rather than a card and a nav item kept in step by hand.
 *
 *  Lessons whose sidebar entry is a group of sub-routes (Foldkit, Visual
 *  Effect) build their own nav items from their own route module and are not
 *  listed here.
 */
import type { Html } from "foldkit/html"

import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"

import * as ApiEffect from "@urm/features/labs/api-effect"
import * as CacheLesson from "@urm/features/labs/cache"
import * as EffectLesson from "@urm/features/labs/effect"
import * as FiberLesson from "@urm/features/labs/fiber"
import * as FunctionLesson from "@urm/features/labs/function"
import * as PersistedQueueLesson from "@urm/features/labs/persisted-queue"
import * as RecordLesson from "@urm/features/labs/record"
import * as ResultLesson from "@urm/features/labs/result"
import * as SchemaLesson from "@urm/features/labs/schema"
import * as StringLesson from "@urm/features/labs/string"
import * as TupleLesson from "@urm/features/labs/tuple"
import * as GeneratorYieldLesson from "@urm/features/labs/generator-yield"

import * as ArrayLesson from "@urm/features/labs/array"
import * as ManagedResourceLayer from "@urm/features/labs/managed-resource-layer"
import * as CounterLesson from "@urm/features/labs/state/counter"
import * as ModelTreeLesson from "@urm/features/labs/state/model-tree"
import * as SubmodelLesson from "@urm/features/labs/components/submodel"
import * as DerivedValuesLesson from "@urm/features/labs/state/derived-values"
import * as CombinedInputsLesson from "@urm/features/labs/state/combined-inputs"
import * as OnChangeLesson from "@urm/features/labs/side-effects/on-change"
import * as DecodingLesson from "@urm/features/labs/side-effects/decoding"
import * as OnDemandLesson from "@urm/features/labs/side-effects/on-demand"
import * as CombiningLesson from "@urm/features/labs/async/combining"
import * as OptimisticUpdateLesson from "@urm/features/labs/async/optimistic-update"
import * as StreamingLesson from "@urm/features/labs/async/streaming"
import * as ItemsLesson from "@urm/features/labs/lists/items"
import * as FilteringLesson from "@urm/features/labs/lists/filtering"
import * as EmbeddingLesson from "@urm/features/labs/components/embedding"
import * as SucceedLesson from "@urm/features/labs/constructors/succeed"
import * as FailLesson from "@urm/features/labs/constructors/fail"
import * as DieLesson from "@urm/features/labs/constructors/die"
import * as SyncLesson from "@urm/features/labs/constructors/sync"
import * as PromiseLesson from "@urm/features/labs/constructors/promise"
import * as SleepLesson from "@urm/features/labs/constructors/sleep"
import * as AllLesson from "@urm/features/labs/concurrency/all"
import * as RaceLesson from "@urm/features/labs/concurrency/race"
import * as RaceAllLesson from "@urm/features/labs/concurrency/race-all"
import * as ForEachLesson from "@urm/features/labs/concurrency/for-each"
import * as AllShortCircuitLesson from "@urm/features/labs/error-handling/all-short-circuit"
import * as OrElseLesson from "@urm/features/labs/error-handling/or-else"
import * as FirstSuccessOfLesson from "@urm/features/labs/error-handling/first-success-of"
import * as TimeoutLesson from "@urm/features/labs/error-handling/timeout"
import * as EventuallyLesson from "@urm/features/labs/error-handling/eventually"
import * as PartitionLesson from "@urm/features/labs/error-handling/partition"
import * as ValidateLesson from "@urm/features/labs/error-handling/validate"
import * as RetryRecursLesson from "@urm/features/labs/schedule/retry-recurs"
import * as RetryExponentialLesson from "@urm/features/labs/schedule/retry-exponential"
import * as RepeatSpacedLesson from "@urm/features/labs/schedule/repeat-spaced"
import * as RepeatWhileLesson from "@urm/features/labs/schedule/repeat-while"
import * as RefMakeLesson from "@urm/features/labs/ref/ref-make"
import * as RefUpdateAndGetLesson from "@urm/features/labs/ref/ref-update-and-get"
import * as AddFinalizerLesson from "@urm/features/labs/scope/add-finalizer"
import * as AcquireReleaseLesson from "@urm/features/labs/scope/acquire-release"
import * as NullishCoalescingInput from "@urm/features/labs/nullish-coalescing-input"
import * as NumberLesson from "@urm/features/labs/number"
import * as Reduce from "@urm/features/labs/reduce"

/** An icon component as the sidebar and the index cards both render it. */
type LessonIcon = (props?: Readonly<{ class?: string }>) => Html

export type Lesson = Readonly<{
    /** The sidebar `routeTag` this lesson answers to. */
    tag: string
    /** A lesson that owns a family of sub-routes; the sidebar expands it with
     *  children its own route module supplies. */
    is_group?: true
    label: string
    href: string
    /** Recognises this lesson's own `/labs/learn/...` path, trailing slash or not. */
    is_path: (pathname: string) => boolean
    description: string
    icon: LessonIcon
}>

export const lessons: ReadonlyArray<Lesson> = [
    {
        tag: "LearnApiEffect",
        label: "API Effect",
        href: ApiEffect.apiEffectHref(),
        is_path: ApiEffect.isApiEffectPath,
        description:
            "Explore typed inputs, dependencies, successes, and failures in an Effect-powered API request.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnArray",
        label: "Array",
        href: ArrayLesson.array_href(),
        is_path: ArrayLesson.is_array_path,
        description:
            "Inspect an ordered collection and see how map renders one list item for each value.",
        icon: AppIcon.IconListChecks,
    },
    {
        tag: "LearnCounter",
        label: "Counter",
        href: CounterLesson.counter_href(),
        is_path: CounterLesson.is_counter_path,
        description:
            "State changes only through Messages: nothing writes to the Model directly.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnDerivedValues",
        label: "Derived Values",
        href: DerivedValuesLesson.derived_values_href(),
        is_path: DerivedValuesLesson.is_derived_values_path,
        description:
            "A value computed while rendering, so there is no second copy to keep in step.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnCombinedInputs",
        label: "Combined Inputs",
        href: CombinedInputsLesson.combined_inputs_href(),
        is_path: CombinedInputsLesson.is_combined_inputs_path,
        description:
            "Two fields produce one displayed value, and the dependency stays an ordinary function.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnOnChange",
        label: "On Change",
        href: OnChangeLesson.on_change_href(),
        is_path: OnChangeLesson.is_on_change_path,
        description:
            "Update starts effectful work when a value changes, rather than the view doing it.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnDecoding",
        label: "Decoding",
        href: DecodingLesson.decoding_href(),
        is_path: DecodingLesson.is_decoding_path,
        description:
            "A response is decoded before it reaches the Model, so state holds only validated data.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnOnDemand",
        label: "On Demand",
        href: OnDemandLesson.on_demand_href(),
        is_path: OnDemandLesson.is_on_demand_path,
        description:
            "A Message starts the work, and pending state stops it running twice.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnCombining",
        label: "Combining",
        href: CombiningLesson.combining_href(),
        is_path: CombiningLesson.is_combining_path,
        description:
            "Independent requests combine into one value, and a stale response is ignored.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnOptimisticUpdate",
        label: "Optimistic Update",
        href: OptimisticUpdateLesson.optimistic_update_href(),
        is_path: OptimisticUpdateLesson.is_optimistic_update_path,
        description:
            "Show the pending value immediately; commit it on success, fall back on failure.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnStreaming",
        label: "Streaming",
        href: StreamingLesson.streaming_href(),
        is_path: StreamingLesson.is_streaming_path,
        description:
            "Rows arriving from a stream the runtime owns, beside the same rows fetched a page at a time.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnItems",
        label: "Items",
        href: ItemsLesson.items_href(),
        is_path: ItemsLesson.is_items_path,
        description:
            "A replayable list, with identifiers allocated from state rather than generated.",
        icon: AppIcon.IconListChecks,
    },
    {
        tag: "LearnFiltering",
        label: "Filtering",
        href: FilteringLesson.filtering_href(),
        is_path: FilteringLesson.is_filtering_path,
        description:
            "The filter is a field and the visible rows are derived from it, so the two cannot disagree.",
        icon: AppIcon.IconListChecks,
    },
    {
        tag: "LearnModelTree",
        label: "Model Tree",
        href: ModelTreeLesson.model_tree_href(),
        is_path: ModelTreeLesson.is_model_tree_path,
        description:
            "State nests: each part of the app owns its own branch, and the parent only sees what it folds in.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnSubmodel",
        label: "Submodel",
        href: SubmodelLesson.submodel_href(),
        is_path: SubmodelLesson.is_submodel_path,
        description:
            "When a part of the app owns a state machine rather than just markup, it becomes a Submodel.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnEmbedding",
        label: "Embedding",
        href: EmbeddingLesson.embedding_href(),
        is_path: EmbeddingLesson.is_embedding_path,
        description:
            "One component embedded twice, each instance owning its state and reporting out.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnNumber",
        label: "Number",
        href: NumberLesson.number_href(),
        is_path: NumberLesson.is_number_path,
        description:
            "Parse, compare, clamp, and aggregate numbers with the Number module's typed helpers.",
        icon: AppIcon.IconListChecks,
    },
    {
        tag: "LearnReduce",
        label: "Reduce",
        href: Reduce.reduce_href(),
        is_path: Reduce.is_reduce_path,
        description:
            "Edit an array of prices and combine them into one total with Array.reduce.",
        icon: AppIcon.IconListChecks,
    },
    {
        tag: "LearnNullishCoalescingInput",
        label: "Nullish Coalescing Input",
        href: NullishCoalescingInput.nullish_coalescing_input_href(),
        is_path: NullishCoalescingInput.is_nullish_coalescing_input_path,
        description:
            "Type and clear a value to see when the nullish coalescing operator uses its fallback.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnCache",
        label: "Cache",
        href: CacheLesson.cache_href(),
        is_path: CacheLesson.is_cache_path,
        description:
            "Memoise an effectful lookup and watch hits, misses, and invalidation move through a Cache.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnEffect",
        label: "Effect",
        href: EffectLesson.effect_href(),
        is_path: EffectLesson.is_effect_path,
        description:
            "Run, map, and recover from an Effect to see how its success and failure channels compose.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnFiber",
        label: "Fiber",
        href: FiberLesson.fiber_href(),
        is_path: FiberLesson.is_fiber_path,
        description:
            "Fork, join, and interrupt concurrent work to see how a Fiber carries its own lifecycle.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnFunction",
        label: "Function",
        href: FunctionLesson.function_href(),
        is_path: FunctionLesson.is_function_path,
        description:
            "Compose, pipe, and curry plain functions with the Function module's combinators.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnPersistedQueue",
        label: "Persisted Queue",
        href: PersistedQueueLesson.persisted_queue_href(),
        is_path: PersistedQueueLesson.is_persisted_queue_path,
        description:
            "Enqueue work that survives a reload and watch it drain from durable storage.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRecord",
        label: "Record",
        href: RecordLesson.record_href(),
        is_path: RecordLesson.is_record_path,
        description:
            "Read, update, and traverse string-keyed structures with the Record module.",
        icon: AppIcon.IconListChecks,
    },
    {
        tag: "LearnResult",
        label: "Result",
        href: ResultLesson.result_href(),
        is_path: ResultLesson.is_result_path,
        description:
            "Model success and failure as one value and fold a Result into something to render.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnSchema",
        label: "Schema",
        href: SchemaLesson.schema_href(),
        is_path: SchemaLesson.is_schema_path,
        description:
            "Decode untrusted input into typed values and read the errors a Schema reports.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnString",
        label: "String",
        href: StringLesson.string_href(),
        is_path: StringLesson.is_string_path,
        description:
            "Slice, pad, split, and normalise text with the String module's total helpers.",
        icon: AppIcon.IconFileCode,
    },
    {
        tag: "LearnTuple",
        label: "Tuple",
        href: TupleLesson.tuple_href(),
        is_path: TupleLesson.is_tuple_path,
        description:
            "Pair values into fixed-length tuples and pull them apart with typed accessors.",
        icon: AppIcon.IconListChecks,
    },
    {
        tag: "LearnGeneratorYield",
        label: "Yield Star",
        href: GeneratorYieldLesson.generator_yield_href(),
        is_path: GeneratorYieldLesson.is_generator_yield_path,
        description:
            "Step through an Effect.gen generator to see what each yield* hands back.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnManagedResourceLayer",
        label: "Managed Resource Layer",
        href: ManagedResourceLayer.managedResourceLayerHref(),
        is_path: ManagedResourceLayer.isManagedResourceLayerPath,
        description:
            "Explore a layer-backed managed resource with explicit acquisition, availability, and teardown.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnSucceed",
        label: "Succeed",
        href: SucceedLesson.succeed_href(),
        is_path: SucceedLesson.is_succeed_path,
        description:
            "Start from a value that is already there: the effect that always succeeds.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnFail",
        label: "Fail",
        href: FailLesson.fail_href(),
        is_path: FailLesson.is_fail_path,
        description:
            "Raise an expected error and watch it travel the failure channel.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnDie",
        label: "Die",
        href: DieLesson.die_href(),
        is_path: DieLesson.is_die_path,
        description:
            "Throw a defect — the unexpected failure that bypasses the error channel entirely.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnSync",
        label: "Sync",
        href: SyncLesson.sync_href(),
        is_path: SyncLesson.is_sync_path,
        description:
            "Wrap a synchronous computation so it runs when the effect does, not before.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnPromise",
        label: "Promise",
        href: PromiseLesson.promise_href(),
        is_path: PromiseLesson.is_promise_path,
        description:
            "Lift a Promise into an Effect and see where its rejection lands.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnSleep",
        label: "Sleep",
        href: SleepLesson.sleep_href(),
        is_path: SleepLesson.is_sleep_path,
        description: "Wait, interruptibly — a delay you can cancel mid-flight.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnAll",
        label: "All",
        href: AllLesson.all_href(),
        is_path: AllLesson.is_all_path,
        description: "Run several effects together and collect every result.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRace",
        label: "Race",
        href: RaceLesson.race_href(),
        is_path: RaceLesson.is_race_path,
        description:
            "Two effects start, the first to settle wins, the loser is interrupted.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRaceAll",
        label: "Race All",
        href: RaceAllLesson.race_all_href(),
        is_path: RaceAllLesson.is_race_all_path,
        description:
            "Race a whole collection and keep only the first to finish.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnForEach",
        label: "For Each",
        href: ForEachLesson.for_each_href(),
        is_path: ForEachLesson.is_for_each_path,
        description: "Run one effect per item, with concurrency you control.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnAllShortCircuit",
        label: "All Short Circuit",
        href: AllShortCircuitLesson.all_short_circuit_href(),
        is_path: AllShortCircuitLesson.is_all_short_circuit_path,
        description:
            "One failure ends the whole batch; watch the survivors get interrupted.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnOrElse",
        label: "Or Else",
        href: OrElseLesson.or_else_href(),
        is_path: OrElseLesson.is_or_else_path,
        description: "Fall back to a second effect when the first fails.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnFirstSuccessOf",
        label: "First Success Of",
        href: FirstSuccessOfLesson.first_success_of_href(),
        is_path: FirstSuccessOfLesson.is_first_success_of_path,
        description:
            "Try each effect in turn and keep the first that succeeds.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnTimeout",
        label: "Timeout",
        href: TimeoutLesson.timeout_href(),
        is_path: TimeoutLesson.is_timeout_path,
        description:
            "Give an effect a deadline and interrupt it when the clock runs out.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnEventually",
        label: "Eventually",
        href: EventuallyLesson.eventually_href(),
        is_path: EventuallyLesson.is_eventually_path,
        description: "Retry forever until it works.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnPartition",
        label: "Partition",
        href: PartitionLesson.partition_href(),
        is_path: PartitionLesson.is_partition_path,
        description:
            "Split a batch into its successes and its failures instead of failing outright.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnValidate",
        label: "Validate",
        href: ValidateLesson.validate_href(),
        is_path: ValidateLesson.is_validate_path,
        description: "Gather every error rather than stopping at the first.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRetryRecurs",
        label: "Retry Recurs",
        href: RetryRecursLesson.retry_recurs_href(),
        is_path: RetryRecursLesson.is_retry_recurs_path,
        description: "Retry a fixed number of times on a simple schedule.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRetryExponential",
        label: "Retry Exponential",
        href: RetryExponentialLesson.retry_exponential_href(),
        is_path: RetryExponentialLesson.is_retry_exponential_path,
        description: "Back off exponentially between attempts.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRepeatSpaced",
        label: "Repeat Spaced",
        href: RepeatSpacedLesson.repeat_spaced_href(),
        is_path: RepeatSpacedLesson.is_repeat_spaced_path,
        description: "Repeat a succeeding effect on a fixed interval.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRepeatWhile",
        label: "Repeat While",
        href: RepeatWhileLesson.repeat_while_href(),
        is_path: RepeatWhileLesson.is_repeat_while_path,
        description: "Keep repeating for as long as a predicate holds.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRefMake",
        label: "Ref Make",
        href: RefMakeLesson.ref_make_href(),
        is_path: RefMakeLesson.is_ref_make_path,
        description:
            "Create a mutable reference that lives inside the effect system.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnRefUpdateAndGet",
        label: "Ref Update And Get",
        href: RefUpdateAndGetLesson.ref_update_and_get_href(),
        is_path: RefUpdateAndGetLesson.is_ref_update_and_get_path,
        description: "Update a Ref and read the new value in one atomic step.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnAddFinalizer",
        label: "Add Finalizer",
        href: AddFinalizerLesson.add_finalizer_href(),
        is_path: AddFinalizerLesson.is_add_finalizer_path,
        description: "Register cleanup that runs however the scope ends.",
        icon: AppIcon.IconZap,
    },
    {
        tag: "LearnAcquireRelease",
        label: "Acquire Release",
        href: AcquireReleaseLesson.acquire_release_href(),
        is_path: AcquireReleaseLesson.is_acquire_release_path,
        description:
            "Pair acquisition with release so a resource is never leaked.",
        icon: AppIcon.IconZap,
    },
]

/** The path segments under `/labs/learn/`, e.g. `["scope", "acquire-release"]`. */
export const segments_of = (href: string): ReadonlyArray<string> =>
    href
        .replace(/^\/labs\/learn\/?/, "")
        .replace(/\/+$/, "")
        .split("/")

const title_case = (slug: string): string =>
    slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")

export type Subject = Readonly<{
    slug: string
    label: string
    /** The sidebar `routeTag` for the subject's own index. */
    tag: string
    href: string
    lessons: ReadonlyArray<Lesson>
}>

/** The subjects, derived from where the lessons live rather than declared
 *  separately — moving a lesson between folders moves it between subjects, and
 *  the sidebar, the index pages and the breadcrumbs all follow.
 *
 *  A lesson that is its own subject (`learn/number`) is not one of these; it
 *  renders as a leaf. */
export const subjects: ReadonlyArray<Subject> = lessons.reduce<Array<Subject>>(
    (found, lesson) => {
        const segments = segments_of(lesson.href)
        const slug = segments.length < 2 ? undefined : segments[0]
        if (slug === undefined) return found

        const existing = found.find((subject) => subject.slug === slug)
        if (existing === undefined) {
            found.push({
                slug,
                label: title_case(slug),
                tag: `Learn${title_case(slug).replace(/ /g, "")}`,
                href: `/labs/learn/${slug}/`,
                lessons: [lesson],
            })
            return found
        }
        found[found.indexOf(existing)] = {
            ...existing,
            lessons: [...existing.lessons, lesson],
        }
        return found
    },
    []
)

/** The subject a `/labs/learn/...` path names, when it names one and nothing more. */
export const subject_for_path = (learn_path: string): Subject | undefined => {
    const segments = segments_of(learn_path)
    return segments.length === 1
        ? subjects.find((subject) => subject.slug === segments[0])
        : undefined
}
