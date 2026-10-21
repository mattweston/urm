import { Array } from "effect"

export const values: ReadonlyArray<number> = [1, 2, 3, 4]

export const notes: ReadonlyArray<
    Readonly<{ name: string; frequency: number }>
> = [
    { name: "G4", frequency: 392 },
    { name: "A4", frequency: 440 },
    { name: "B4", frequency: 493.88 },
    { name: "C5", frequency: 523.25 },
]

export const total_through = (step: number): number =>
    Array.reduce(Array.take(values, step), 0, (total, value) => total + value)
