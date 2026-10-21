import { Effect, Layer } from "effect"
import { authenticate_token, session_token } from "@urm/auth"
import { AuthenticatedRpcMiddleware } from "@urm/contracts/auth"
import { AuthorizationError } from "@urm/domain/errors"
import { Sql } from "@urm/db/sql"

/** Bind to the actual HTTP request, never client-supplied RPC payload headers. */
export const authenticated_rpc_layer = (request: Request) =>
    Layer.effect(
        AuthenticatedRpcMiddleware,
        Effect.gen(function* () {
            const db = yield* Sql
            const authenticate = yield* Effect.cached(
                authenticate_token(session_token(request)).pipe(
                    Effect.provideService(Sql, db),
                    Effect.mapError(
                        () =>
                            new AuthorizationError({
                                message: "Authentication required",
                            })
                    )
                )
            )
            return AuthenticatedRpcMiddleware.of((next) =>
                authenticate.pipe(Effect.andThen(next))
            )
        })
    )
