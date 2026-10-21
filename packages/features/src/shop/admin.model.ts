import { Option, Schema as S } from "effect"
import { File } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import * as Ui from "@foldkit/ui"
import { ProductCollection } from "@urm/domain/schemas/shop"
import { Image } from "@urm/domain/schemas/media"
import {
    blankCollectionDraft,
    blankCheckoutDraft,
    blankProductDraft,
    CartSnapshot,
    CheckoutDraft,
    CollectionDraft,
    Product,
    ProductDraft,
    OrderSnapshot,
} from "./admin.data.ts"
import { Route } from "./admin.route.ts"

export const Viewing = taggedStruct("Viewing")
export const Editing = taggedStruct("Editing")
export const EditorState = S.Union([Viewing, Editing])

export const Model = S.Struct({
    route: Route,
    products: S.Array(Product),
    collections: S.Array(ProductCollection),
    cartSnapshot: CartSnapshot,
    orders: S.Array(OrderSnapshot),
    checkoutDraft: CheckoutDraft,
    productDraft: ProductDraft,
    collectionDraft: CollectionDraft,
    savedCollectionSnapshot: CollectionDraft,
    isLoading: S.Boolean,
    isSubmitting: S.Boolean,
    areCollectionsLoading: S.Boolean,
    isCollectionSubmitting: S.Boolean,
    isCartLoading: S.Boolean,
    isCartSubmitting: S.Boolean,
    areOrdersLoading: S.Boolean,
    isOrderSubmitting: S.Boolean,
    productImageDrop: Ui.FileDrop.Model,
    selectedProductImageFiles: S.Array(File.File),
    isProductImageUploading: S.Boolean,
    isProductMediaLibraryOpen: S.Boolean,
    isProductMediaLibraryLoading: S.Boolean,
    productMediaImages: S.Array(Image),
    productMediaError: S.Option(S.String),
    productMediaRequest: S.Number,
    editorState: EditorState,
    error: S.Option(S.String),
    success: S.Option(S.String),
})
export type Model = typeof Model.Type

export const initialModel = (route: Route): Model => ({
    route,
    products: [],
    collections: [],
    cartSnapshot: { cart: null, items: [] },
    orders: [],
    checkoutDraft: blankCheckoutDraft(),
    productDraft: blankProductDraft(),
    collectionDraft: blankCollectionDraft(),
    savedCollectionSnapshot: blankCollectionDraft(),
    isLoading: true,
    isSubmitting: false,
    areCollectionsLoading: true,
    isCollectionSubmitting: false,
    isCartLoading: true,
    isCartSubmitting: false,
    areOrdersLoading: true,
    isOrderSubmitting: false,
    productImageDrop: Ui.FileDrop.init({ id: "shop-product-image-drop" }),
    selectedProductImageFiles: [],
    isProductImageUploading: false,
    isProductMediaLibraryOpen: false,
    isProductMediaLibraryLoading: false,
    productMediaImages: [],
    productMediaError: Option.none(),
    productMediaRequest: 0,
    editorState: Viewing(),
    error: Option.none(),
    success: Option.none(),
})
