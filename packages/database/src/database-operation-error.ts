import * as Schema from "effect/Schema"

export class DatabaseOperationError extends Schema.TaggedError<DatabaseOperationError>()(
    "DatabaseOperationError",
    {
        operation: Schema.String,
        reason: Schema.String,
        cause: Schema.optionalKey(Schema.Defect()),
    }
) {
    override get message(): string {
        return `${this.operation}: ${this.reason}`
    }
}

export const databaseOperationError = (
    operation: string,
    reason: string,
    cause?: unknown
): DatabaseOperationError =>
    cause === undefined
        ? new DatabaseOperationError({ operation, reason })
        : new DatabaseOperationError({ operation, reason, cause })
