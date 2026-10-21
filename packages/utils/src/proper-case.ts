/**
 * # Proper Case Util
 *
 * String utilities for URM.
 */

export const properCase = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1)
