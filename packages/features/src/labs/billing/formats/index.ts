// Formatting is a view concern: the Model holds numbers, and these decide how
// each one reads in a sentence.

const groups = (value: number): string =>
    Math.round(value).toLocaleString("en-US")

export const count = (value: number): string => groups(value)

export const money = (value: number): string => `$${groups(value)}`

export const signedMoney = (value: number): string =>
    `${value < 0 ? "-" : ""}$${groups(Math.abs(value))}`

export const percent = (value: number): string => `${Math.round(value)}%`

export const plural = (value: number, one: string, many: string): string =>
    Math.round(value) === 1 ? one : many
