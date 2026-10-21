import { Schema } from "effect"

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
    "NotFoundError",
    { message: Schema.String }
) {}

export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
    "DatabaseError",
    { message: Schema.String }
) {}

export class ConflictError extends Schema.TaggedError<ConflictError>()(
    "ConflictError",
    { message: Schema.String }
) {}

export class ValidationError extends Schema.TaggedError<ValidationError>()(
    "ValidationError",
    { message: Schema.String }
) {}

export class AuthorizationError extends Schema.TaggedError<AuthorizationError>()(
    "AuthorizationError",
    { message: Schema.String }
) {}

export class InvalidCartSessionError extends Schema.TaggedError<InvalidCartSessionError>()(
    "InvalidCartSessionError",
    { message: Schema.String }
) {}

export class CartError extends Schema.TaggedError<CartError>()(
    "CartError",
    { message: Schema.String }
) {}

export class CheckoutError extends Schema.TaggedError<CheckoutError>()(
    "CheckoutError",
    { message: Schema.String }
) {}

export class OrderError extends Schema.TaggedError<OrderError>()(
    "OrderError",
    { message: Schema.String }
) {}

export class WebhookError extends Schema.TaggedError<WebhookError>()(
    "WebhookError",
    { message: Schema.String }
) {}

