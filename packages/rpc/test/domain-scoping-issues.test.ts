import { Effect, Layer, ManagedRuntime, Ref } from "effect"
import { describe, expect, it } from "vitest"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import {
    IssueLabelsRepository,
    IssuesRepository,
} from "@urm/contracts/repositories/issues"
import {
    IssueLabelsRpcHandlersTag,
    IssueLabelsRpcHandlersTagLive,
    IssuesRpcHandlersTag,
    IssuesRpcHandlersTagLive,
} from "../src/handlers/issues/handlers.ts"

const active_domain = ActiveDomainRequestContext.of({
    domainId: "domain-a",
    hostname: "domain-a.localhost",
})

const make_runtime = async () => {
    const issue_reads = await Effect.runPromise(
        Ref.make<ReadonlyArray<{ domain_id: string; id: string }>>([])
    )
    const label_deletions = await Effect.runPromise(
        Ref.make<ReadonlyArray<{ domain_id: string; id: string }>>([])
    )
    const issues_repository = Layer.succeed(
        IssuesRepository,
        IssuesRepository.of({
            insert: () => Effect.die("Not used by this test"),
            update: () => Effect.die("Not used by this test"),
            findById: (domain_id, id) =>
                Effect.gen(function* () {
                    yield* Ref.update(issue_reads, (reads) => [
                        ...reads,
                        { domain_id, id },
                    ])
                    return null
                }),
            findMany: () => Effect.die("Not used by this test"),
            delete: () => Effect.die("Not used by this test"),
        })
    )
    const labels_repository = Layer.succeed(
        IssueLabelsRepository,
        IssueLabelsRepository.of({
            insert: () => Effect.die("Not used by this test"),
            update: () => Effect.die("Not used by this test"),
            findById: () => Effect.die("Not used by this test"),
            findMany: () => Effect.die("Not used by this test"),
            delete: (domain_id, id) =>
                Ref.update(label_deletions, (deletions) => [
                    ...deletions,
                    { domain_id, id },
                ]),
        })
    )
    const runtime = ManagedRuntime.make(
        Layer.mergeAll(
            IssuesRpcHandlersTagLive.pipe(Layer.provide(issues_repository)),
            IssueLabelsRpcHandlersTagLive.pipe(
                Layer.provide(labels_repository)
            ),
            Layer.succeed(ActiveDomainRequestContext, active_domain)
        )
    )
    return { issue_reads, label_deletions, runtime }
}

describe("retained Issues RPC domain scope", () => {
    it("uses the active domain for issue-label deletion", async () => {
        const { label_deletions, runtime } = await make_runtime()
        await runtime.runPromise(
            Effect.gen(function* () {
                const labels = yield* IssueLabelsRpcHandlersTag
                yield* labels["issueLabels.delete"]({ id: "label-from-domain-b" })
            })
        )
        expect(await Effect.runPromise(Ref.get(label_deletions))).toEqual([
            { domain_id: "domain-a", id: "label-from-domain-b" },
        ])
    })

    it("does not look up an issue outside the active domain", async () => {
        const { issue_reads, runtime } = await make_runtime()
        await expect(
            runtime.runPromise(
                Effect.gen(function* () {
                    const issues = yield* IssuesRpcHandlersTag
                    return yield* issues["issues.get"]({ id: "issue-from-domain-b" })
                })
            )
        ).rejects.toThrow("Issue with id issue-from-domain-b not found")
        expect(await Effect.runPromise(Ref.get(issue_reads))).toEqual([
            { domain_id: "domain-a", id: "issue-from-domain-b" },
        ])
    })
})
