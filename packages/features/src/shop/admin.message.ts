import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"
import { Image } from "@urm/domain/schemas/media"
import { ProductCollection } from "@urm/domain/schemas/shop"
import { CartSnapshot, OrderSnapshot, Product } from "./admin.data.ts"
import { Route } from "./admin.route.ts"

export const ChangedRoute = taggedStruct("ChangedRoute", { route: Route })
export const ProductsLoaded = taggedStruct("ProductsLoaded", {
    products: S.Array(Product),
})
export const CollectionsLoaded = taggedStruct("CollectionsLoaded", {
    collections: S.Array(ProductCollection),
})
export const CatalogLoaded = taggedStruct("CatalogLoaded", {
    products: S.Array(Product),
    collections: S.Array(ProductCollection),
})
export const UpdatedProductDraft = taggedStruct("UpdatedProductDraft", {
    field: S.Union([
        S.Literal("name"),
        S.Literal("slug"),
        S.Literal("description"),
        S.Literal("price"),
        S.Literal("inventory"),
        S.Literal("imageUrl"),
    ]),
    value: S.String,
})
export const UpdatedProductActive = taggedStruct("UpdatedProductActive", {
    value: S.Boolean,
})
export const UpdatedProductFeatured = taggedStruct("UpdatedProductFeatured", {
    value: S.Boolean,
})
export const UpdatedProductCollection = taggedStruct(
    "UpdatedProductCollection",
    {
        collectionId: S.String,
        selected: S.Boolean,
    }
)
export const GotProductImageDropMessage = taggedStruct(
    "GotProductImageDropMessage",
    {
        message: Ui.FileDrop.Message,
    }
)
export const RemovedSelectedProductImage = taggedStruct(
    "RemovedSelectedProductImage",
    {
        fileIndex: S.Number,
    }
)
export const ClickedUploadProductImage = taggedStruct(
    "ClickedUploadProductImage"
)
export const ProductImageUploaded = taggedStruct("ProductImageUploaded", {
    image: Image,
})
export const OpenedProductMediaLibrary = taggedStruct(
    "OpenedProductMediaLibrary"
)
export const ClosedProductMediaLibrary = taggedStruct(
    "ClosedProductMediaLibrary"
)
export const ProductMediaLoaded = taggedStruct("ProductMediaLoaded", {
    images: S.Array(Image),
})
export const ProductMediaFailed = taggedStruct("ProductMediaFailed", {
    error: S.String,
})
export const SelectedProductMediaImage = taggedStruct(
    "SelectedProductMediaImage",
    { imageId: S.String }
)
export const SubmittedProductForm = taggedStruct("SubmittedProductForm")
export const ClickedEditLayout = taggedStruct("ClickedEditLayout")
export const ClickedCancelLayoutEditing = taggedStruct(
    "ClickedCancelLayoutEditing"
)
export const UpdatedCollectionDraft = taggedStruct("UpdatedCollectionDraft", {
    field: S.Literals(["name", "slug", "description", "imageUrl"]),
    value: S.String,
})
export const UpdatedCollectionActive = taggedStruct("UpdatedCollectionActive", {
    value: S.Boolean,
})
export const SubmittedCollectionForm = taggedStruct("SubmittedCollectionForm")
export const CollectionCreated = taggedStruct("CollectionCreated", {
    collection: ProductCollection,
})
export const CollectionUpdated = taggedStruct("CollectionUpdated", {
    collection: ProductCollection,
})
export const CompletedCollectionNavigation = taggedStruct(
    "CompletedCollectionNavigation"
)
export const ProductCreated = taggedStruct("ProductCreated", {
    product: Product,
})
export const ProductUpdated = taggedStruct("ProductUpdated", {
    product: Product,
})
export const CartLoaded = taggedStruct("CartLoaded", { snapshot: CartSnapshot })
export const ClickedAddCartItem = taggedStruct("ClickedAddCartItem", {
    variantId: S.String,
    quantity: S.Number,
})
export const ChangedCartItemQuantity = taggedStruct("ChangedCartItemQuantity", {
    itemId: S.String,
    quantity: S.Number,
})
export const ClickedRemoveCartItem = taggedStruct("ClickedRemoveCartItem", {
    itemId: S.String,
})
export const ClickedClearCart = taggedStruct("ClickedClearCart")
export const CartUpdated = taggedStruct("CartUpdated", {
    snapshot: CartSnapshot,
})
export const CartActionFailed = taggedStruct("CartActionFailed", {
    error: S.String,
})
export const OrdersLoaded = taggedStruct("OrdersLoaded", {
    orders: S.Array(OrderSnapshot),
})
export const UpdatedCheckoutDraft = taggedStruct("UpdatedCheckoutDraft", {
    field: S.Literals([
        "email",
        "firstName",
        "lastName",
        "line1",
        "city",
        "province",
        "country",
        "postal",
    ]),
    value: S.String,
})
export const SubmittedPendingOrder = taggedStruct("SubmittedPendingOrder")
export const PendingOrderCreated = taggedStruct("PendingOrderCreated", {
    snapshot: OrderSnapshot,
})
export const CompletedOrderNavigation = taggedStruct("CompletedOrderNavigation")
export const OrderActionFailed = taggedStruct("OrderActionFailed", {
    error: S.String,
})
export const ProductActionFailed = taggedStruct("ProductActionFailed", {
    action: S.Union([
        S.Literal("load-products"),
        S.Literal("upload-product-image"),
        S.Literal("create-product"),
        S.Literal("update-product"),
        S.Literal("load-collections"),
        S.Literal("create-collection"),
        S.Literal("update-collection"),
    ]),
    error: S.String,
})

export const Message = S.Union([
    ChangedRoute,
    ProductsLoaded,
    CollectionsLoaded,
    CatalogLoaded,
    UpdatedProductDraft,
    UpdatedProductActive,
    UpdatedProductFeatured,
    UpdatedProductCollection,
    GotProductImageDropMessage,
    RemovedSelectedProductImage,
    ClickedUploadProductImage,
    ProductImageUploaded,
    OpenedProductMediaLibrary,
    ClosedProductMediaLibrary,
    ProductMediaLoaded,
    ProductMediaFailed,
    SelectedProductMediaImage,
    SubmittedProductForm,
    ClickedEditLayout,
    ClickedCancelLayoutEditing,
    UpdatedCollectionDraft,
    UpdatedCollectionActive,
    SubmittedCollectionForm,
    CollectionCreated,
    CollectionUpdated,
    CompletedCollectionNavigation,
    ProductCreated,
    ProductUpdated,
    CartLoaded,
    ClickedAddCartItem,
    ChangedCartItemQuantity,
    ClickedRemoveCartItem,
    ClickedClearCart,
    CartUpdated,
    CartActionFailed,
    OrdersLoaded,
    UpdatedCheckoutDraft,
    SubmittedPendingOrder,
    PendingOrderCreated,
    CompletedOrderNavigation,
    OrderActionFailed,
    ProductActionFailed,
])
export type Message = typeof Message.Type
