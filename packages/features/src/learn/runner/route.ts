import { Match as M, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import type { ExampleKey } from "./catalog.ts"

export const SucceedRoute = taggedStruct("SucceedRoute")
export const FailRoute = taggedStruct("FailRoute")
export const DieRoute = taggedStruct("DieRoute")
export const SyncRoute = taggedStruct("SyncRoute")
export const PromiseRoute = taggedStruct("PromiseRoute")
export const SleepRoute = taggedStruct("SleepRoute")
export const AllRoute = taggedStruct("AllRoute")
export const RaceRoute = taggedStruct("RaceRoute")
export const RaceAllRoute = taggedStruct("RaceAllRoute")
export const ForEachRoute = taggedStruct("ForEachRoute")
export const AllShortCircuitRoute = taggedStruct("AllShortCircuitRoute")
export const OrElseRoute = taggedStruct("OrElseRoute")
export const FirstSuccessOfRoute = taggedStruct("FirstSuccessOfRoute")
export const TimeoutRoute = taggedStruct("TimeoutRoute")
export const EventuallyRoute = taggedStruct("EventuallyRoute")
export const PartitionRoute = taggedStruct("PartitionRoute")
export const ValidateRoute = taggedStruct("ValidateRoute")
export const RetryRecursRoute = taggedStruct("RetryRecursRoute")
export const RetryExponentialRoute = taggedStruct("RetryExponentialRoute")
export const RepeatSpacedRoute = taggedStruct("RepeatSpacedRoute")
export const RepeatWhileRoute = taggedStruct("RepeatWhileRoute")
export const RefMakeRoute = taggedStruct("RefMakeRoute")
export const RefUpdateAndGetRoute = taggedStruct("RefUpdateAndGetRoute")
export const AddFinalizerRoute = taggedStruct("AddFinalizerRoute")
export const AcquireReleaseRoute = taggedStruct("AcquireReleaseRoute")
export const NotFoundRoute = taggedStruct("NotFoundRoute", {
    pathname: S.String,
})

export const ExampleRoute = S.Union([
    SucceedRoute,
    FailRoute,
    DieRoute,
    SyncRoute,
    PromiseRoute,
    SleepRoute,
    AllRoute,
    RaceRoute,
    RaceAllRoute,
    ForEachRoute,
    AllShortCircuitRoute,
    OrElseRoute,
    FirstSuccessOfRoute,
    TimeoutRoute,
    EventuallyRoute,
    PartitionRoute,
    ValidateRoute,
    RetryRecursRoute,
    RetryExponentialRoute,
    RepeatSpacedRoute,
    RepeatWhileRoute,
    RefMakeRoute,
    RefUpdateAndGetRoute,
    AddFinalizerRoute,
    AcquireReleaseRoute,
    NotFoundRoute,
])
export type ExampleRoute = typeof ExampleRoute.Type

const PATH = "/learn"

// One table for both directions. Twenty-one routes written out as an `if`
// chain and a matching set of `href` templates is twenty-one chances for the
// two to disagree about a segment; here a typo can only be made once.
const route_for_segment: Record<string, () => ExampleRoute> = {
    "constructors/succeed": SucceedRoute,
    "constructors/fail": FailRoute,
    "constructors/die": DieRoute,
    "constructors/sync": SyncRoute,
    "constructors/promise": PromiseRoute,
    "constructors/sleep": SleepRoute,
    "concurrency/all": AllRoute,
    "concurrency/race": RaceRoute,
    "concurrency/race-all": RaceAllRoute,
    "concurrency/for-each": ForEachRoute,
    "error-handling/all-short-circuit": AllShortCircuitRoute,
    "error-handling/or-else": OrElseRoute,
    "error-handling/first-success-of": FirstSuccessOfRoute,
    "error-handling/timeout": TimeoutRoute,
    "error-handling/eventually": EventuallyRoute,
    "error-handling/partition": PartitionRoute,
    "error-handling/validate": ValidateRoute,
    "schedule/retry-recurs": RetryRecursRoute,
    "schedule/retry-exponential": RetryExponentialRoute,
    "schedule/repeat-spaced": RepeatSpacedRoute,
    "schedule/repeat-while": RepeatWhileRoute,
    "ref/ref-make": RefMakeRoute,
    "ref/ref-update-and-get": RefUpdateAndGetRoute,
    "scope/add-finalizer": AddFinalizerRoute,
    "scope/acquire-release": AcquireReleaseRoute,
}

/** A lesson's path mirrors where it lives: `learn/<subject>/<lesson>`. The
 *  subject names the idea — scope, error handling, concurrency — never the
 *  library the example happens to use. */
export const example_href = (segment: string): string => `${PATH}/${segment}/`

/** The segments this runner answers to, in catalogue order. */
export const example_segments: ReadonlyArray<string> =
    Object.keys(route_for_segment)

/** Exact membership, not a prefix: `/learn/` itself is the Learn index and
 *  every other lesson also lives one segment down. */
export const isEffectExamplePath = (pathname: string): boolean =>
    route_for_segment[
        pathname.replace(/^\/learn\/?/, "").replace(/\/+$/, "")
    ] !== undefined

export const effectRouteForPath = (pathname: string): ExampleRoute => {
    if (!isEffectExamplePath(pathname)) {
        return NotFoundRoute({ pathname })
    }

    // `/learn/fail` and `/learn/fail/` both reach here, so the surrounding
    // slashes come off before the lookup.
    const segment = pathname.slice(PATH.length).replace(/^\/+|\/+$/g, "")
    const route = route_for_segment[segment]

    return route === undefined ? NotFoundRoute({ pathname }) : route()
}

// PORT NOTE: the source app had no routing at all — one page, and the sidebar
// swapped the example in the Model. Here the URL owns the selection, so this
// mapping is exhaustive: adding a route forces a catalog key to be chosen.
export const example_key_for_route = (route: ExampleRoute): ExampleKey =>
    M.value(route).pipe(
        M.withReturnType<ExampleKey>(),
        M.tagsExhaustive({
            SucceedRoute: () => "Succeed",
            FailRoute: () => "Fail",
            DieRoute: () => "Die",
            SyncRoute: () => "Sync",
            PromiseRoute: () => "Promise",
            SleepRoute: () => "Sleep",
            AllRoute: () => "All",
            RaceRoute: () => "Race",
            RaceAllRoute: () => "RaceAll",
            ForEachRoute: () => "ForEach",
            AllShortCircuitRoute: () => "AllShortCircuit",
            OrElseRoute: () => "OrElse",
            FirstSuccessOfRoute: () => "FirstSuccessOf",
            TimeoutRoute: () => "Timeout",
            EventuallyRoute: () => "Eventually",
            PartitionRoute: () => "Partition",
            ValidateRoute: () => "Validate",
            RetryRecursRoute: () => "RetryRecurs",
            RetryExponentialRoute: () => "RetryExponential",
            RepeatSpacedRoute: () => "RepeatSpaced",
            RepeatWhileRoute: () => "RepeatWhile",
            RefMakeRoute: () => "RefMake",
            RefUpdateAndGetRoute: () => "RefUpdateAndGet",
            AddFinalizerRoute: () => "AddFinalizer",
            AcquireReleaseRoute: () => "AcquireRelease",
            NotFoundRoute: () => "Succeed",
        })
    )
