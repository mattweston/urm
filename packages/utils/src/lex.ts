/**
 * # Lex Utils
 *
 * Lexicographic comparison utilities for URM.
 */

export function compare(
    a: string | number | boolean,
    b: string | number | boolean
): number {
    if (a === b) return 0
    if (a < b) return -1
    return 1
}

export function compareOrdered(
    a: { order: string | number | boolean },
    b: { order: string | number | boolean }
): number {
    return compare(a.order, b.order)
}
