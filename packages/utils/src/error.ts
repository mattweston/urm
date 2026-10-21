/**
 * # Error Utils
 */

import { Data } from "effect"

export class OperationError extends Data.TaggedError("OperationError")<{
    readonly message: string
    readonly cause: unknown
}> {}

export const toError = (err: unknown): Error => {
    if (err instanceof Error) return err
    return new Error(String(err))
}

export const toOperationError = (cause: unknown): OperationError =>
    new OperationError({
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
    })
