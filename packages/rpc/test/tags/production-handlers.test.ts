import { Effect, Layer, ManagedRuntime, Ref } from "effect"
import { describe, expect, it } from "vitest"
import {
    EntityTagsRepository,
    TagsRepository,
} from "@urm/contracts/repositories/tags"
import { ActiveDomainRequestContext } from "@urm/contracts/auth-legacy"
import { TagsRpcHandlersTagLive } from "../../src/handlers/tags-legacy/handlers.ts"
import { TagsRpcHandlersTag } from "../../src/handlers/tags-legacy/tag.ts"

const makeTestRuntime = async () => {
    const deletedTags = await Effect.runPromise(
        Ref.make<
            ReadonlyArray<
                Readonly<{
                    domain_id: string
                    id: string
                }>
            >
        >([])
    )
    const replacements = await Effect.runPromise(
        Ref.make<
            ReadonlyArray<
                Readonly<{
                    domain_id: string
                    entity_type: string
                    entity_id: string
                    tag_ids: ReadonlyArray<string>
                }>
            >
        >([])
    )

    const tagsRepositoryTestLive = Layer.succeed(
        TagsRepository,
        TagsRepository.of({
            findMany: () => Effect.die("Not used by this test"),
            findById: () => Effect.die("Not used by this test"),
            insert: () => Effect.die("Not used by this test"),
            update: () => Effect.die("Not used by this test"),
            delete: (domain_id, id) =>
                Ref.update(deletedTags, (tags) => [...tags, { domain_id, id }]),
        })
    )
    const entityTagsRepositoryTestLive = Layer.succeed(
        EntityTagsRepository,
        EntityTagsRepository.of({
            findMany: () => Effect.die("Not used by this test"),
            insert: () => Effect.die("Not used by this test"),
            delete: () => Effect.die("Not used by this test"),
            setTagsForEntity: (domain_id, entity_type, entity_id, tag_ids) =>
                Ref.update(replacements, (values) => [
                    ...values,
                    { domain_id, entity_type, entity_id, tag_ids },
                ]),
        })
    )
    const runtime = ManagedRuntime.make(
        TagsRpcHandlersTagLive.pipe(
            Layer.provide(
                Layer.mergeAll(
                    tagsRepositoryTestLive,
                    entityTagsRepositoryTestLive,
                    Layer.succeed(
                        ActiveDomainRequestContext,
                        ActiveDomainRequestContext.of({
                            domainId: "domain-1",
                            hostname: "domain-1.localhost",
                        })
                    )
                )
            )
        )
    )

    return { deletedTags, replacements, runtime }
}

describe("production Tags RPC handlers", () => {
    it("delegates deletion and returns the RPC transaction placeholder", async () => {
        const { deletedTags, runtime } = await makeTestRuntime()

        const result = await runtime.runPromise(
            Effect.gen(function* () {
                const handlers = yield* TagsRpcHandlersTag
                return yield* handlers["tags.delete"]({ id: "tag-1" }).pipe(
                    Effect.provideService(
                        ActiveDomainRequestContext,
                        ActiveDomainRequestContext.of({
                            domainId: "domain-1",
                            hostname: "domain-1.localhost",
                        })
                    )
                )
            })
        )

        expect(result).toEqual({ txid: 0 })
        expect(await Effect.runPromise(Ref.get(deletedTags))).toEqual([
            {
                domain_id: "domain-1",
                id: "tag-1",
            },
        ])
    })

    it("replaces an entity's tags through the repository", async () => {
        const { replacements, runtime } = await makeTestRuntime()

        const result = await runtime.runPromise(
            Effect.gen(function* () {
                const handlers = yield* TagsRpcHandlersTag
                return yield* handlers["tags.entity_tags_set"]({
                    entity_type: "contact",
                    entity_id: "contact-1",
                    tag_ids: ["tag-1", "tag-2"],
                }).pipe(
                    Effect.provideService(
                        ActiveDomainRequestContext,
                        ActiveDomainRequestContext.of({
                            domainId: "domain-1",
                            hostname: "domain-1.localhost",
                        })
                    )
                )
            })
        )

        expect(result).toEqual({ txid: 0 })
        expect(await Effect.runPromise(Ref.get(replacements))).toEqual([
            {
                domain_id: "domain-1",
                entity_type: "contact",
                entity_id: "contact-1",
                tag_ids: ["tag-1", "tag-2"],
            },
        ])
    })
})
