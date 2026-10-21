import { describe, expect, it } from "@effect/vitest"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../src/auth-legacy/rpc-middleware.ts"
import { TasksRpcs } from "../src/tasks/routes.ts"

const task_rpcs = [
    "items_list",
    "items_create",
    "items_update",
    "items_delete",
    "items_reorder_batch",
]

const hasMiddleware = (
    middlewares: Iterable<unknown> | undefined,
    middleware: unknown
) =>
    middlewares !== undefined &&
    [...middlewares].some((item) => item === middleware)

describe("domain-scoped task RPC contracts", () => {
    it("requires authenticated domain-manager authority for every task procedure", () => {
        for (const name of task_rpcs) {
            const rpc = TasksRpcs.requests.get(name)

            expect(
                hasMiddleware(rpc?.middlewares, ActiveDomainRpcMiddleware)
            ).toBe(true)
            expect(
                hasMiddleware(rpc?.middlewares, AuthenticatedRpcMiddleware)
            ).toBe(true)
            expect(
                hasMiddleware(rpc?.middlewares, DomainManagerRpcMiddleware)
            ).toBe(true)
        }
    })
})
