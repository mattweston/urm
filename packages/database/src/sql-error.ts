import { Option, Schema } from "effect"

const ErrorNode = Schema.Struct({
    code: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
    reason: Schema.optional(Schema.Unknown),
})

// Preserve only classified codes, never SQL, parameters, connection URLs or detail.
export const database_error_code = (
    error: unknown,
    depth = 0
): string | undefined => {
    if (depth > 8) return undefined
    const node = Schema.decodeUnknownOption(ErrorNode)(error)
    if (Option.isNone(node)) return undefined
    const { code, cause, reason } = node.value
    if (
        code !== undefined &&
        (/^[0-9A-Z]{5}$/.test(code) ||
            ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].includes(
                code
            ))
    )
        return code
    return (
        database_error_code(cause, depth + 1) ??
        database_error_code(reason, depth + 1)
    )
}
