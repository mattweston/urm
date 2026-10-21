/**
 * # Assert utils
 *
 * `assert` narrows and throws on failure; `must` unwraps non-null/undefined or throws.
 */

export function assert(cond: unknown, msg?: string | undefined): asserts cond {
    if (!msg) {
        msg = "Assertion failed"
    }
    if (!cond) {
        throw new Error(msg)
    }
}

// Truthiness, not a null check — this `must` rejects 0 and "". The unrelated
// `must` in must.ts tests `== null` and lets both through.
export function must<T>(
    thing: T | null | undefined,
    msg?: string | undefined
): T {
    assert(thing, msg)
    return thing
}
