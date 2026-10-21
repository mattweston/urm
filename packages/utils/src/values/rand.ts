/**
 * # Rand Utils
 *
 * Duplicate of `../rand.ts`; both are imported by live call sites.
 */

// Math.random — presentation only (DOM keys, sampling). Never use these for
// tokens, session ids, or anything an attacker benefits from guessing.
export const randBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min) + min)

export const randInt = (max: number) => randBetween(0, max)

export const randID = () => Math.random().toString(36).slice(2)
