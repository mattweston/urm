import { Array, Effect, Match as M, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"
import type {
    CreateCollectionInput,
    ProductCollection,
    ProductInput,
} from "@urm/domain/schemas/shop"
import { Email } from "@urm/domain/schemas/contacts"
import {
    addItemToCart,
    changeCartItemQuantity,
    clearCurrentCart,
    createPendingOrderFromCart,
    createCollectionFromDraft,
    createProductFromDraft,
    loadCollectionList,
    loadCurrentCart,
    loadOrderList,
    loadProductList,
    replaceCollectionUrl,
    replaceOrderUrl,
    removeItemFromCart,
    updateCollectionFromDraft,
    uploadProductImage,
    updateProductFromDraft,
} from "./admin.command.ts"
import {
    blankCollectionDraft,
    blankProductDraft,
    collectionDraftFromCollection,
    checkoutAddressFromDraft,
    type CollectionDraft,
    productDraftFromProduct,
    type ProductDraft,
    type CheckoutDraft,
} from "./admin.data.ts"
import { GotProductImageDropMessage, type Message } from "./admin.message.ts"
import type { Model } from "./admin.model.ts"
import { Editing, initialModel, Viewing } from "./admin.model.ts"
import { ShopCollectionRoute } from "./admin.route.ts"
import type { Route } from "./admin.route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const valid_image_url = (value: string): boolean => {
    if (/^\/api\/uploads\/[^/]+\/(?:shop|media)\/[0-9a-f-]{36}$/.test(value)) {
        return true
    }

    try {
        const url = new URL(value)
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

const resetProductDraft = (
    route: Route,
    products: ReadonlyArray<Model["products"][number]>
): ProductDraft =>
    M.value(route).pipe(
        M.withReturnType<ProductDraft>(),
        M.tagsExhaustive({
            ShopHome: blankProductDraft,
            ShopProducts: blankProductDraft,
            ShopProduct: blankProductDraft,
            ShopProductCreate: blankProductDraft,
            ShopProductEdit: ({ productId }) =>
                Option.match(
                    Array.findFirst(
                        products,
                        (product) => product.id === productId
                    ),
                    {
                        onNone: blankProductDraft,
                        onSome: productDraftFromProduct,
                    }
                ),
            ShopProductsNotFound: blankProductDraft,
            ShopCollections: blankProductDraft,
            ShopCollection: blankProductDraft,
            ShopCart: blankProductDraft,
            ShopCheckout: blankProductDraft,
            ShopOrders: blankProductDraft,
            ShopOrder: blankProductDraft,
        })
    )

const resetCollectionDraft = (
    route: Route,
    collections: ReadonlyArray<ProductCollection>
) =>
    route._tag === "ShopCollection"
        ? Option.match(
              Array.findFirst(
                  collections,
                  (collection) => collection.slug === route.slug
              ),
              {
                  onNone: blankCollectionDraft,
                  onSome: collectionDraftFromCollection,
              }
          )
        : blankCollectionDraft()

const collectionInputFromDraft = (
    collectionDraft: Model["collectionDraft"]
): CreateCollectionInput | string => {
    const name = collectionDraft.name.trim()
    const slug = collectionDraft.slug.trim()
    const description = collectionDraft.description.trim()
    const imageUrl = collectionDraft.imageUrl.trim()

    if (name.length === 0 || name.length > 255) {
        return "Collection name must be between 1 and 255 characters."
    }

    if (
        slug.length === 0 ||
        slug.length > 500 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
        return "Slug must use lowercase letters, numbers, and single hyphens."
    }

    if (description.length > 10_000 || imageUrl.length > 2_048) {
        return "Collection description or image URL is too long."
    }

    if (imageUrl.length > 0 && !valid_image_url(imageUrl)) {
        return "Enter a web image URL or choose an uploaded image."
    }

    return {
        name,
        slug,
        ...(description.length === 0 ? {} : { description }),
        ...(imageUrl.length === 0 ? {} : { imageUrl }),
        isActive: collectionDraft.isActive,
    }
}

const updateCollectionDraftField = (
    collectionDraft: CollectionDraft,
    field: "name" | "slug" | "description" | "imageUrl",
    value: string
): CollectionDraft => {
    if (field === "name") {
        return modifyFields(collectionDraft, { name: () => value })
    }

    if (field === "slug") {
        return modifyFields(collectionDraft, { slug: () => value })
    }

    if (field === "description") {
        return modifyFields(collectionDraft, { description: () => value })
    }

    return modifyFields(collectionDraft, { imageUrl: () => value })
}

const updateDraftField = (
    productDraft: ProductDraft,
    field: "name" | "slug" | "description" | "price" | "inventory" | "imageUrl",
    value: string
): ProductDraft => {
    if (field === "name") {
        return modifyFields(productDraft, { name: () => value })
    }

    if (field === "slug") {
        return modifyFields(productDraft, { slug: () => value })
    }

    if (field === "description") {
        return modifyFields(productDraft, { description: () => value })
    }

    if (field === "price") {
        return modifyFields(productDraft, { price: () => value })
    }

    if (field === "inventory") {
        return modifyFields(productDraft, { inventory: () => value })
    }

    return modifyFields(productDraft, {
        imageUrl: () => value,
        imageId: () => null,
    })
}

const updateCheckoutDraftField = (
    checkoutDraft: CheckoutDraft,
    field:
        | "email"
        | "firstName"
        | "lastName"
        | "line1"
        | "city"
        | "province"
        | "country"
        | "postal",
    value: string
): CheckoutDraft => {
    if (field === "email") return modifyFields(checkoutDraft, { email: () => value })
    if (field === "firstName") {
        return modifyFields(checkoutDraft, { firstName: () => value })
    }
    if (field === "lastName") {
        return modifyFields(checkoutDraft, { lastName: () => value })
    }
    if (field === "line1") return modifyFields(checkoutDraft, { line1: () => value })
    if (field === "city") return modifyFields(checkoutDraft, { city: () => value })
    if (field === "province") {
        return modifyFields(checkoutDraft, { province: () => value })
    }
    if (field === "country") {
        return modifyFields(checkoutDraft, { country: () => value })
    }

    return modifyFields(checkoutDraft, { postal: () => value })
}

const checkoutDraftError = (draft: CheckoutDraft): string | null => {
    const values = [
        draft.firstName,
        draft.lastName,
        draft.line1,
        draft.city,
        draft.province,
        draft.country,
        draft.postal,
    ].map((value) => value.trim())

    if (values.some((value) => value.length === 0 || value.length > 255)) {
        return "Complete every delivery field using 255 characters or fewer."
    }

    const email = draft.email.trim().toLowerCase()

    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Enter a valid email address."
    }

    return null
}

const productInputFromDraft = (
    productDraft: ProductDraft
): ProductInput | string => {
    const price = Number(productDraft.price)
    const inventory = Number(productDraft.inventory)

    if (
        productDraft.name.trim().length === 0 ||
        productDraft.slug.trim().length === 0
    ) {
        return "Name and slug are required."
    }

    if (productDraft.imageUrl.trim().length === 0) {
        return "Upload or choose a product image, or enter an image URL."
    }

    if (
        productDraft.imageUrl.trim().length > 2_048 ||
        !valid_image_url(productDraft.imageUrl.trim())
    ) {
        return "Enter a web image URL or choose an uploaded image."
    }

    if (!Number.isSafeInteger(Math.round(price * 100)) || price < 0) {
        return "Price must be a non-negative amount with up to two decimal places."
    }

    if (!Number.isSafeInteger(inventory) || inventory < 0) {
        return "Inventory must be a non-negative whole number."
    }

    return {
        name: productDraft.name.trim(),
        slug: productDraft.slug.trim(),
        description: productDraft.description.trim(),
        price: Math.round(price * 100),
        inventory,
        imageUrl: productDraft.imageUrl.trim(),
        collectionIds: productDraft.collectionIds,
        ...(productDraft.imageId === null
            ? {}
            : { imageId: productDraft.imageId }),
        isActive: productDraft.isActive,
        isFeatured: productDraft.isFeatured,
    }
}

const updateProductList = (
    products: ReadonlyArray<Model["products"][number]>,
    updatedProduct: Model["products"][number]
) =>
    Array.map(products, (product) =>
        product.id === updatedProduct.id ? updatedProduct : product
    )

export const init = (route: Route): UpdateReturn => [
    initialModel(route),
    [
        loadProductList(),
        loadCollectionList(),
        loadCurrentCart(),
        loadOrderList(),
    ],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedRoute: ({ route }) => [
                (() => {
                    const collectionDraft = resetCollectionDraft(
                        route,
                        model.collections
                    )

                    return modifyFields(model, {
                        route: () => route,
                        productDraft: () =>
                            resetProductDraft(route, model.products),
                        collectionDraft: () => collectionDraft,
                        savedCollectionSnapshot: () => collectionDraft,
                        selectedProductImageFiles: () => [],
                        isProductImageUploading: () => false,
                        isProductMediaLibraryOpen: () => false,
                        isProductMediaLibraryLoading: () => false,
                        productMediaError: () => Option.none(),
                        productMediaRequest: () =>
                            model.productMediaRequest + 1,
                        editorState: () => Viewing(),
                        error: () => Option.none(),
                        success: () => Option.none(),
                    })
                })(),
                [],
            ],
            ProductsLoaded: ({ products }) => [
                modifyFields(model, {
                    products: () => products,
                    productDraft: () =>
                        resetProductDraft(model.route, products),
                    isLoading: () => false,
                    error: () => Option.none(),
                }),
                [],
            ],
            CollectionsLoaded: ({ collections }) => [
                (() => {
                    const collectionDraft = resetCollectionDraft(
                        model.route,
                        collections
                    )

                    return modifyFields(model, {
                        collections: () => collections,
                        collectionDraft: () => collectionDraft,
                        savedCollectionSnapshot: () => collectionDraft,
                        areCollectionsLoading: () => false,
                        error: () => Option.none(),
                    })
                })(),
                [],
            ],
            CatalogLoaded: ({ products, collections }) => [
                (() => {
                    const collectionDraft = resetCollectionDraft(
                        model.route,
                        collections
                    )

                    return modifyFields(model, {
                        products: () => products,
                        collections: () => collections,
                        productDraft: () =>
                            resetProductDraft(model.route, products),
                        collectionDraft: () => collectionDraft,
                        savedCollectionSnapshot: () => collectionDraft,
                        isLoading: () => false,
                        areCollectionsLoading: () => false,
                        error: () => Option.none(),
                    })
                })(),
                [],
            ],
            CartLoaded: ({ snapshot }) => [
                modifyFields(model, {
                    cartSnapshot: () => snapshot,
                    isCartLoading: () => false,
                    isCartSubmitting: () => false,
                }),
                [],
            ],
            ClickedAddCartItem: ({ variantId, quantity }) => {
                const normalized_quantity = Math.floor(quantity)

                if (
                    model.isCartSubmitting ||
                    normalized_quantity < 1 ||
                    normalized_quantity > 20
                ) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        isCartSubmitting: () => true,
                        error: () => Option.none(),
                        success: () => Option.none(),
                    }),
                    [addItemToCart(variantId, normalized_quantity)],
                ]
            },
            ChangedCartItemQuantity: ({ itemId, quantity }) => {
                if (model.isCartSubmitting) return [model, []]

                const normalized_quantity = Math.floor(quantity)

                return [
                    modifyFields(model, {
                        isCartSubmitting: () => true,
                        error: () => Option.none(),
                    }),
                    normalized_quantity <= 0
                        ? [removeItemFromCart(itemId)]
                        : [
                              changeCartItemQuantity(
                                  itemId,
                                  Math.min(20, normalized_quantity)
                              ),
                          ],
                ]
            },
            ClickedRemoveCartItem: ({ itemId }) =>
                model.isCartSubmitting
                    ? [model, []]
                    : [
                          modifyFields(model, {
                              isCartSubmitting: () => true,
                              error: () => Option.none(),
                          }),
                          [removeItemFromCart(itemId)],
                      ],
            ClickedClearCart: () =>
                model.isCartSubmitting || model.cartSnapshot.items.length === 0
                    ? [model, []]
                    : [
                          modifyFields(model, {
                              isCartSubmitting: () => true,
                              error: () => Option.none(),
                          }),
                          [
                              clearCurrentCart(
                                  model.cartSnapshot.items.map(
                                      (item) => item.id
                                  )
                              ),
                          ],
                      ],
            CartUpdated: ({ snapshot }) => [
                modifyFields(model, {
                    cartSnapshot: () => snapshot,
                    isCartLoading: () => false,
                    isCartSubmitting: () => false,
                    error: () => Option.none(),
                }),
                [],
            ],
            CartActionFailed: ({ error }) => [
                modifyFields(model, {
                    isCartLoading: () => false,
                    isCartSubmitting: () => false,
                    error: () => Option.some(error),
                }),
                [],
            ],
            OrdersLoaded: ({ orders }) => [
                modifyFields(model, {
                    orders: () => orders,
                    areOrdersLoading: () => false,
                }),
                [],
            ],
            UpdatedCheckoutDraft: ({ field, value }) => [
                modifyFields(model, {
                    checkoutDraft: () =>
                        updateCheckoutDraftField(
                            model.checkoutDraft,
                            field,
                            value
                        ),
                    error: () => Option.none(),
                    success: () => Option.none(),
                }),
                [],
            ],
            SubmittedPendingOrder: () => {
                const cart = model.cartSnapshot.cart
                const validation_error = checkoutDraftError(model.checkoutDraft)

                if (
                    model.isOrderSubmitting ||
                    cart === null ||
                    model.cartSnapshot.items.length === 0
                ) {
                    return [
                        modifyFields(model, {
                            error: () =>
                                Option.some(
                                    "Add at least one item before recording an order."
                                ),
                        }),
                        [],
                    ]
                }

                if (validation_error !== null) {
                    return [
                        modifyFields(model, {
                            error: () => Option.some(validation_error),
                        }),
                        [],
                    ]
                }

                const email = S.decodeUnknownOption(Email)(
                    model.checkoutDraft.email.trim().toLowerCase()
                )

                if (Option.isNone(email)) {
                    return [
                        modifyFields(model, {
                            error: () =>
                                Option.some("Enter a valid email address."),
                        }),
                        [],
                    ]
                }

                return [
                    modifyFields(model, {
                        isOrderSubmitting: () => true,
                        error: () => Option.none(),
                        success: () => Option.none(),
                    }),
                    [
                        createPendingOrderFromCart(
                            cart.sessionId,
                            `${cart.id}:${cart.updatedAt}`,
                            email.value,
                            checkoutAddressFromDraft(model.checkoutDraft)
                        ),
                    ],
                ]
            },
            PendingOrderCreated: ({ snapshot }) => [
                modifyFields(model, {
                    orders: (orders) => [
                        snapshot,
                        ...orders.filter(
                            (candidate) =>
                                candidate.order.id !== snapshot.order.id
                        ),
                    ],
                    cartSnapshot: () => ({ cart: null, items: [] }),
                    isOrderSubmitting: () => false,
                    success: () =>
                        Option.some("Pending order recorded without payment."),
                    error: () => Option.none(),
                }),
                [replaceOrderUrl(snapshot.order.id)],
            ],
            CompletedOrderNavigation: () => [model, []],
            OrderActionFailed: ({ error }) => [
                modifyFields(model, {
                    areOrdersLoading: () => false,
                    isOrderSubmitting: () => false,
                    error: () => Option.some(error),
                }),
                [],
            ],
            UpdatedProductDraft: ({ field, value }) => [
                modifyFields(model, {
                    productDraft: () =>
                        updateDraftField(model.productDraft, field, value),
                    error: () => Option.none(),
                    success: () => Option.none(),
                }),
                [],
            ],
            UpdatedProductActive: ({ value }) => [
                modifyFields(model, {
                    productDraft: () =>
                        modifyFields(model.productDraft, { isActive: () => value }),
                }),
                [],
            ],
            UpdatedProductFeatured: ({ value }) => [
                modifyFields(model, {
                    productDraft: () =>
                        modifyFields(model.productDraft, { isFeatured: () => value }),
                }),
                [],
            ],
            UpdatedProductCollection: ({ collectionId, selected }) => [
                modifyFields(model, {
                    productDraft: () =>
                        modifyFields(model.productDraft, {
                            collectionIds: (collectionIds) =>
                                selected
                                    ? collectionIds.includes(collectionId)
                                        ? collectionIds
                                        : [...collectionIds, collectionId]
                                    : collectionIds.filter(
                                          (candidate) =>
                                              candidate !== collectionId
                                      ),
                        }),
                    error: () => Option.none(),
                    success: () => Option.none(),
                }),
                [],
            ],
            GotProductImageDropMessage: ({ message: dropMessage }) => {
                const {
                    model: nextDrop,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.FileDrop.update(model.productImageDrop, dropMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const selectedProductImageFiles = Option.match(
                    maybeOutMessage,
                    {
                        onNone: () => model.selectedProductImageFiles,
                        onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
                            M.tagsExhaustive({
                                ReceivedFiles: ({ files }) => files.slice(-1),
                                RejectedNonFiles: () =>
                                    model.selectedProductImageFiles,
                            })
                        ),
                    }
                )

                return [
                    modifyFields(model, {
                        productImageDrop: () => nextDrop,
                        selectedProductImageFiles: () =>
                            selectedProductImageFiles,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotProductImageDropMessage({ message })
                            )
                        )
                    ),
                ]
            },
            RemovedSelectedProductImage: ({ fileIndex }) => [
                modifyFields(model, {
                    selectedProductImageFiles: () =>
                        model.selectedProductImageFiles.filter(
                            (_, index) => index !== fileIndex
                        ),
                }),
                [],
            ],
            ClickedUploadProductImage: () => {
                const file = model.selectedProductImageFiles[0]

                if (model.isProductImageUploading || file === undefined) {
                    return [model, []]
                }

                return [
                    modifyFields(model, {
                        isProductImageUploading: () => true,
                        error: () => Option.none(),
                        success: () => Option.none(),
                    }),
                    [uploadProductImage(file, model.productDraft.name)],
                ]
            },
            ProductImageUploaded: ({ image }) => [
                modifyFields(model, {
                    productDraft: () =>
                        modifyFields(model.productDraft, {
                            imageId: () => image.id,
                            imageUrl: () => image.url,
                        }),
                    selectedProductImageFiles: () => [],
                    isProductImageUploading: () => false,
                    success: () => Option.some("Product image uploaded."),
                }),
                [],
            ],
            OpenedProductMediaLibrary: () => [
                modifyFields(model, {
                    isProductMediaLibraryOpen: () => true,
                    isProductMediaLibraryLoading: () => true,
                    productMediaError: () => Option.none(),
                    productMediaRequest: () => model.productMediaRequest + 1,
                }),
                [],
            ],
            ClosedProductMediaLibrary: () => [
                modifyFields(model, {
                    isProductMediaLibraryOpen: () => false,
                    isProductMediaLibraryLoading: () => false,
                    productMediaError: () => Option.none(),
                    productMediaRequest: () => model.productMediaRequest + 1,
                }),
                [],
            ],
            ProductMediaLoaded: ({ images }) => [
                modifyFields(model, {
                    productMediaImages: () => images,
                    isProductMediaLibraryLoading: () => false,
                    productMediaError: () => Option.none(),
                }),
                [],
            ],
            ProductMediaFailed: ({ error }) => [
                modifyFields(model, {
                    isProductMediaLibraryLoading: () => false,
                    productMediaError: () => Option.some(error),
                }),
                [],
            ],
            SelectedProductMediaImage: ({ imageId }) => {
                const image = model.productMediaImages.find(
                    (item) => item.id === imageId
                )
                if (image === undefined) return [model, []]
                return [
                    modifyFields(model, {
                        productDraft: () =>
                            modifyFields(model.productDraft, {
                                imageId: () => image.id,
                                imageUrl: () => image.url,
                            }),
                        isProductMediaLibraryOpen: () => false,
                        productMediaError: () => Option.none(),
                        success: () => Option.some("Product image selected."),
                    }),
                    [],
                ]
            },
            SubmittedProductForm: () => {
                const productInput = productInputFromDraft(model.productDraft)

                if (typeof productInput === "string") {
                    return [
                        modifyFields(model, {
                            error: () => Option.some(productInput),
                            success: () => Option.none(),
                        }),
                        [],
                    ]
                }

                return M.value(model.route).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        ShopHome: () => [model, []],
                        ShopProducts: () => [model, []],
                        ShopProduct: () => [model, []],
                        ShopProductCreate: () => [
                            modifyFields(model, {
                                isSubmitting: () => true,
                                error: () => Option.none(),
                                success: () => Option.none(),
                            }),
                            [createProductFromDraft(productInput)],
                        ],
                        ShopProductEdit: ({ productId }) => [
                            modifyFields(model, {
                                isSubmitting: () => true,
                                error: () => Option.none(),
                                success: () => Option.none(),
                            }),
                            [updateProductFromDraft(productId, productInput)],
                        ],
                        ShopProductsNotFound: () => [model, []],
                        ShopCollections: () => [model, []],
                        ShopCollection: () => [model, []],
                        ShopCart: () => [model, []],
                        ShopCheckout: () => [model, []],
                        ShopOrders: () => [model, []],
                        ShopOrder: () => [model, []],
                    })
                )
            },
            ClickedEditLayout: () => [
                modifyFields(model, {
                    editorState: () => Editing(),
                    collectionDraft: () => model.savedCollectionSnapshot,
                    error: () => Option.none(),
                    success: () => Option.none(),
                }),
                [],
            ],
            ClickedCancelLayoutEditing: () => [
                modifyFields(model, {
                    editorState: () => Viewing(),
                    collectionDraft: () => model.savedCollectionSnapshot,
                    error: () => Option.none(),
                    success: () => Option.none(),
                }),
                [],
            ],
            UpdatedCollectionDraft: ({ field, value }) => [
                modifyFields(model, {
                    collectionDraft: () =>
                        updateCollectionDraftField(
                            model.collectionDraft,
                            field,
                            value
                        ),
                    error: () => Option.none(),
                    success: () => Option.none(),
                }),
                [],
            ],
            UpdatedCollectionActive: ({ value }) => [
                modifyFields(model, {
                    collectionDraft: () =>
                        modifyFields(model.collectionDraft, { isActive: () => value }),
                }),
                [],
            ],
            SubmittedCollectionForm: () => {
                const input = collectionInputFromDraft(model.collectionDraft)

                if (typeof input === "string") {
                    return [
                        modifyFields(model, {
                            error: () => Option.some(input),
                            success: () => Option.none(),
                        }),
                        [],
                    ]
                }

                if (model.route._tag === "ShopCollections") {
                    return [
                        modifyFields(model, {
                            isCollectionSubmitting: () => true,
                            error: () => Option.none(),
                            success: () => Option.none(),
                        }),
                        [createCollectionFromDraft(input)],
                    ]
                }

                if (model.route._tag === "ShopCollection") {
                    const route = model.route
                    const collection = model.collections.find(
                        (candidate) => candidate.slug === route.slug
                    )

                    return collection === undefined
                        ? [
                              modifyFields(model, {
                                  error: () =>
                                      Option.some("Collection not found."),
                              }),
                              [],
                          ]
                        : [
                              modifyFields(model, {
                                  isCollectionSubmitting: () => true,
                                  error: () => Option.none(),
                                  success: () => Option.none(),
                              }),
                              [updateCollectionFromDraft(collection.id, input)],
                          ]
                }

                return [model, []]
            },
            CollectionCreated: ({ collection }) => [
                (() => {
                    const collectionDraft = blankCollectionDraft()

                    return modifyFields(model, {
                        collections: (collections) => [
                            collection,
                            ...collections,
                        ],
                        collectionDraft: () => collectionDraft,
                        savedCollectionSnapshot: () => collectionDraft,
                        isCollectionSubmitting: () => false,
                        editorState: () => Viewing(),
                        success: () => Option.some("Collection created."),
                    })
                })(),
                [],
            ],
            CollectionUpdated: ({ collection }) => [
                (() => {
                    const collectionDraft =
                        collectionDraftFromCollection(collection)

                    return modifyFields(model, {
                        route: () =>
                            model.route._tag === "ShopCollection"
                                ? ShopCollectionRoute({
                                      slug: collection.slug,
                                  })
                                : model.route,
                        collections: (collections) =>
                            collections.map((candidate) =>
                                candidate.id === collection.id
                                    ? collection
                                    : candidate
                            ),
                        collectionDraft: () => collectionDraft,
                        savedCollectionSnapshot: () => collectionDraft,
                        isCollectionSubmitting: () => false,
                        editorState: () => Viewing(),
                        success: () => Option.some("Collection updated."),
                    })
                })(),
                model.route._tag === "ShopCollection"
                    ? [replaceCollectionUrl(collection.slug)]
                    : [],
            ],
            CompletedCollectionNavigation: () => [model, []],
            ProductCreated: ({ product }) => [
                modifyFields(model, {
                    products: () => [product, ...model.products],
                    productDraft: blankProductDraft,
                    selectedProductImageFiles: () => [],
                    isSubmitting: () => false,
                    success: () => Option.some("Product created."),
                }),
                [],
            ],
            ProductUpdated: ({ product }) => [
                modifyFields(model, {
                    products: () => updateProductList(model.products, product),
                    productDraft: () => productDraftFromProduct(product),
                    isSubmitting: () => false,
                    success: () => Option.some("Product saved."),
                }),
                [],
            ],
            ProductActionFailed: ({ action, error }) => [
                modifyFields(model, {
                    isLoading: () =>
                        action === "load-products" ? false : model.isLoading,
                    areCollectionsLoading: () =>
                        action === "load-collections"
                            ? false
                            : model.areCollectionsLoading,
                    isSubmitting: () => false,
                    isCollectionSubmitting: () => false,
                    isProductImageUploading: () => false,
                    error: () => Option.some(error),
                }),
                [],
            ],
        })
    )
