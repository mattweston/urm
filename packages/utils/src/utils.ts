/**
 * # Utils
 *
 * Class names (cn), relative time (showTimeAgo, showTimeAgoShort), artificial
 * delays for loaders/actions (loaderDelayFn, actionDelayFn), and array shuffle.
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Duplicated from layout/cn.ts. Both are live; prefer @urm/utils/layout/cn.
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function showTimeAgo(created: number) {
    const now = Date.now()
    const secondsAgo = Math.round((now - created) / 1000)
    if (secondsAgo < 60) return "just now"
    const minutesAgo = Math.round(secondsAgo / 60)
    if (minutesAgo < 60) {
        return `${minutesAgo} minute${minutesAgo === 1 ? "" : "s"} ago`
    }
    const hoursAgo = Math.round(minutesAgo / 60)
    if (hoursAgo < 24) {
        return `${hoursAgo} hour${hoursAgo === 1 ? "" : "s"} ago`
    }
    const daysAgo = Math.round(hoursAgo / 24)
    return `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`
}

export function showTimeAgoShort(created: number) {
    const now = Date.now()
    const secondsAgo = Math.round((now - created) / 1000)
    if (secondsAgo < 60) return "now"
    const minutesAgo = Math.round(secondsAgo / 60)
    if (minutesAgo < 60) {
        return `${minutesAgo}m ago`
    }
    const hoursAgo = Math.round(minutesAgo / 60)
    if (hoursAgo < 24) {
        return `${hoursAgo}h ago`
    }
    const daysAgo = Math.round(hoursAgo / 24)
    return `${daysAgo}d ago`
}

// Reads sessionStorage on every call, so a tester can slow loaders down from the
// console without a rebuild. Browser-only — sessionStorage is undefined on the
// server.
export async function loaderDelayFn<T>(fn: () => Promise<T> | T): Promise<T> {
    const delay = Number(sessionStorage.getItem("loaderDelay") ?? 0)
    await new Promise((r) => setTimeout(r, delay))
    return fn()
}

export async function actionDelayFn<T>(fn: () => Promise<T> | T): Promise<T> {
    const delay = Number(sessionStorage.getItem("actionDelay") ?? 0)
    await new Promise((r) => setTimeout(r, delay))
    return fn()
}

export function shuffle<T>(arr: Array<T>): Array<T> {
    let i = arr.length
    if (i === 0) return arr
    const copy = [...arr]
    while (--i) {
        const j = Math.floor(Math.random() * (i + 1))
        const a = copy[i]
        const b = copy[j]
        copy[i] = b as T
        copy[j] = a as T
    }
    return copy
}
