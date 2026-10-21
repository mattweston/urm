import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { AuthPersistence } from "@urm/auth/auth-persistence"
import { authRateLimitKey, checkAuthRateLimit } from "@urm/auth/rate-limiter"
import { DemoWorkspaceRpcs } from "@urm/contracts/demo-workspaces"
import { AuthenticatedRequestContext } from "@urm/contracts/auth-legacy"
import { DemoWorkspaceProvisioning } from "@urm/db"
import { loadEnvironmentConfig } from "@urm/db/config"
import { AuthorizationError, DatabaseError } from "@urm/domain/errors"

const DEMO_PROVISION_LIMIT = 6
const DEMO_PROVISION_WINDOW_SECONDS = 60 * 60

const getAuthenticatedRequestContext = Effect.serviceOption(
    AuthenticatedRequestContext
).pipe(
    Effect.flatMap(
        Option.match({
            onNone: () =>
                Effect.fail(
                    new AuthorizationError({
                        message: "Authentication required",
                    })
                ),
            onSome: Effect.succeed,
        })
    )
)

const requireProvisionAllowance = (contact_id: string) =>
    checkAuthRateLimit({
        route: "demo/workspace/provision",
        key: authRateLimitKey(["demo", "workspace", contact_id]),
        limit: DEMO_PROVISION_LIMIT,
        window_seconds: DEMO_PROVISION_WINDOW_SECONDS,
        block_seconds: DEMO_PROVISION_WINDOW_SECONDS,
    }).pipe(
        Effect.filterOrFail(
            (decision) => decision.allowed,
            () =>
                new AuthorizationError({
                    message: "Demo workspace rate limit reached",
                })
        ),
        Effect.asVoid
    )

const DemoWorkspaceRpcHandlersLive = Effect.gen(function* () {
    const auth_persistence = yield* AuthPersistence
    const provisioning = yield* DemoWorkspaceProvisioning

    return DemoWorkspaceRpcs.of({
        "demo.workspace.provision": () =>
            Effect.gen(function* () {
                const environment = yield* loadEnvironmentConfig

                if (!environment.is_demo) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message: "Demo provisioning is unavailable",
                        })
                    )
                }

                const authenticated = yield* getAuthenticatedRequestContext

                if (authenticated.domainId !== undefined) {
                    return yield* Effect.fail(
                        new AuthorizationError({
                            message:
                                "Demo provisioning requires the central host",
                        })
                    )
                }

                yield* requireProvisionAllowance(authenticated.contactId).pipe(
                    Effect.provideService(AuthPersistence, auth_persistence)
                )

                return yield* provisioning.provision(authenticated.contactId)
            }).pipe(
                Effect.mapError((error) =>
                    error instanceof AuthorizationError
                        ? error
                        : new DatabaseError({
                              message: "Failed to provision demo workspace",
                          })
                )
            ),
    })
})

export const DemoWorkspaceRpcLive = DemoWorkspaceRpcs.toLayer(
    DemoWorkspaceRpcHandlersLive
)
