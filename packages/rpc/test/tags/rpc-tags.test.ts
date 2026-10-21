/**
 * Tags RPC Tests
 *
 * Tests the RPC layer with mocked data (no database required).
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest"
import { Effect, ManagedRuntime } from "effect"
import { MockTagsRpcLive, TagsRpcTestHandlers } from "./mocks/handlers.js"

describe("Tags RPC", () => {
    const setupTest = async () => {
        const runtime = ManagedRuntime.make(MockTagsRpcLive)
        await runtime.runPromise(Effect.void)
        return { runtime }
    }

    describe("list", () => {
        it("should return all tags", async () => {
            const { runtime } = await setupTest()

            const result = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.list"]()
                })
            )

            expect(result.length).toBeGreaterThan(0)
            expect(result[0]).toHaveProperty("id")
            expect(result[0]).toHaveProperty("name")
            expect(result[0]).toHaveProperty("color")
        })
    })

    describe("get", () => {
        it("should return a tag by ID", async () => {
            const { runtime } = await setupTest()

            const tags = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.list"]()
                })
            )

            expect(tags.length).toBeGreaterThan(0)
            const tagId = tags[0]!.id

            const result = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.get"]({ id: tagId })
                })
            )

            expect(result.id).toBe(tagId)
        })

        it("should fail when tag not found", async () => {
            const { runtime } = await setupTest()

            await expect(
                runtime.runPromise(
                    Effect.gen(function* () {
                        const handlers = yield* TagsRpcTestHandlers
                        return yield* handlers["tags.get"]({
                            id: "non-existent-id",
                        })
                    })
                )
            ).rejects.toThrow("Tag with id non-existent-id not found")
        })
    })

    describe("create", () => {
        it("should create a new tag", async () => {
            const { runtime } = await setupTest()

            const newTag = {
                id: "test-tag-id",
                name: "Test Tag",
                color: "#ff0000",
                description: "Test description",
                updated_at: Date.now(),
            }

            const result = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.create"]({ data: newTag })
                })
            )

            expect(result.item.id).toBe(newTag.id)
            expect(result.item.name).toBe(newTag.name)
            expect(result.txid).toBeGreaterThan(0)
        })

        it("should fail when tag ID already exists", async () => {
            const { runtime } = await setupTest()

            const newTag = {
                id: "conflict-test-id",
                name: "Original Tag",
                color: "#00ff00",
                updated_at: Date.now(),
            }

            await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.create"]({ data: newTag })
                })
            )

            const duplicateTag = {
                ...newTag,
                name: "Different Name",
            }

            await expect(
                runtime.runPromise(
                    Effect.gen(function* () {
                        const handlers = yield* TagsRpcTestHandlers
                        return yield* handlers["tags.create"]({
                            data: duplicateTag,
                        })
                    })
                )
            ).rejects.toThrow("Tag with id conflict-test-id already exists")
        })
    })

    describe("update", () => {
        it("should update an existing tag", async () => {
            const { runtime } = await setupTest()

            const newTag = {
                id: "update-test-id",
                name: "Original Name",
                color: "#0000ff",
                updated_at: Date.now(),
            }

            await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.create"]({ data: newTag })
                })
            )

            const result = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.update"]({
                        id: "update-test-id",
                        data: {
                            id: "update-test-id",
                            name: "Updated Name",
                            updated_at: Date.now(),
                        },
                    })
                })
            )

            expect(result.item.name).toBe("Updated Name")
            expect(result.item.id).toBe("update-test-id")
            expect(result.txid).toBeGreaterThan(0)
        })

        it("should fail when updating non-existent tag", async () => {
            const { runtime } = await setupTest()

            await expect(
                runtime.runPromise(
                    Effect.gen(function* () {
                        const handlers = yield* TagsRpcTestHandlers
                        return yield* handlers["tags.update"]({
                            id: "non-existent-id",
                            data: {
                                id: "non-existent-id",
                                name: "New Name",
                                updated_at: Date.now(),
                            },
                        })
                    })
                )
            ).rejects.toThrow("Tag with id non-existent-id not found")
        })
    })

    describe("delete", () => {
        it("should soft delete an existing tag", async () => {
            const { runtime } = await setupTest()

            const newTag = {
                id: "delete-test-id",
                name: "Tag to Delete",
                color: "#ff0000",
                updated_at: Date.now(),
            }

            await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.create"]({ data: newTag })
                })
            )

            const result = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.delete"]({
                        id: "delete-test-id",
                    })
                })
            )

            expect(result.txid).toBeGreaterThan(0)

            const tag = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.get"]({ id: "delete-test-id" })
                })
            )

            expect(tag.deleted_at).toBeDefined()
        })
    })

    describe("entity_tags", () => {
        it("should create entity tag link", async () => {
            const { runtime } = await setupTest()

            const newEntityTag = {
                id: "test-entity-tag-id",
                entity_type: "contact",
                entity_id: "contact-123",
                tag_id: "tag-456",
                updated_at: Date.now(),
            }

            const result = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.entity_tags_create"]({
                        data: newEntityTag,
                    })
                })
            )

            expect(result.item.id).toBe(newEntityTag.id)
            expect(result.txid).toBeGreaterThan(0)
        })

        it("should set tags for entity", async () => {
            const { runtime } = await setupTest()

            const result = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.entity_tags_set"]({
                        entity_type: "contact",
                        entity_id: "contact-789",
                        tag_ids: ["tag-1", "tag-2", "tag-3"],
                    })
                })
            )

            expect(result.txid).toBeGreaterThan(0)

            const entityTags = await runtime.runPromise(
                Effect.gen(function* () {
                    const handlers = yield* TagsRpcTestHandlers
                    return yield* handlers["tags.entity_tags_list"]({
                        entity_type: "contact",
                        entity_id: "contact-789",
                    })
                })
            )

            expect(entityTags.length).toBe(3)
        })
    })
})
