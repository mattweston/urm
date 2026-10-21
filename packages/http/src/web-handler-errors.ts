import { Schema } from "effect"

export class RequestDecodeError extends Schema.TaggedError<RequestDecodeError>()(
    "RequestDecodeError",
    { cause: Schema.Defect() }
) {}

export class WebHandlerPersistenceError extends Schema.TaggedError<WebHandlerPersistenceError>()(
    "WebHandlerPersistenceError",
    {
        operation: Schema.String,
        cause: Schema.optionalKey(Schema.Defect()),
    }
) {}
