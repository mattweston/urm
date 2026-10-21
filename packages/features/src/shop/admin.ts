import { Option } from "effect"
import type { HtmlBuilder } from "foldkit/html"
import { Submodel, Subscription } from "foldkit"
import {
    shopHref,
    productsHref,
    productHref,
    productCreateHref,
    productEditHref,
    collectionsHref,
    collectionHref,
    cartHref,
    checkoutHref,
    ordersHref,
    orderHref,
} from "./admin.route.ts"
import { view as adminView } from "./admin.view.ts"
import { Message } from "./admin.message.ts"
import { Model } from "./admin.model.ts"

export {
    CartActionFailed,
    CartLoaded,
    CartUpdated,
    CatalogLoaded,
    CollectionCreated,
    CollectionUpdated,
    CompletedCollectionNavigation,
    ChangedCartItemQuantity,
    ClickedAddCartItem,
    ClickedClearCart,
    ClickedRemoveCartItem,
    CompletedOrderNavigation,
    Message,
    ProductActionFailed,
    ProductCreated,
    ProductImageUploaded,
    OpenedProductMediaLibrary,
    ClosedProductMediaLibrary,
    ProductMediaLoaded,
    ProductMediaFailed,
    SelectedProductMediaImage,
    ProductUpdated,
    OrderActionFailed,
    OrdersLoaded,
    PendingOrderCreated,
    SubmittedPendingOrder,
    SubmittedProductForm,
    UpdatedCheckoutDraft,
} from "./admin.message.ts"
export type { Message as MessageType } from "./admin.message.ts"
export { ChangedRoute } from "./admin.message.ts"
export { Model } from "./admin.model.ts"
export type { Model as ModelType } from "./admin.model.ts"
export { isAppScope, routeForUrl } from "./admin.route.ts"
export { init, update } from "./admin.update.ts"
export { shopAdminCartSessionId } from "./admin.data.ts"

const adminViewForSubmodel = (model: Model, h: HtmlBuilder<Message>) =>
    adminView<Message>(
        model,
        {
            shop: shopHref,
            products: productsHref,
            product: productHref,
            createProduct: productCreateHref,
            editProduct: productEditHref,
            collections: collectionsHref,
            collection: collectionHref,
            cart: cartHref,
            checkout: checkoutHref,
            orders: ordersHref,
            order: orderHref,
        },
        (message) => message,
        h
    )

export const view = Submodel.defineView<Model, Message>(adminViewForSubmodel)

export const subscriptions = <ParentModel, ParentMessage>(_config: {
    readonly read: (parentModel: ParentModel) => Option.Option<unknown>
    readonly toParentMessage: (message: Message) => ParentMessage
}) => Subscription.make<ParentModel, ParentMessage>()(() => ({}))
