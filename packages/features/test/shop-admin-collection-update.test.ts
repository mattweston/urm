import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { ProductCollection } from "@urm/domain/schemas/shop"
import {
    ClickedCancelLayoutEditing,
    ClickedEditLayout,
    CollectionCreated,
    CollectionsLoaded,
    CollectionUpdated,
    SubmittedCollectionForm,
    UpdatedCollectionDraft,
} from "../src/shop/admin.message.ts"
import {
    ShopCollectionRoute,
    ShopCollectionsRoute,
} from "../src/shop/admin.route.ts"
import { init, update } from "../src/shop/admin.update.ts"

const collection = ProductCollection.make({
    id: "collection-1",
    name: "Summer goods",
    slug: "summer-goods",
    description: "Seasonal products",
    imageUrl: "https://example.com/summer.jpg",
    isActive: true,
    productCount: 2,
    createdAt: 1,
    updatedAt: 1,
})

describe("shop builder collection editing", () => {
    it("loads collection data into the matching detail editor", () => {
        const [model] = init(ShopCollectionRoute({ slug: collection.slug }))
        const [loadedModel] = update(
            model,
            CollectionsLoaded({ collections: [collection] })
        )

        expect(loadedModel.collectionDraft).toEqual({
            name: collection.name,
            slug: collection.slug,
            description: collection.description,
            imageUrl: collection.imageUrl,
            isActive: true,
        })
        expect(loadedModel.areCollectionsLoading).toBe(false)
    })

    it("submits a valid collection from the listing overlay", () => {
        const [model] = init(ShopCollectionsRoute())
        const [editingModel] = update(model, ClickedEditLayout())
        const [namedModel] = update(
            editingModel,
            UpdatedCollectionDraft({ field: "name", value: "Summer goods" })
        )
        const [readyModel] = update(
            namedModel,
            UpdatedCollectionDraft({ field: "slug", value: "summer-goods" })
        )
        const [submittingModel, commands] = update(
            readyModel,
            SubmittedCollectionForm()
        )

        expect(submittingModel.isCollectionSubmitting).toBe(true)
        expect(commands).toHaveLength(1)
        expect(Option.isNone(submittingModel.error)).toBe(true)
    })

    it("rejects an invalid collection slug before issuing a command", () => {
        const [model] = init(ShopCollectionsRoute())
        const [namedModel] = update(
            model,
            UpdatedCollectionDraft({ field: "name", value: "Summer goods" })
        )
        const [invalidModel] = update(
            namedModel,
            UpdatedCollectionDraft({ field: "slug", value: "Summer goods" })
        )
        const [resultModel, commands] = update(
            invalidModel,
            SubmittedCollectionForm()
        )

        expect(commands).toEqual([])
        expect(Option.getOrUndefined(resultModel.error)).toContain("Slug")
    })

    it("replaces an updated collection and closes the editor", () => {
        const [model] = init(ShopCollectionRoute({ slug: collection.slug }))
        const [loadedModel] = update(
            model,
            CollectionsLoaded({ collections: [collection] })
        )
        const [editingModel] = update(loadedModel, ClickedEditLayout())
        const updatedCollection = ProductCollection.make({
            ...collection,
            name: "Updated summer goods",
            slug: "updated-summer-goods",
            updatedAt: 2,
        })
        const [updatedModel, commands] = update(
            editingModel,
            CollectionUpdated({ collection: updatedCollection })
        )

        expect(updatedModel.collections).toEqual([updatedCollection])
        expect(updatedModel.collectionDraft.name).toBe("Updated summer goods")
        expect(updatedModel.editorState._tag).toBe("Viewing")
        expect(updatedModel.savedCollectionSnapshot.name).toBe(
            "Updated summer goods"
        )
        expect(updatedModel.route).toEqual({
            _tag: "ShopCollection",
            slug: updatedCollection.slug,
        })
        expect(commands).toHaveLength(1)
    })

    it("adds a created collection and resets the creation form", () => {
        const [model] = init(ShopCollectionsRoute())
        const [editingModel] = update(model, ClickedEditLayout())
        const [createdModel] = update(
            editingModel,
            CollectionCreated({ collection })
        )

        expect(createdModel.collections).toEqual([collection])
        expect(createdModel.collectionDraft.name).toBe("")
        expect(createdModel.editorState._tag).toBe("Viewing")
    })

    it("restores the saved collection snapshot when editing is cancelled", () => {
        const [model] = init(ShopCollectionRoute({ slug: collection.slug }))
        const [loadedModel] = update(
            model,
            CollectionsLoaded({ collections: [collection] })
        )
        const [editingModel] = update(loadedModel, ClickedEditLayout())
        const [changedModel] = update(
            editingModel,
            UpdatedCollectionDraft({
                field: "name",
                value: "Discard this name",
            })
        )
        const [cancelledModel, commands] = update(
            changedModel,
            ClickedCancelLayoutEditing()
        )

        expect(cancelledModel.editorState._tag).toBe("Viewing")
        expect(cancelledModel.collectionDraft).toEqual(
            cancelledModel.savedCollectionSnapshot
        )
        expect(cancelledModel.collectionDraft.name).toBe(collection.name)
        expect(commands).toEqual([])
    })
})
