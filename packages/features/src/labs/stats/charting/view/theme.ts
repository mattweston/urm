import { Option } from "effect"

export const themeColor = (variable: string): string => {
    if (typeof document === "undefined") {
        return ""
    }

    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim()

    return value.length === 0 ? "" : value
}

export const themeColorWithAlpha = (
    variable: string,
    alpha: number
): string => {
    const color = themeColor(variable)

    if (color.length === 0) {
        return ""
    }

    return `color-mix(in oklch, ${color} ${alpha * 100}%, transparent)`
}

export const maybeThemeColor = (variable: string): Option.Option<string> => {
    const color = themeColor(variable)

    return color.length === 0 ? Option.none() : Option.some(color)
}
