/**
 * # Remote reads
 *
 * Combining several `RemoteData` reads into one, for screens that need every
 * read before they can show anything.
 */
import { RemoteData } from "foldkit-remote"

type Values<T extends ReadonlyArray<RemoteData<unknown>>> = {
    readonly [K in keyof T]: T[K] extends RemoteData<infer A> ? A : never
}

/**
 * Combines reads under an all-or-nothing policy: any failure fails the whole
 * screen, otherwise any unanswered read holds it at loading, otherwise any
 * missing row makes it `NotFound`, and the data branch runs only once every
 * read has answered.
 *
 * The `Failed` it returns carries no `previous`, which is the policy stated in
 * the type: `RemoteData.render` serves last-known-good data whenever `previous`
 * is set, so dropping it is what makes a failure show the error and no data.
 * Freshness is the worst of the reads — one refreshing read refreshes the
 * screen, and one stale read makes the screen stale.
 */
export const allOf = <const T extends ReadonlyArray<RemoteData<unknown>>>(
    reads: T
): RemoteData<Values<T>> => {
    for (const read of reads) {
        if (read._tag === "Failed") return { _tag: "Failed", error: read.error }
    }
    if (reads.some((read) => read._tag === "Initial" || read._tag === "Loading"))
        return { _tag: "Loading" }
    if (reads.some((read) => read._tag === "NotFound"))
        return { _tag: "NotFound" }
    const values = reads.map((read) =>
        read._tag === "Ready" || read._tag === "Refreshing"
            ? read.value
            : undefined
    ) as unknown as Values<T>
    return reads.some((read) => read._tag === "Refreshing")
        ? { _tag: "Refreshing", value: values }
        : { _tag: "Ready", value: values }
}
