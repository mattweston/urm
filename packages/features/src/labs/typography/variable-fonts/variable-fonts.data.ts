import { Schema as S } from "effect"

export type NamedInstance = Readonly<{
    weight: number
    name: string
    file: string
    bytes: number
}>

export const namedInstances: ReadonlyArray<NamedInstance> = [
    { weight: 100, name: "Thin", file: "Geist-Thin.woff2", bytes: 44476 },
    {
        weight: 200,
        name: "ExtraLight",
        file: "Geist-ExtraLight.woff2",
        bytes: 45308,
    },
    { weight: 300, name: "Light", file: "Geist-Light.woff2", bytes: 45308 },
    { weight: 400, name: "Regular", file: "Geist-Regular.woff2", bytes: 44880 },
    { weight: 500, name: "Medium", file: "Geist-Medium.woff2", bytes: 45988 },
    {
        weight: 600,
        name: "SemiBold",
        file: "Geist-SemiBold.woff2",
        bytes: 46164,
    },
    { weight: 700, name: "Bold", file: "Geist-Bold.woff2", bytes: 46288 },
    {
        weight: 800,
        name: "ExtraBold",
        file: "Geist-ExtraBold.woff2",
        bytes: 46380,
    },
    { weight: 900, name: "Black", file: "Geist-Black.woff2", bytes: 46144 },
]

export const WEIGHT_MINIMUM = 100
export const WEIGHT_MAXIMUM = 900
export const VARIABLE_BYTES = 69236
export const ITALIC_VARIABLE_BYTES = 72700
export const MONO_VARIABLE_BYTES = 70952

export const staticTotalBytes = namedInstances.reduce(
    (total, instance) => total + instance.bytes,
    0
)

const instanceBytes = (weight: number): number =>
    namedInstances.find((instance) => instance.weight === weight)?.bytes ?? 0

export const twoStaticWeightsBytes = instanceBytes(400) + instanceBytes(700)

export const formatKilobytes = (bytes: number): string =>
    `${(bytes / 1024).toFixed(1)} KB`

export const samples: ReadonlyArray<string> = [
    "Handgloves",
    "Typography",
    "0123456789",
    "The quick brown fox",
]

export const Font = S.Literals([
    "geist-sans",
    "geist-mono",
    "inter",
    "fira-code",
])
export type Font = typeof Font.Type

export type FontOption = Readonly<{
    value: Font
    label: string
    minimum: number
    maximum: number
    supportsItalic: boolean
}>

export const fontOptions: ReadonlyArray<FontOption> = [
    {
        value: "geist-sans",
        label: "Geist Sans",
        minimum: 100,
        maximum: 900,
        supportsItalic: true,
    },
    {
        value: "geist-mono",
        label: "Geist Mono",
        minimum: 100,
        maximum: 900,
        supportsItalic: true,
    },
    {
        value: "inter",
        label: "Inter",
        minimum: 100,
        maximum: 900,
        supportsItalic: false,
    },
    {
        value: "fira-code",
        label: "Fira Code",
        minimum: 300,
        maximum: 700,
        supportsItalic: false,
    },
]

export const fontOptionFor = (value: string): FontOption =>
    fontOptions.find((option) => option.value === value) ??
    fontOptions[0] ?? {
        value: "geist-sans",
        label: "Geist Sans",
        minimum: WEIGHT_MINIMUM,
        maximum: WEIGHT_MAXIMUM,
        supportsItalic: true,
    }

export const bracketingInstances = (
    weight: number
): Readonly<{ lower: NamedInstance; upper: NamedInstance }> => {
    const first = namedInstances[0]
    const last = namedInstances[namedInstances.length - 1]

    if (first === undefined || last === undefined) {
        throw new Error("namedInstances is empty")
    }

    const lower =
        namedInstances.filter((instance) => instance.weight <= weight).pop() ??
        first
    const upper =
        namedInstances.find((instance) => instance.weight >= weight) ?? last

    return { lower, upper }
}
