/**
 * # CN Layout Util
 *
 * clsx for conditional class values, then tailwind-merge for conflict
 * resolution.
 */

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ClassValue } from "clsx"

// Later Tailwind utilities win, so a consumer's `class` prop must be passed
// last. Put it before the base classes and the component silently ignores it.
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
