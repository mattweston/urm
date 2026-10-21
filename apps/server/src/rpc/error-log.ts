/**
 * # RPC Error Logging Middleware
 *
 * Wraps every RPC handler on the server. Any failure cause other than
 * pure interruption is logged with the failing error's tag and message,
 * annotated with the rpc tag, so the observability logger persists it.
 *
 * Level reflects whether the failure was declared. A handler failing with
 * an error its contract lists — `AuthorizationError` on an anonymous page
 * load, a not-found, a rejected payload — is the system working, so it
 * logs at warning. Only defects log at error, which keeps the studio
 * Errors tab (it queries `level: "error"`) to genuine faults. Warnings
 * still persist at `level: "warning"` and stay visible in the Logs tab.
 */
import { Cause, Effect, Layer } from "effect"
import { RpcMiddleware } from "effect/rpc"

export class RpcErrorLogMiddleware extends RpcMiddleware.Service<RpcErrorLogMiddleware>()(
    "RpcErrorLogMiddleware"
) {}

/** Pulls a `_tag` and `message` off the squashed cause when the failure
 *  carries them — every `Schema.TaggedClass` error in the domain does.
 *  Falls back to the rendered cause so a defect thrown as a bare value
 *  still logs something legible. */
const describe_failure = <E>(
    cause: Cause.Cause<E>
): { error: string; reason: string } => {
    const failure = Cause.squash(cause)

    if (typeof failure === "object" && failure !== null) {
        const tag =
            "_tag" in failure && typeof failure._tag === "string"
                ? failure._tag
                : undefined
        const message =
            "message" in failure && typeof failure.message === "string"
                ? failure.message
                : undefined

        if (tag !== undefined || message !== undefined) {
            return {
                error: tag ?? "Error",
                reason: message ?? Cause.pretty(cause),
            }
        }
    }

    return {
        error: "Error",
        reason: typeof failure === "string" ? failure : Cause.pretty(cause),
    }
}

export const RpcErrorLogMiddlewareLive = Layer.succeed(
    RpcErrorLogMiddleware,
    RpcErrorLogMiddleware.of((effect, options) =>
        Effect.onError(effect, (cause) => {
            if (Cause.hasInterruptsOnly(cause)) {
                return Effect.void
            }

            const { error, reason } = describe_failure(cause)
            const message = `rpc ${options.rpc._tag} failed: ${reason}`

            return (
                Cause.hasDies(cause)
                    ? Effect.logError(message)
                    : Effect.logWarning(message)
            ).pipe(
                Effect.annotateLogs({
                    source: "rpc",
                    rpc: options.rpc._tag,
                    error,
                    reason,
                })
            )
        })
    )
)
