/**
 * # Must Utils
 *
 * Runtime assertion for required values (e.g. env vars).
 */

// Null check, not truthiness — 0 and "" pass. The unrelated `must` in assert.ts
// rejects both.
export function must<T>(v: T | undefined | null, msg?: string): T {
    // eslint-disable-next-line eqeqeq
    if (v == null) {
        throw new Error(msg ?? `Unexpected ${v} value`)
    }
    return v
}
