import { Option, Schema } from "effect"

const Failure = Schema.Struct({
    _tag: Schema.String,
    reason: Schema.optional(Schema.Unknown),
    code: Schema.optional(Schema.String),
    operation: Schema.optional(Schema.String),
})

export const provision_error_message = (error: unknown): string => {
    const parsed = Schema.decodeUnknownOption(Failure)(error)
    if (Option.isNone(parsed))
        return "Provisioning failed while initializing the database/configuration. Check the server configuration."
    const value = parsed.value
    if (value._tag === "AuthError" && value.reason === "invalid_input")
        return "Invalid provisioning input: name must be non-empty (max 255), email must be valid (max 255), slug must use lowercase letters/numbers separated by single hyphens (max 100), and password must contain 15–1024 characters."
    if (value._tag === "OwnedPasswordError")
        return "Password hashing failed. Check the Node runtime and available memory."
    if (value._tag === "SqlError") {
        switch (value.code) {
            case "23505":
                return "A unique record already exists, such as the contact/login email or workspace slug. No workspace was created; the transaction was rolled back."
            case "42P01":
                return "A required PostgreSQL table is missing (42P01). Restart dev:server to apply pending migrations, then retry."
            case "42703":
                return "A required PostgreSQL column is missing (42703). Check that the server applied the pending migrations."
            case "28P01":
            case "28000":
                return "PostgreSQL rejected the database credentials. Check the configured database connection."
            case "42501":
                return "The database role lacks permission for provisioning (42501)."
            case "23502":
                return "PostgreSQL rejected a missing required column value (23502). The provisioning code and database schema need checking."
            case "23503":
                return "PostgreSQL rejected a foreign-key reference (23503). The provisioning code and database schema need checking."
            case "ECONNREFUSED":
            case "ENOTFOUND":
            case "ETIMEDOUT":
            case "ECONNRESET":
                return `Database connection failed (${value.code}). Check database availability and connection settings.`
        }
        return value.operation === "decode"
            ? "A database result did not match the expected schema."
            : "A database operation failed without a classified SQLSTATE. Check database availability and migration status."
    }
    return "Provisioning failed while initializing the database/configuration. Check the server configuration."
}
