/**
 * Mocked Tags RPC Handlers
 *
 * Uses Faker.js to generate realistic test data.
 * No database required - pure in-memory storage.
 *
 * @packageDocumentation
 */

import { Effect, Context, Ref, Layer } from "effect"
import { faker } from "@faker-js/faker"
import {
    NotFoundError,
    ConflictError,
    type DatabaseError,
    type ValidationError,
} from "@urm/domain/errors"
import type {
    Tag as TagType,
    EntityTag as EntityTagType,
    CreateTagInput,
    UpdateTagInput,
    CreateEntityTagInput,
    SetTagsForEntityInput,
} from "@urm/domain/schemas/tags"

// In-memory storage for tests
interface MockStorage {
    tags: Map<string, TagType>
    entityTags: Map<string, EntityTagType>
    txCounter: number
}

// Create initial mock storage
const createMockStorage = (): MockStorage => ({
    tags: new Map(),
    entityTags: new Map(),
    txCounter: 0,
})

// Mock DatabaseClient tag
export class MockDatabaseClient extends Context.Service<
    MockDatabaseClient,
    { storage: Ref.Ref<MockStorage> }
>()("MockDatabaseClient") {}

// Define the type for RPC handlers based on TagsRpcs
type TagsRpcHandlers = {
    "tags.list": () => Effect.Effect<TagType[], DatabaseError, never>
    "tags.get": (params: {
        id: string
    }) => Effect.Effect<TagType, NotFoundError | DatabaseError, never>
    "tags.create": (params: {
        data: CreateTagInput
    }) => Effect.Effect<
        { item: TagType; txid: number },
        DatabaseError | ConflictError | ValidationError,
        never
    >
    "tags.update": (params: {
        id: string
        data: UpdateTagInput
    }) => Effect.Effect<
        { item: TagType; txid: number },
        NotFoundError | DatabaseError | ConflictError | ValidationError,
        never
    >
    "tags.delete": (params: {
        id: string
    }) => Effect.Effect<{ txid: number }, NotFoundError | DatabaseError, never>
    "tags.entity_tags_list": (params: {
        entity_type?: string
        entity_id?: string
    }) => Effect.Effect<EntityTagType[], DatabaseError, never>
    "tags.entity_tags_create": (params: {
        data: CreateEntityTagInput
    }) => Effect.Effect<
        { item: EntityTagType; txid: number },
        DatabaseError | ConflictError | ValidationError,
        never
    >
    "tags.entity_tags_delete": (params: {
        id: string
    }) => Effect.Effect<{ txid: number }, NotFoundError | DatabaseError, never>
    "tags.entity_tags_set": (
        params: SetTagsForEntityInput
    ) => Effect.Effect<{ txid: number }, DatabaseError | ValidationError, never>
}

// Tag for accessing the RPC handlers in tests
export class TagsRpcTestHandlers extends Context.Service<
    TagsRpcTestHandlers,
    TagsRpcHandlers
>()("TagsRpcTestHandlers") {}

// Generate a fake tag
const generateFakeTag = (): TagType => ({
    id: faker.string.uuid(),
    name: faker.lorem.word(),
    color: faker.color.rgb(),
    description: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    updated_at: Date.now(),
    deleted_at: undefined,
})

// Generate multiple fake tags
const generateFakeTags = (count: number): TagType[] =>
    Array.from({ length: count }, () => generateFakeTag())

// Generate a fake entity tag
const generateFakeEntityTag = (
    entityType?: string,
    entityId?: string
): EntityTagType => ({
    id: faker.string.uuid(),
    entity_type: entityType ?? faker.lorem.word(),
    entity_id: entityId ?? faker.string.uuid(),
    tag_id: faker.string.uuid(),
    updated_at: Date.now(),
})

// Create the RPC handlers implementation
const makeMockRpcHandlers = Effect.gen(function* () {
    const { storage } = yield* MockDatabaseClient

    return {
        // List all tags
        "tags.list": () =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                // Seed with fake data if empty
                if (store.tags.size === 0) {
                    const fakeTags = generateFakeTags(5)
                    for (const tag of fakeTags) {
                        store.tags.set(tag.id, tag)
                    }
                }

                return Array.from(store.tags.values())
            }),

        // Get tag by ID
        "tags.get": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                const tag = store.tags.get(id)
                if (!tag) {
                    return yield* Effect.fail(
                        new NotFoundError({
                            message: `Tag with id ${id} not found`,
                        })
                    )
                }

                return tag
            }),

        // Create a new tag
        "tags.create": ({ data }: { data: CreateTagInput }) =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                // Check for ID conflict
                if (store.tags.has(data.id)) {
                    return yield* Effect.fail(
                        new ConflictError({
                            message: `Tag with id ${data.id} already exists`,
                        })
                    )
                }

                // Check for name conflict
                for (const tag of store.tags.values()) {
                    if (tag.name === data.name) {
                        return yield* Effect.fail(
                            new ConflictError({
                                message: `Tag with name ${data.name} already exists`,
                            })
                        )
                    }
                }

                const newTag: TagType = {
                    ...data,
                    deleted_at: undefined,
                }

                store.tags.set(newTag.id, newTag)
                store.txCounter++

                return {
                    item: newTag,
                    txid: store.txCounter,
                }
            }),

        // Update a tag
        "tags.update": ({ id, data }: { id: string; data: UpdateTagInput }) =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                const existing = store.tags.get(id)
                if (!existing) {
                    return yield* Effect.fail(
                        new NotFoundError({
                            message: `Tag with id ${id} not found`,
                        })
                    )
                }

                // Check for name conflict if updating name
                if (data.name !== undefined) {
                    for (const tag of store.tags.values()) {
                        if (tag.name === data.name && tag.id !== id) {
                            return yield* Effect.fail(
                                new ConflictError({
                                    message: `Tag with name ${data.name} already exists`,
                                })
                            )
                        }
                    }
                }

                const updated: TagType = {
                    ...existing,
                    ...(data.name === undefined ? {} : { name: data.name }),
                    ...(data.color === undefined ? {} : { color: data.color }),
                    ...(data.description === undefined
                        ? {}
                        : { description: data.description }),
                    id: existing.id,
                    updated_at: data.updated_at,
                }

                store.tags.set(id, updated)
                store.txCounter++

                return {
                    item: updated,
                    txid: store.txCounter,
                }
            }),

        // Delete (soft delete) a tag
        "tags.delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                const existing = store.tags.get(id)
                if (!existing) {
                    return yield* Effect.fail(
                        new NotFoundError({
                            message: `Tag with id ${id} not found`,
                        })
                    )
                }

                // Soft delete
                const updated: TagType = {
                    ...existing,
                    deleted_at: Date.now(),
                    updated_at: Date.now(),
                }

                store.tags.set(id, updated)
                store.txCounter++

                return { txid: store.txCounter }
            }),

        // List entity tags
        "tags.entity_tags_list": ({
            entity_type,
            entity_id,
        }: {
            entity_type?: string
            entity_id?: string
        }) =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                let entityTags = Array.from(store.entityTags.values())

                if (entity_type && entity_id) {
                    entityTags = entityTags.filter(
                        (et) =>
                            et.entity_type === entity_type &&
                            et.entity_id === entity_id
                    )
                } else if (entity_type) {
                    entityTags = entityTags.filter(
                        (et) => et.entity_type === entity_type
                    )
                } else if (entity_id) {
                    entityTags = entityTags.filter(
                        (et) => et.entity_id === entity_id
                    )
                }

                return entityTags
            }),

        // Create entity tag link
        "tags.entity_tags_create": ({ data }: { data: CreateEntityTagInput }) =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                // Check for duplicate entity-tag pairing
                for (const et of store.entityTags.values()) {
                    if (
                        et.entity_type === data.entity_type &&
                        et.entity_id === data.entity_id &&
                        et.tag_id === data.tag_id
                    ) {
                        return yield* Effect.fail(
                            new ConflictError({
                                message: `Entity already has this tag`,
                            })
                        )
                    }
                }

                const newEntityTag: EntityTagType = {
                    ...data,
                }

                store.entityTags.set(newEntityTag.id, newEntityTag)
                store.txCounter++

                return {
                    item: newEntityTag,
                    txid: store.txCounter,
                }
            }),

        // Delete entity tag link
        "tags.entity_tags_delete": ({ id }: { id: string }) =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                if (!store.entityTags.has(id)) {
                    return yield* Effect.fail(
                        new NotFoundError({
                            message: `EntityTag with id ${id} not found`,
                        })
                    )
                }

                store.entityTags.delete(id)
                store.txCounter++

                return { txid: store.txCounter }
            }),

        // Set tags for entity
        "tags.entity_tags_set": ({
            entity_type,
            entity_id,
            tag_ids,
        }: SetTagsForEntityInput) =>
            Effect.gen(function* () {
                const store = yield* Ref.get(storage)

                // Delete all existing entity-tag links for this entity
                for (const [id, et] of store.entityTags) {
                    if (
                        et.entity_type === entity_type &&
                        et.entity_id === entity_id
                    ) {
                        store.entityTags.delete(id)
                    }
                }

                // Insert new entity-tag links
                const now = Date.now()
                for (const tagId of tag_ids) {
                    const id = `${entity_type}/${entity_id}/${tagId}`
                    store.entityTags.set(id, {
                        id,
                        entity_type,
                        entity_id,
                        tag_id: tagId,
                        updated_at: now,
                    })
                }

                store.txCounter++

                return { txid: store.txCounter }
            }),
    }
})

// Layer that provides the RPC handlers for tests
const MockDatabaseClientLive = Layer.effect(
    MockDatabaseClient,
    Effect.gen(function* () {
        const storage = yield* Ref.make(createMockStorage())
        return { storage }
    })
)

export const MockTagsRpcLive = Layer.effect(
    TagsRpcTestHandlers,
    makeMockRpcHandlers
).pipe(Layer.provide(MockDatabaseClientLive))

// Export test utilities
export { generateFakeTag, generateFakeTags, generateFakeEntityTag }
