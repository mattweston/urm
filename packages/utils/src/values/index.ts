/**
 * # Value Utils
 *
 * `unwrap` for non-null assertion with custom message; `clamp` for bounding a
 * number.
 */

export function unwrap<T>(value: T, message?: string): NonNullable<T> {
    if (value == null) {
        const error = new Error(
            message ||
                `Expected a non-null value, but got: ${safeStringify(value)}`
        )
        // Drops `unwrap` itself from the trace so the throw points at the caller.
        Error.captureStackTrace(error, unwrap)
        throw error
    }
    return value
}

// Values reaching here have already failed a null check, so they may well be
// circular or hold a throwing toJSON. Formatting an error message must not throw.
function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value)
    } catch {
        return String(value)
    }
}

export function clamp(num: number, lower: number, upper: number) {
    return Math.max(lower, Math.min(num, upper))
}
