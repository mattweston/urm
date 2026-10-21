import { Array, Match as M, Option } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import { formatProductPrice } from "@urm/utils/currency"
import { toImageSrc } from "@urm/utils/media"
import {
    ChangedCartItemQuantity,
    ClickedAddCartItem,
    ClickedCancelLayoutEditing,
    ClickedClearCart,
    ClickedEditLayout,
    ClickedRemoveCartItem,
    ClickedUploadProductImage,
    OpenedProductMediaLibrary,
    ClosedProductMediaLibrary,
    SelectedProductMediaImage,
    GotProductImageDropMessage,
    RemovedSelectedProductImage,
    SubmittedProductForm,
    SubmittedCollectionForm,
    SubmittedPendingOrder,
    UpdatedCheckoutDraft,
    UpdatedCollectionActive,
    UpdatedCollectionDraft,
    UpdatedProductActive,
    UpdatedProductDraft,
    UpdatedProductFeatured,
    UpdatedProductCollection,
    type Message,
} from "./admin.message.ts"
import type { Model } from "./admin.model.ts"

export type Hrefs = Readonly<{
    shop: () => string
    products: () => string
    product: (slug: string) => string
    createProduct: () => string
    editProduct: (productId: string) => string
    collections: () => string
    collection: (slug: string) => string
    cart: () => string
    checkout: () => string
    orders: () => string
    order: (orderId: string) => string
}>

const inputClass =
    "mt-1 min-h-12 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
const fieldClass = "grid gap-1.5"
const productImageDropClass =
    "flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-muted px-5 py-8 text-center transition hover:border-primary data-[drag-over]:border-primary data-[drag-over]:bg-accent"

const shopHomeView = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-1 border-b border-border pb-6")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-semibold tracking-tight text-foreground"
                            ),
                        ],
                        ["Shop"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "View and edit the storefront layout from its mirrored routes.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(hrefs.products()),
                    h.Class(
                        "block rounded-[var(--radius-surface)] border border-border bg-card p-5 transition hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold text-foreground")],
                        ["Products"]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            model.isLoading
                                ? "Loading catalogue..."
                                : `${model.products.length} products`,
                        ]
                    ),
                ]
            ),
        ]
    )

const layoutPageHeader = <ParentMessage>(
    title: string,
    description: string,
    isEditing: boolean,
    editMessage: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-semibold tracking-tight text-foreground"
                            ),
                        ],
                        [title]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [description]
                    ),
                ]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.Class(
                        "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-background px-4 text-sm font-medium text-foreground"
                    ),
                    h.AriaPressed(isEditing ? "true" : "false"),
                    h.OnClick(editMessage),
                ],
                [isEditing ? "Cancel" : "Edit"]
            ),
        ]
    )

const productLayoutView = <ParentMessage>(
    model: Model,
    slug: string,
    hrefs: Hrefs,
    editMessage: ParentMessage,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(
        Array.findFirst(model.products, (product) => product.slug === slug),
        {
            onNone: () =>
                h.div(
                    [h.Class("py-12 text-center")],
                    [
                        h.h1(
                            [h.Class("text-2xl font-semibold text-foreground")],
                            ["Product not found"]
                        ),
                        h.a(
                            [
                                h.Href(hrefs.products()),
                                h.Class(
                                    "mt-5 inline-flex text-sm font-medium text-primary underline"
                                ),
                            ],
                            ["Return to products"]
                        ),
                    ]
                ),
            onSome: (product) => {
                const availableVariant = (product.variants ?? []).find(
                    (variant) => variant.stock > 0
                )

                return h.div(
                    [h.Class("space-y-8")],
                    [
                        layoutPageHeader(
                            product.name,
                            "Product detail layout",
                            model.editorState._tag === "Editing",
                            editMessage,
                            h
                        ),
                        h.article(
                            [h.Class("grid gap-8 lg:grid-cols-2")],
                            [
                                h.div(
                                    [
                                        h.Class(
                                            "overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card"
                                        ),
                                    ],
                                    [
                                        h.img([
                                            h.Src(toImageSrc(product.imageUrl)),
                                            h.Alt(product.name),
                                            h.Class(
                                                "aspect-square h-full w-full object-cover"
                                            ),
                                        ]),
                                    ]
                                ),
                                h.div(
                                    [h.Class("flex flex-col justify-center")],
                                    [
                                        product.tagline
                                            ? h.p(
                                                  [
                                                      h.Class(
                                                          "text-lg text-muted-foreground"
                                                      ),
                                                  ],
                                                  [product.tagline]
                                              )
                                            : h.empty,
                                        h.p(
                                            [
                                                h.Class(
                                                    "mt-4 text-2xl font-semibold text-foreground"
                                                ),
                                            ],
                                            [formatProductPrice(product.price)]
                                        ),
                                        product.description
                                            ? h.p(
                                                  [
                                                      h.Class(
                                                          "mt-5 whitespace-pre-line text-muted-foreground"
                                                      ),
                                                  ],
                                                  [product.description]
                                              )
                                            : h.empty,
                                        h.div(
                                            [
                                                h.Class(
                                                    "mt-6 flex flex-wrap gap-2"
                                                ),
                                            ],
                                            (product.variants ?? []).map(
                                                (variant) =>
                                                    h.button(
                                                        [
                                                            h.Type("button"),
                                                            h.Class(
                                                                "min-h-11 rounded-[var(--radius-control)] border border-border px-4 text-sm text-foreground"
                                                            ),
                                                            h.Disabled(true),
                                                        ],
                                                        [variant.name]
                                                    )
                                            )
                                        ),
                                        h.div(
                                            [
                                                h.Class(
                                                    "mt-8 flex flex-wrap gap-3"
                                                ),
                                            ],
                                            [
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.Disabled(
                                                            availableVariant ===
                                                                undefined ||
                                                                model.isCartSubmitting
                                                        ),
                                                        ...(availableVariant ===
                                                        undefined
                                                            ? []
                                                            : [
                                                                  h.OnClick(
                                                                      toParentMessage(
                                                                          ClickedAddCartItem(
                                                                              {
                                                                                  variantId:
                                                                                      availableVariant.id,
                                                                                  quantity: 1,
                                                                              }
                                                                          )
                                                                      )
                                                                  ),
                                                              ]),
                                                        h.Class(
                                                            "min-h-11 rounded-[var(--radius-control)] bg-primary px-5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                                        ),
                                                    ],
                                                    [
                                                        availableVariant ===
                                                        undefined
                                                            ? "Out of stock"
                                                            : model.isCartSubmitting
                                                              ? "Adding..."
                                                              : "Add to cart",
                                                    ]
                                                ),
                                                h.a(
                                                    [
                                                        h.Href(
                                                            hrefs.editProduct(
                                                                product.id
                                                            )
                                                        ),
                                                        h.Class(
                                                            "inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border px-5 font-medium text-foreground"
                                                        ),
                                                    ],
                                                    ["Edit product data"]
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                            ]
                        ),
                    ]
                )
            },
        }
    )

const collectionsLayoutView = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    editMessage: ParentMessage,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-8")],
        [
            layoutPageHeader(
                "Collections",
                "Collection listing layout",
                model.editorState._tag === "Editing",
                editMessage,
                h
            ),
            feedbackView(model, h),
            model.editorState._tag === "Editing"
                ? collectionEditorView(model, toParentMessage, h)
                : h.empty,
            model.areCollectionsLoading
                ? h.div(
                      [
                          h.Class(
                              "rounded-[var(--radius-surface)] border border-border bg-card p-10 text-center text-muted-foreground"
                          ),
                      ],
                      ["Loading collections..."]
                  )
                : Array.match(model.collections, {
                      onEmpty: () =>
                          h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border border-dashed border-border bg-card p-10 text-center"
                                  ),
                              ],
                              [
                                  h.h2(
                                      [h.Class("text-lg font-semibold")],
                                      ["No collections yet"]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-2 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["Choose Edit to create a collection."]
                                  ),
                              ]
                          ),
                      onNonEmpty: (collections) =>
                          h.section(
                              [
                                  h.Class(
                                      "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                                  ),
                              ],
                              collections.map((collection) =>
                                  h.a(
                                      [
                                          h.Href(
                                              hrefs.collection(collection.slug)
                                          ),
                                          h.Class(
                                              "overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card text-card-foreground"
                                          ),
                                      ],
                                      [
                                          collection.imageUrl
                                              ? h.img([
                                                    h.Src(
                                                        toImageSrc(
                                                            collection.imageUrl
                                                        )
                                                    ),
                                                    h.Alt(""),
                                                    h.Class(
                                                        "aspect-[4/3] w-full object-cover"
                                                    ),
                                                ])
                                              : h.div([
                                                    h.Class(
                                                        "aspect-[4/3] w-full bg-muted"
                                                    ),
                                                ]),
                                          h.div(
                                              [h.Class("p-5")],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "flex items-center justify-between gap-3"
                                                          ),
                                                      ],
                                                      [
                                                          h.h2(
                                                              [
                                                                  h.Class(
                                                                      "font-semibold"
                                                                  ),
                                                              ],
                                                              [collection.name]
                                                          ),
                                                          collection.isActive ===
                                                          false
                                                              ? h.span(
                                                                    [
                                                                        h.Class(
                                                                            "rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                                                                        ),
                                                                    ],
                                                                    ["Draft"]
                                                                )
                                                              : h.empty,
                                                      ]
                                                  ),
                                                  collection.description
                                                      ? h.p(
                                                            [
                                                                h.Class(
                                                                    "mt-2 line-clamp-2 text-sm text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                collection.description,
                                                            ]
                                                        )
                                                      : h.empty,
                                              ]
                                          ),
                                      ]
                                  )
                              )
                          ),
                  }),
        ]
    )

const collectionLayoutView = <ParentMessage>(
    model: Model,
    slug: string,
    hrefs: Hrefs,
    editMessage: ParentMessage,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const collection = model.collections.find(
        (candidate) => candidate.slug === slug
    )

    if (collection === undefined) {
        return h.div(
            [h.Class("py-12 text-center")],
            [
                h.h1(
                    [h.Class("text-2xl font-semibold")],
                    [
                        model.areCollectionsLoading
                            ? "Loading collection..."
                            : "Collection not found",
                    ]
                ),
                h.a(
                    [
                        h.Href(hrefs.collections()),
                        h.Class(
                            "mt-5 inline-flex text-sm font-medium text-primary underline"
                        ),
                    ],
                    ["All collections"]
                ),
            ]
        )
    }

    const collectionProducts = model.products.filter((product) =>
        product.collectionIds?.includes(collection.id)
    )
    const isEditing = model.editorState._tag === "Editing"
    const layoutImageUrl = isEditing
        ? model.collectionDraft.imageUrl
        : collection.imageUrl

    return h.div(
        [h.Class("space-y-8")],
        [
            layoutPageHeader(
                isEditing
                    ? model.collectionDraft.name.trim() || "Untitled collection"
                    : collection.name,
                "Collection detail layout",
                isEditing,
                editMessage,
                h
            ),
            feedbackView(model, h),
            isEditing
                ? collectionEditorView(model, toParentMessage, h)
                : h.empty,
            layoutImageUrl
                ? h.img([
                      h.Src(toImageSrc(layoutImageUrl)),
                      h.Alt(""),
                      h.Class(
                          "max-h-96 w-full rounded-[var(--radius-surface)] object-cover"
                      ),
                  ])
                : h.empty,
            !isEditing && collection.description
                ? h.p(
                      [h.Class("max-w-3xl text-muted-foreground")],
                      [collection.description]
                  )
                : h.empty,
            collectionProducts.length === 0
                ? h.div(
                      [
                          h.Class(
                              "rounded-[var(--radius-surface)] border border-dashed border-border bg-card p-10 text-center text-muted-foreground"
                          ),
                      ],
                      ["No products are assigned to this collection."]
                  )
                : h.section(
                      [h.Class("grid gap-5 sm:grid-cols-2 lg:grid-cols-3")],
                      collectionProducts.map((product) =>
                          h.a(
                              [
                                  h.Href(hrefs.product(product.slug)),
                                  h.Class(
                                      "overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card"
                                  ),
                              ],
                              [
                                  h.img([
                                      h.Src(toImageSrc(product.imageUrl)),
                                      h.Alt(product.name),
                                      h.Class(
                                          "aspect-square w-full object-cover"
                                      ),
                                  ]),
                                  h.div(
                                      [h.Class("p-4")],
                                      [
                                          h.h2(
                                              [h.Class("font-semibold")],
                                              [product.name]
                                          ),
                                          h.p(
                                              [
                                                  h.Class(
                                                      "mt-1 text-sm text-muted-foreground"
                                                  ),
                                              ],
                                              [
                                                  formatProductPrice(
                                                      product.price
                                                  ),
                                              ]
                                          ),
                                      ]
                                  ),
                              ]
                          )
                      )
                  ),
        ]
    )
}

const cartLayoutView = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    isEditing: boolean,
    editMessage: ParentMessage,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { cart, items } = model.cartSnapshot

    return h.div(
        [h.Class("space-y-8")],
        [
            layoutPageHeader(
                "Cart",
                "Cart layout and empty state",
                isEditing,
                editMessage,
                h
            ),
            feedbackView(model, h),
            model.isCartLoading
                ? h.section(
                      [
                          h.Class(
                              "rounded-[var(--radius-surface)] border border-border bg-card p-10 text-center text-muted-foreground"
                          ),
                      ],
                      ["Loading cart..."]
                  )
                : items.length === 0
                  ? h.section(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-border bg-card p-8 text-center text-card-foreground"
                            ),
                        ],
                        [
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Your cart is empty"]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm text-muted-foreground")],
                                [
                                    "Add a product to preview the persisted storefront cart.",
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(hrefs.products()),
                                    h.Class(
                                        "mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-5 font-medium text-primary-foreground"
                                    ),
                                ],
                                ["Start shopping"]
                            ),
                        ]
                    )
                  : h.section(
                        [
                            h.Class(
                                "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("min-w-0 space-y-3")],
                                items.map((item) =>
                                    h.keyed("article")(
                                        item.id,
                                        [
                                            h.Class(
                                                "grid grid-cols-[5rem_minmax(0,1fr)] gap-4 rounded-[var(--radius-surface)] border border-border bg-card p-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center"
                                            ),
                                        ],
                                        [
                                            h.a(
                                                [
                                                    h.Href(
                                                        hrefs.product(
                                                            model.products.find(
                                                                (product) =>
                                                                    product.id ===
                                                                    item.productId
                                                            )?.slug ?? ""
                                                        )
                                                    ),
                                                    h.Class(
                                                        "overflow-hidden rounded-[var(--radius-control)] border border-border bg-muted"
                                                    ),
                                                ],
                                                [
                                                    item.productImageUrl
                                                        ? h.img([
                                                              h.Src(
                                                                  toImageSrc(
                                                                      item.productImageUrl
                                                                  )
                                                              ),
                                                              h.Alt(""),
                                                              h.Class(
                                                                  "aspect-square size-full object-cover"
                                                              ),
                                                          ])
                                                        : h.div([
                                                              h.Class(
                                                                  "aspect-square size-full bg-muted"
                                                              ),
                                                          ]),
                                                ]
                                            ),
                                            h.div(
                                                [h.Class("min-w-0")],
                                                [
                                                    h.h2(
                                                        [
                                                            h.Class(
                                                                "truncate font-semibold text-foreground"
                                                            ),
                                                        ],
                                                        [item.productName]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "mt-1 text-sm text-muted-foreground"
                                                            ),
                                                        ],
                                                        [item.variantName]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "mt-2 text-sm font-medium text-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            formatProductPrice(
                                                                item.productPrice
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end"
                                                    ),
                                                ],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "inline-flex items-center rounded-[var(--radius-control)] border border-border bg-background"
                                                            ),
                                                        ],
                                                        [
                                                            h.button(
                                                                [
                                                                    h.Type(
                                                                        "button"
                                                                    ),
                                                                    h.AriaLabel(
                                                                        `Decrease ${item.productName} quantity`
                                                                    ),
                                                                    h.Disabled(
                                                                        model.isCartSubmitting
                                                                    ),
                                                                    h.OnClick(
                                                                        toParentMessage(
                                                                            ChangedCartItemQuantity(
                                                                                {
                                                                                    itemId: item.id,
                                                                                    quantity:
                                                                                        item.quantity -
                                                                                        1,
                                                                                }
                                                                            )
                                                                        )
                                                                    ),
                                                                    h.Class(
                                                                        "flex size-10 items-center justify-center text-lg disabled:opacity-50"
                                                                    ),
                                                                ],
                                                                ["−"]
                                                            ),
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "min-w-9 text-center text-sm font-medium"
                                                                    ),
                                                                ],
                                                                [
                                                                    String(
                                                                        item.quantity
                                                                    ),
                                                                ]
                                                            ),
                                                            h.button(
                                                                [
                                                                    h.Type(
                                                                        "button"
                                                                    ),
                                                                    h.AriaLabel(
                                                                        `Increase ${item.productName} quantity`
                                                                    ),
                                                                    h.Disabled(
                                                                        model.isCartSubmitting ||
                                                                            item.quantity >=
                                                                                20
                                                                    ),
                                                                    h.OnClick(
                                                                        toParentMessage(
                                                                            ChangedCartItemQuantity(
                                                                                {
                                                                                    itemId: item.id,
                                                                                    quantity:
                                                                                        item.quantity +
                                                                                        1,
                                                                                }
                                                                            )
                                                                        )
                                                                    ),
                                                                    h.Class(
                                                                        "flex size-10 items-center justify-center text-lg disabled:opacity-50"
                                                                    ),
                                                                ],
                                                                ["+"]
                                                            ),
                                                        ]
                                                    ),
                                                    h.button(
                                                        [
                                                            h.Type("button"),
                                                            h.Disabled(
                                                                model.isCartSubmitting
                                                            ),
                                                            h.OnClick(
                                                                toParentMessage(
                                                                    ClickedRemoveCartItem(
                                                                        {
                                                                            itemId: item.id,
                                                                        }
                                                                    )
                                                                )
                                                            ),
                                                            h.Class(
                                                                "min-h-10 px-2 text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50"
                                                            ),
                                                        ],
                                                        ["Remove"]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    )
                                )
                            ),
                            h.aside(
                                [
                                    h.Class(
                                        "h-fit rounded-[var(--radius-surface)] border border-border bg-card p-5 lg:sticky lg:top-6"
                                    ),
                                ],
                                [
                                    h.h2(
                                        [h.Class("text-lg font-semibold")],
                                        ["Summary"]
                                    ),
                                    h.dl(
                                        [h.Class("mt-5 space-y-3")],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex justify-between gap-4 text-sm"
                                                    ),
                                                ],
                                                [
                                                    h.dt(
                                                        [
                                                            h.Class(
                                                                "text-muted-foreground"
                                                            ),
                                                        ],
                                                        ["Items"]
                                                    ),
                                                    h.dd(
                                                        [
                                                            h.Class(
                                                                "font-medium"
                                                            ),
                                                        ],
                                                        [
                                                            String(
                                                                cart?.itemCount ??
                                                                    0
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex justify-between gap-4 border-t border-border pt-3"
                                                    ),
                                                ],
                                                [
                                                    h.dt([], ["Subtotal"]),
                                                    h.dd(
                                                        [
                                                            h.Class(
                                                                "text-lg font-semibold"
                                                            ),
                                                        ],
                                                        [
                                                            formatProductPrice(
                                                                cart?.totalPrice ??
                                                                    0
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.a(
                                        [
                                            h.Href(hrefs.checkout()),
                                            h.Class(
                                                "mt-5 flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-primary px-5 font-medium text-primary-foreground"
                                            ),
                                        ],
                                        ["Checkout"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(model.isCartSubmitting),
                                            h.OnClick(
                                                toParentMessage(
                                                    ClickedClearCart()
                                                )
                                            ),
                                            h.Class(
                                                "mt-3 min-h-10 w-full text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50"
                                            ),
                                        ],
                                        ["Clear cart"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-4 text-center text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Discount and shipping are calculated at checkout.",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
        ]
    )
}

const checkoutLayoutView = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    isEditing: boolean,
    editMessage: ParentMessage,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const cart = model.cartSnapshot.cart
    const checkoutField = (
        field:
            | "email"
            | "firstName"
            | "lastName"
            | "line1"
            | "city"
            | "province"
            | "country"
            | "postal",
        label: string,
        type = "text"
    ) =>
        h.label(
            [h.Class("grid gap-1.5 text-sm font-medium")],
            [
                label,
                h.input([
                    h.Name(field),
                    h.Type(type),
                    h.Value(model.checkoutDraft[field]),
                    h.Required(true),
                    h.Disabled(model.isOrderSubmitting),
                    h.Class(inputClass),
                    h.OnInput((value) =>
                        toParentMessage(UpdatedCheckoutDraft({ field, value }))
                    ),
                ]),
            ]
        )

    return h.div(
        [h.Class("space-y-8")],
        [
            layoutPageHeader(
                "Checkout",
                "Record a pending order without collecting payment",
                isEditing,
                editMessage,
                h
            ),
            h.section(
                [h.Class("grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]")],
                [
                    h.form(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-border bg-card p-6"
                            ),
                            h.OnSubmit(
                                toParentMessage(SubmittedPendingOrder())
                            ),
                        ],
                        [
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Contact and delivery"]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm text-muted-foreground")],
                                [
                                    "This creates an unpaid order record. Payment confirmation will be connected later.",
                                ]
                            ),
                            h.div(
                                [h.Class("mt-6 grid gap-4 sm:grid-cols-2")],
                                [
                                    h.div(
                                        [h.Class("sm:col-span-2")],
                                        [
                                            checkoutField(
                                                "email",
                                                "Email",
                                                "email"
                                            ),
                                        ]
                                    ),
                                    checkoutField("firstName", "First name"),
                                    checkoutField("lastName", "Last name"),
                                    h.div(
                                        [h.Class("sm:col-span-2")],
                                        [checkoutField("line1", "Address")]
                                    ),
                                    checkoutField("city", "City"),
                                    checkoutField("province", "Region"),
                                    checkoutField("country", "Country"),
                                    checkoutField("postal", "Postal code"),
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Disabled(
                                        model.isOrderSubmitting ||
                                            model.cartSnapshot.items.length ===
                                                0
                                    ),
                                    h.Class(
                                        "mt-6 min-h-12 w-full rounded-[var(--radius-control)] bg-primary px-5 font-medium text-primary-foreground disabled:opacity-50"
                                    ),
                                ],
                                [
                                    model.isOrderSubmitting
                                        ? "Recording order..."
                                        : "Record pending order",
                                ]
                            ),
                        ]
                    ),
                    h.aside(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-border bg-muted/30 p-6"
                            ),
                        ],
                        [
                            h.h2([h.Class("font-semibold")], ["Order summary"]),
                            model.cartSnapshot.items.length === 0
                                ? h.div(
                                      [h.Class("mt-4 space-y-3")],
                                      [
                                          h.p(
                                              [
                                                  h.Class(
                                                      "text-sm text-muted-foreground"
                                                  ),
                                              ],
                                              ["Your cart is empty."]
                                          ),
                                          h.a(
                                              [
                                                  h.Href(hrefs.products()),
                                                  h.Class(
                                                      "text-sm font-medium text-primary underline"
                                                  ),
                                              ],
                                              ["Browse products"]
                                          ),
                                      ]
                                  )
                                : h.div(
                                      [h.Class("mt-4 space-y-3")],
                                      [
                                          ...model.cartSnapshot.items.map(
                                              (item) =>
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "flex justify-between gap-4 text-sm"
                                                          ),
                                                      ],
                                                      [
                                                          h.span(
                                                              [],
                                                              [
                                                                  `${item.quantity} × ${item.productName}`,
                                                              ]
                                                          ),
                                                          h.span(
                                                              [
                                                                  h.Class(
                                                                      "font-medium"
                                                                  ),
                                                              ],
                                                              [
                                                                  formatProductPrice(
                                                                      item.productPrice *
                                                                          item.quantity
                                                                  ),
                                                              ]
                                                          ),
                                                      ]
                                                  )
                                          ),
                                          h.div(
                                              [
                                                  h.Class(
                                                      "flex justify-between gap-4 border-t border-border pt-3 font-semibold"
                                                  ),
                                              ],
                                              [
                                                  h.span([], ["Total"]),
                                                  h.span(
                                                      [],
                                                      [
                                                          formatProductPrice(
                                                              cart?.totalPrice ??
                                                                  0
                                                          ),
                                                      ]
                                                  ),
                                              ]
                                          ),
                                      ]
                                  ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const ordersLayoutView = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    isEditing: boolean,
    editMessage: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-8")],
        [
            layoutPageHeader(
                "Orders",
                "Order and receipt layouts",
                isEditing,
                editMessage,
                h
            ),
            model.areOrdersLoading
                ? h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      ["Loading orders..."]
                  )
                : model.orders.length === 0
                  ? h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-dashed border-border bg-card p-10 text-center"
                            ),
                        ],
                        [
                            h.h2([h.Class("font-semibold")], ["No orders yet"]),
                            h.p(
                                [h.Class("mt-2 text-sm text-muted-foreground")],
                                [
                                    "Pending orders recorded at checkout will appear here.",
                                ]
                            ),
                        ]
                    )
                  : h.div(
                        [h.Class("grid gap-3")],
                        model.orders.map(({ order, items }) =>
                            h.a(
                                [
                                    h.Href(hrefs.order(order.id)),
                                    h.Class(
                                        "grid gap-3 rounded-[var(--radius-surface)] border border-border bg-card p-5 transition hover:bg-accent sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.h2(
                                                [h.Class("font-semibold")],
                                                [`Order ${order.id.slice(-8)}`]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-1 text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    `${order.email} · ${items.length} line${items.length === 1 ? "" : "s"}`,
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("sm:text-right")],
                                        [
                                            h.p(
                                                [h.Class("font-semibold")],
                                                [
                                                    formatProductPrice(
                                                        order.totalPrice
                                                    ),
                                                ]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-1 text-xs uppercase tracking-wide text-muted-foreground"
                                                    ),
                                                ],
                                                [order.status]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
        ]
    )

const receiptLayoutView = <ParentMessage>(
    model: Model,
    orderId: string,
    editMessage: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = model.orders.find(
        (candidate) => candidate.order.id === orderId
    )

    if (snapshot === undefined) {
        return h.div(
            [h.Class("space-y-6")],
            [
                layoutPageHeader(
                    "Receipt",
                    `Order ${orderId}`,
                    false,
                    editMessage,
                    h
                ),
                h.p(
                    [h.Class("text-sm text-muted-foreground")],
                    [
                        model.areOrdersLoading
                            ? "Loading order..."
                            : "Order not found.",
                    ]
                ),
            ]
        )
    }

    const { order, items } = snapshot

    return h.div(
        [h.Class("space-y-8")],
        [
            layoutPageHeader(
                "Receipt",
                `Order ${order.id.slice(-8)}`,
                model.editorState._tag === "Editing",
                editMessage,
                h
            ),
            h.article(
                [
                    h.Class(
                        "mx-auto max-w-3xl rounded-[var(--radius-surface)] border border-border bg-card p-6 sm:p-8"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold")],
                        ["Thanks for your order"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            `${order.email} · ${order.status}. Payment has not been collected.`,
                        ]
                    ),
                    h.div(
                        [h.Class("mt-8 border-y border-border py-5")],
                        items.map((item) =>
                            h.div(
                                [h.Class("flex justify-between gap-4 py-2")],
                                [
                                    h.span(
                                        [],
                                        [
                                            `${item.quantity} × ${item.productName}`,
                                        ]
                                    ),
                                    h.span(
                                        [h.Class("font-medium")],
                                        [
                                            formatProductPrice(
                                                item.productPrice *
                                                    item.quantity
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
                    h.div(
                        [h.Class("mt-5 flex justify-between font-semibold")],
                        [
                            h.span([], ["Total"]),
                            h.span([], [formatProductPrice(order.totalPrice)]),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const feedbackView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("grid gap-3")],
        [
            Option.match(model.error, {
                onNone: () => h.empty,
                onSome: (error) =>
                    h.p(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                            ),
                            h.Attribute("role", "alert"),
                        ],
                        [error]
                    ),
            }),
            Option.match(model.success, {
                onNone: () => h.empty,
                onSome: (success) =>
                    h.p(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
                            ),
                            h.Attribute("role", "status"),
                        ],
                        [success]
                    ),
            }),
        ]
    )
}

const collectionEditorView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isCreating = model.route._tag === "ShopCollections"
    const field = (
        id: "name" | "slug" | "imageUrl",
        label: string,
        type = "text"
    ) =>
        h.div(
            [h.Class(fieldClass)],
            [
                h.label(
                    [h.For(`collection-${id}`), h.Class("text-sm font-medium")],
                    [label]
                ),
                h.input([
                    h.Id(`collection-${id}`),
                    h.Name(id),
                    h.Type(type),
                    h.Value(model.collectionDraft[id]),
                    h.Required(id !== "imageUrl"),
                    h.Disabled(model.isCollectionSubmitting),
                    h.Class(inputClass),
                    h.OnInput((value) =>
                        toParentMessage(
                            UpdatedCollectionDraft({ field: id, value })
                        )
                    ),
                ]),
            ]
        )

    return h.section(
        [
            h.Class(
                "space-y-6 rounded-[var(--radius-surface)] border border-primary/30 bg-muted/30 p-5"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold")],
                        [isCreating ? "New collection" : "Edit collection"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            isCreating
                                ? "Create collection data within the collection listing layout."
                                : "Update this collection within its rendered layout.",
                        ]
                    ),
                ]
            ),
            h.form(
                [
                    h.Class("space-y-5"),
                    h.OnSubmit(toParentMessage(SubmittedCollectionForm())),
                ],
                [
                    field("name", "Name"),
                    field("slug", "Slug"),
                    h.div(
                        [h.Class(fieldClass)],
                        [
                            h.label(
                                [
                                    h.For("collection-description"),
                                    h.Class("text-sm font-medium"),
                                ],
                                ["Description"]
                            ),
                            h.textarea([
                                h.Id("collection-description"),
                                h.Name("description"),
                                h.Value(model.collectionDraft.description),
                                h.Rows(5),
                                h.Disabled(model.isCollectionSubmitting),
                                h.Class(`${inputClass} py-3`),
                                h.OnInput((value) =>
                                    toParentMessage(
                                        UpdatedCollectionDraft({
                                            field: "description",
                                            value,
                                        })
                                    )
                                ),
                            ]),
                        ]
                    ),
                    field("imageUrl", "Image URL"),
                    h.label(
                        [
                            h.Class(
                                "flex min-h-12 items-center gap-3 rounded-[var(--radius-surface)] border border-border px-3 text-sm"
                            ),
                        ],
                        [
                            h.input([
                                h.Type("checkbox"),
                                h.Disabled(model.isCollectionSubmitting),
                                h.Checked(model.collectionDraft.isActive),
                                h.OnClick(
                                    toParentMessage(
                                        UpdatedCollectionActive({
                                            value: !model.collectionDraft
                                                .isActive,
                                        })
                                    )
                                ),
                            ]),
                            "Published in the generated storefront",
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap justify-end gap-3")],
                        [
                            isCreating
                                ? h.empty
                                : h.button(
                                      [
                                          h.Type("button"),
                                          h.Disabled(
                                              model.isCollectionSubmitting
                                          ),
                                          h.OnClick(
                                              toParentMessage(
                                                  UpdatedCollectionActive({
                                                      value: !model
                                                          .collectionDraft
                                                          .isActive,
                                                  })
                                              )
                                          ),
                                          h.Class(
                                              "min-h-12 rounded-[var(--radius-control)] border border-border bg-background px-5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60"
                                          ),
                                      ],
                                      [
                                          model.collectionDraft.isActive
                                              ? "Archive collection"
                                              : "Restore collection",
                                      ]
                                  ),
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Disabled(model.isCollectionSubmitting),
                                    h.Class(
                                        "min-h-12 rounded-[var(--radius-control)] bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                                    ),
                                ],
                                [
                                    model.isCollectionSubmitting
                                        ? "Saving..."
                                        : isCreating
                                          ? "Create collection"
                                          : "Save collection",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const productListView = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    editMessage: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { keyed } = h

    if (model.editorState._tag === "Viewing") {
        return h.div(
            [h.Class("space-y-8")],
            [
                layoutPageHeader(
                    "Products",
                    "Product listing layout",
                    false,
                    editMessage,
                    h
                ),
                model.isLoading
                    ? h.div(
                          [
                              h.Class(
                                  "rounded-[var(--radius-surface)] border border-border bg-card p-10 text-center text-muted-foreground"
                              ),
                          ],
                          ["Loading products..."]
                      )
                    : Array.match(model.products, {
                          onEmpty: () =>
                              h.div(
                                  [
                                      h.Class(
                                          "rounded-[var(--radius-surface)] border border-dashed border-border bg-card p-10 text-center"
                                      ),
                                  ],
                                  [
                                      h.h2(
                                          [h.Class("text-lg font-semibold")],
                                          ["No products yet"]
                                      ),
                                      h.p(
                                          [
                                              h.Class(
                                                  "mt-2 text-sm text-muted-foreground"
                                              ),
                                          ],
                                          [
                                              "Choose Edit to add the first product.",
                                          ]
                                      ),
                                  ]
                              ),
                          onNonEmpty: (products) =>
                              h.section(
                                  [
                                      h.Class(
                                          "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                                      ),
                                  ],
                                  products.map((product) =>
                                      keyed("article")(
                                          product.id,
                                          [
                                              h.Class(
                                                  "overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card text-card-foreground"
                                              ),
                                          ],
                                          [
                                              h.a(
                                                  [
                                                      h.Href(
                                                          hrefs.product(
                                                              product.slug
                                                          )
                                                      ),
                                                      h.Class("block"),
                                                  ],
                                                  [
                                                      h.img([
                                                          h.Src(
                                                              toImageSrc(
                                                                  product.imageUrl
                                                              )
                                                          ),
                                                          h.Alt(product.name),
                                                          h.Class(
                                                              "aspect-square w-full object-cover"
                                                          ),
                                                      ]),
                                                      h.div(
                                                          [
                                                              h.Class(
                                                                  "space-y-1 p-5"
                                                              ),
                                                          ],
                                                          [
                                                              h.h2(
                                                                  [
                                                                      h.Class(
                                                                          "font-semibold"
                                                                      ),
                                                                  ],
                                                                  [product.name]
                                                              ),
                                                              h.p(
                                                                  [
                                                                      h.Class(
                                                                          "text-sm text-muted-foreground"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      formatProductPrice(
                                                                          product.price
                                                                      ),
                                                                  ]
                                                              ),
                                                          ]
                                                      ),
                                                  ]
                                              ),
                                          ]
                                      )
                                  )
                              ),
                      }),
            ]
        )
    }

    return h.div(
        [h.Class("space-y-6")],
        [
            layoutPageHeader(
                "Products",
                "Product listing layout",
                true,
                editMessage,
                h
            ),
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-4 border-b-(length:--surface-border-width) border-border pb-6 sm:flex-row sm:items-end sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [h.Class("space-y-1")],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-semibold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Product data"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Manage the products used by this layout."]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            h.Href(hrefs.createProduct()),
                            h.Class(
                                "inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Add product"]
                    ),
                ]
            ),
            feedbackView<ParentMessage>(model, h),
            model.isLoading
                ? h.div(
                      [
                          h.Class(
                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-8 text-center text-sm text-muted-foreground"
                          ),
                      ],
                      ["Loading products..."]
                  )
                : Array.match(model.products, {
                      onEmpty: () =>
                          h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-10 text-center"
                                  ),
                              ],
                              [
                                  h.h2(
                                      [
                                          h.Class(
                                              "text-lg font-semibold text-foreground"
                                          ),
                                      ],
                                      ["No products yet"]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-1 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "Add your first product to make it available.",
                                      ]
                                  ),
                              ]
                          ),
                      onNonEmpty: (products) =>
                          h.div(
                              [
                                  h.Class(
                                      "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                                  ),
                              ],
                              [
                                  h.div(
                                      [
                                          h.Class(
                                              "hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b-(length:--surface-border-width) border-border bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid"
                                          ),
                                      ],
                                      ["Product", "Status", ""]
                                  ),
                                  h.div(
                                      [h.Class("divide-y divide-border")],
                                      Array.map(products, (product) =>
                                          keyed("article")(
                                              product.id,
                                              [
                                                  h.Class(
                                                      "grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
                                                  ),
                                              ],
                                              [
                                                  h.div(
                                                      [h.Class("min-w-0")],
                                                      [
                                                          h.h2(
                                                              [
                                                                  h.Class(
                                                                      "truncate font-medium text-foreground"
                                                                  ),
                                                              ],
                                                              [product.name]
                                                          ),
                                                          h.p(
                                                              [
                                                                  h.Class(
                                                                      "mt-1 text-sm text-muted-foreground"
                                                                  ),
                                                              ],
                                                              [
                                                                  `${product.slug} · $${(product.price / 100).toFixed(2)}`,
                                                              ]
                                                          ),
                                                      ]
                                                  ),
                                                  h.span(
                                                      [
                                                          h.Class(
                                                              product.isActive
                                                                  ? "w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground"
                                                                  : "w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                                          ),
                                                      ],
                                                      [
                                                          product.isActive
                                                              ? "Active"
                                                              : "Draft",
                                                      ]
                                                  ),
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "flex flex-wrap gap-2"
                                                          ),
                                                      ],
                                                      [
                                                          h.a(
                                                              [
                                                                  h.Href(
                                                                      hrefs.product(
                                                                          product.slug
                                                                      )
                                                                  ),
                                                                  h.Class(
                                                                      "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-border px-3 text-sm font-medium text-foreground"
                                                                  ),
                                                              ],
                                                              ["View"]
                                                          ),
                                                          h.a(
                                                              [
                                                                  h.Href(
                                                                      hrefs.editProduct(
                                                                          product.id
                                                                      )
                                                                  ),
                                                                  h.Class(
                                                                      "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                                  ),
                                                              ],
                                                              ["Edit"]
                                                          ),
                                                      ]
                                                  ),
                                              ]
                                          )
                                      )
                                  ),
                              ]
                          ),
                  }),
        ]
    )
}

const productFormView = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    toParentMessage: (message: Message) => ParentMessage,
    mode: "create" | "edit",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const title = mode === "create" ? "Add product" : "Edit product"
    const submitLabel = model.isSubmitting
        ? "Saving..."
        : mode === "create"
          ? "Create product"
          : "Save changes"

    const textField = (
        id: "name" | "slug" | "price" | "inventory" | "imageUrl",
        label: string,
        type = "text"
    ) =>
        h.div(
            [h.Class(fieldClass)],
            [
                h.label(
                    [h.For(id), h.Class("text-sm font-medium text-foreground")],
                    [label]
                ),
                h.input([
                    h.Id(id),
                    h.Name(id),
                    h.Type(type),
                    h.Value(model.productDraft[id]),
                    h.Required(id !== "imageUrl"),
                    ...(id === "price" || id === "inventory"
                        ? [
                              h.Attribute("min", "0"),
                              h.Attribute(
                                  "step",
                                  id === "price" ? "0.01" : "1"
                              ),
                          ]
                        : []),
                    h.Class(inputClass),
                    h.OnInput((value) =>
                        toParentMessage(
                            UpdatedProductDraft({ field: id, value })
                        )
                    ),
                ]),
            ]
        )

    return h.div(
        [h.Class("mx-auto max-w-3xl space-y-6")],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-3 border-b-(length:--surface-border-width) border-border pb-6 sm:flex-row sm:items-start sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [h.Class("space-y-1")],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-semibold tracking-tight text-foreground"
                                    ),
                                ],
                                [title]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    mode === "create"
                                        ? "Set the details customers will see."
                                        : "Update this product's storefront details.",
                                ]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            h.Href(hrefs.products()),
                            h.Class(
                                "inline-flex min-h-10 items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
                            ),
                        ],
                        ["Back to products"]
                    ),
                ]
            ),
            feedbackView<ParentMessage>(model, h),
            h.form(
                [
                    h.Class(
                        "space-y-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground sm:p-6"
                    ),
                    h.OnSubmit(toParentMessage(SubmittedProductForm())),
                ],
                [
                    h.div(
                        [h.Class("grid gap-5 sm:grid-cols-2")],
                        [
                            textField("name", "Product name"),
                            textField("slug", "Slug"),
                            textField("price", "Price", "number"),
                            textField("inventory", "Inventory", "number"),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            h.p(
                                [h.Class("font-medium text-foreground")],
                                ["TODO: Variants UI"]
                            ),
                            h.p(
                                [h.Class("mt-1")],
                                [
                                    "This inventory value currently manages the product's Default variant. A future variants UI will manage size, colour, and other variant-specific stock.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class(fieldClass)],
                        [
                            h.label(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Product image"]
                            ),
                            model.productDraft.imageUrl === ""
                                ? h.empty
                                : h.div(
                                      [
                                          h.Class(
                                              "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted"
                                          ),
                                      ],
                                      [
                                          h.img([
                                              h.Src(
                                                  toImageSrc(
                                                      model.productDraft
                                                          .imageUrl
                                                  )
                                              ),
                                              h.Alt(
                                                  model.productDraft.name ||
                                                      "Product image"
                                              ),
                                              h.Class(
                                                  "aspect-square w-full max-w-sm object-cover"
                                              ),
                                          ]),
                                      ]
                                  ),
                            h.submodel({
                                slotId: model.productImageDrop.id,
                                model: model.productImageDrop,
                                view: Ui.FileDrop.view,
                                viewInputs: {
                                    multiple: false,
                                    accept: [
                                        "image/png",
                                        "image/jpeg",
                                        "image/webp",
                                        "image/gif",
                                    ],
                                    toView: (attributes) =>
                                        h.label(
                                            [
                                                ...attributes.root,
                                                h.Class(productImageDropClass),
                                            ],
                                            [
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "text-sm font-medium text-foreground"
                                                        ),
                                                    ],
                                                    [
                                                        "Drop an image here or click to browse",
                                                    ]
                                                ),
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "text-sm text-muted-foreground"
                                                        ),
                                                    ],
                                                    ["PNG, JPG, WEBP, or GIF"]
                                                ),
                                                h.input(attributes.input),
                                            ]
                                        ),
                                },
                                toParentMessage: (message) =>
                                    toParentMessage(
                                        GotProductImageDropMessage({ message })
                                    ),
                            }),
                            model.selectedProductImageFiles.length === 0
                                ? h.empty
                                : h.div(
                                      [
                                          h.Class(
                                              "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2"
                                          ),
                                      ],
                                      [
                                          ...model.selectedProductImageFiles.map(
                                              (file) =>
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "min-w-0 truncate text-sm text-foreground"
                                                          ),
                                                      ],
                                                      [File.name(file)]
                                                  )
                                          ),
                                          h.button(
                                              [
                                                  h.Type("button"),
                                                  h.OnClick(
                                                      toParentMessage(
                                                          RemovedSelectedProductImage(
                                                              {
                                                                  fileIndex: 0,
                                                              }
                                                          )
                                                      )
                                                  ),
                                                  h.Class(
                                                      "text-sm text-muted-foreground transition hover:text-destructive"
                                                  ),
                                              ],
                                              ["Remove"]
                                          ),
                                      ]
                                  ),
                            h.div(
                                [h.Class("flex justify-end")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                model.isProductImageUploading ||
                                                    model
                                                        .selectedProductImageFiles
                                                        .length === 0
                                            ),
                                            h.OnClick(
                                                toParentMessage(
                                                    ClickedUploadProductImage()
                                                )
                                            ),
                                            h.Class(
                                                "min-h-10 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60 [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        [
                                            model.isProductImageUploading
                                                ? "Uploading..."
                                                : "Upload image",
                                        ]
                                    ),
                                ]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Upload an image or choose one from the Media library. The image address fills automatically.",
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        toParentMessage(
                                            model.isProductMediaLibraryOpen
                                                ? ClosedProductMediaLibrary()
                                                : OpenedProductMediaLibrary()
                                        )
                                    ),
                                    h.Class(
                                        "min-h-10 self-start rounded-[var(--radius-control)] border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent"
                                    ),
                                ],
                                [
                                    model.isProductMediaLibraryOpen
                                        ? "Close Media library"
                                        : "Choose from Media library",
                                ]
                            ),
                            model.isProductMediaLibraryOpen
                                ? h.section(
                                      [
                                          h.Attribute(
                                              "aria-label",
                                              "Media library images"
                                          ),
                                          h.Class("grid gap-3"),
                                      ],
                                      [
                                          model.isProductMediaLibraryLoading
                                              ? h.p([], ["Loading images..."])
                                              : h.empty,
                                          Option.match(
                                              model.productMediaError,
                                              {
                                                  onNone: () => h.empty,
                                                  onSome: (error) =>
                                                      h.p(
                                                          [
                                                              h.Attribute(
                                                                  "role",
                                                                  "alert"
                                                              ),
                                                          ],
                                                          [error]
                                                      ),
                                              }
                                          ),
                                          !model.isProductMediaLibraryLoading &&
                                          model.productMediaImages.length ===
                                              0 &&
                                          Option.isNone(model.productMediaError)
                                              ? h.p(
                                                    [],
                                                    [
                                                        "No images in this workspace's Media library.",
                                                    ]
                                                )
                                              : h.empty,
                                          h.div(
                                              [
                                                  h.Class(
                                                      "grid grid-cols-2 gap-3 sm:grid-cols-3"
                                                  ),
                                              ],
                                              model.productMediaImages.map(
                                                  (image) =>
                                                      h.button(
                                                          [
                                                              h.Type("button"),
                                                              h.OnClick(
                                                                  toParentMessage(
                                                                      SelectedProductMediaImage(
                                                                          {
                                                                              imageId:
                                                                                  image.id,
                                                                          }
                                                                      )
                                                                  )
                                                              ),
                                                              h.Class(
                                                                  "overflow-hidden rounded-[var(--radius-surface)] border border-border bg-background text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                                                              ),
                                                          ],
                                                          [
                                                              h.img([
                                                                  h.Src(
                                                                      toImageSrc(
                                                                          image.url
                                                                      )
                                                                  ),
                                                                  h.Alt(""),
                                                                  h.Class(
                                                                      "aspect-square w-full object-cover"
                                                                  ),
                                                              ]),
                                                              h.span(
                                                                  [
                                                                      h.Class(
                                                                          "block truncate px-2 py-2 text-sm"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      image.alt ||
                                                                          "Choose image",
                                                                  ]
                                                              ),
                                                          ]
                                                      )
                                              )
                                          ),
                                      ]
                                  )
                                : h.empty,
                            textField("imageUrl", "Image URL (optional)"),
                        ]
                    ),
                    h.div(
                        [h.Class(fieldClass)],
                        [
                            h.label(
                                [
                                    h.For("description"),
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Description"]
                            ),
                            h.textarea([
                                h.Id("description"),
                                h.Name("description"),
                                h.Value(model.productDraft.description),
                                h.Rows(5),
                                h.Class(`${inputClass} py-3`),
                                h.OnInput((value) =>
                                    toParentMessage(
                                        UpdatedProductDraft({
                                            field: "description",
                                            value,
                                        })
                                    )
                                ),
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-3 sm:grid-cols-2")],
                        [
                            h.label(
                                [
                                    h.For("is-active"),
                                    h.Class(
                                        "flex min-h-12 items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-sm text-foreground"
                                    ),
                                ],
                                [
                                    h.input([
                                        h.Id("is-active"),
                                        h.Name("is-active"),
                                        h.Type("checkbox"),
                                        h.Checked(model.productDraft.isActive),
                                        h.Class(
                                            "size-4 rounded border-border accent-primary"
                                        ),
                                        h.OnClick(
                                            toParentMessage(
                                                UpdatedProductActive({
                                                    value: !model.productDraft
                                                        .isActive,
                                                })
                                            )
                                        ),
                                    ]),
                                    "Published in the generated storefront",
                                ]
                            ),
                            h.label(
                                [
                                    h.For("is-featured"),
                                    h.Class(
                                        "flex min-h-12 items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-sm text-foreground"
                                    ),
                                ],
                                [
                                    h.input([
                                        h.Id("is-featured"),
                                        h.Name("is-featured"),
                                        h.Type("checkbox"),
                                        h.Checked(
                                            model.productDraft.isFeatured
                                        ),
                                        h.Class(
                                            "size-4 rounded border-border accent-primary"
                                        ),
                                        h.OnClick(
                                            toParentMessage(
                                                UpdatedProductFeatured({
                                                    value: !model.productDraft
                                                        .isFeatured,
                                                })
                                            )
                                        ),
                                    ]),
                                    "Feature this product",
                                ]
                            ),
                        ]
                    ),
                    h.fieldset(
                        [
                            h.Class(
                                "space-y-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                            ),
                        ],
                        [
                            h.legend(
                                [
                                    h.Class(
                                        "px-1 text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Collections"]
                            ),
                            model.collections.length === 0
                                ? h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "Create a collection before assigning this product.",
                                      ]
                                  )
                                : h.div(
                                      [h.Class("grid gap-2 sm:grid-cols-2")],
                                      model.collections.map((collection) => {
                                          const inputId = `product-collection-${collection.id}`
                                          const selected =
                                              model.productDraft.collectionIds.includes(
                                                  collection.id
                                              )

                                          return h.label(
                                              [
                                                  h.For(inputId),
                                                  h.Class(
                                                      "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border border-border px-3 text-sm text-foreground transition hover:bg-accent"
                                                  ),
                                              ],
                                              [
                                                  h.input([
                                                      h.Id(inputId),
                                                      h.Type("checkbox"),
                                                      h.Checked(selected),
                                                      h.Disabled(
                                                          model.isSubmitting
                                                      ),
                                                      h.Class(
                                                          "size-4 rounded border-border accent-primary"
                                                      ),
                                                      h.OnClick(
                                                          toParentMessage(
                                                              UpdatedProductCollection(
                                                                  {
                                                                      collectionId:
                                                                          collection.id,
                                                                      selected:
                                                                          !selected,
                                                                  }
                                                              )
                                                          )
                                                      ),
                                                  ]),
                                                  h.span(
                                                      [h.Class("min-w-0")],
                                                      [collection.name]
                                                  ),
                                              ]
                                          )
                                      })
                                  ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex justify-end border-t-(length:--surface-border-width) border-border pt-5"
                            ),
                        ],
                        [
                            mode === "create"
                                ? h.empty
                                : h.button(
                                      [
                                          h.Type("button"),
                                          h.Disabled(model.isSubmitting),
                                          h.OnClick(
                                              toParentMessage(
                                                  UpdatedProductActive({
                                                      value: !model.productDraft
                                                          .isActive,
                                                  })
                                              )
                                          ),
                                          h.Class(
                                              "mr-auto min-h-12 rounded-[var(--radius-control)] border border-border bg-background px-5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60"
                                          ),
                                      ],
                                      [
                                          model.productDraft.isActive
                                              ? "Archive product"
                                              : "Restore product",
                                      ]
                                  ),
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Disabled(model.isSubmitting),
                                    h.Class(
                                        "min-h-12 rounded-[var(--radius-control)] bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                [submitLabel]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    hrefs: Hrefs,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { keyed } = h
    const isEditing = model.editorState._tag === "Editing"
    const editMessage = toParentMessage(
        isEditing ? ClickedCancelLayoutEditing() : ClickedEditLayout()
    )

    const content = M.value(model.route).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            ShopHome: () => shopHomeView<ParentMessage>(model, hrefs, h),
            ShopProducts: () =>
                productListView<ParentMessage>(model, hrefs, editMessage, h),
            ShopProduct: ({ slug }) =>
                productLayoutView(
                    model,
                    slug,
                    hrefs,
                    editMessage,
                    toParentMessage,
                    h
                ),
            ShopProductCreate: () =>
                productFormView<ParentMessage>(
                    model,
                    hrefs,
                    toParentMessage,
                    "create",
                    h
                ),
            ShopProductEdit: () =>
                productFormView<ParentMessage>(
                    model,
                    hrefs,
                    toParentMessage,
                    "edit",
                    h
                ),
            ShopProductsNotFound: ({ path }) =>
                h.div(
                    [h.Class("py-12 text-center")],
                    [
                        h.h1(
                            [h.Class("text-2xl font-semibold text-foreground")],
                            ["Product page not found"]
                        ),
                        h.p(
                            [h.Class("mt-2 text-sm text-muted-foreground")],
                            [`The path "${path}" was not found.`]
                        ),
                        h.a(
                            [
                                h.Href(hrefs.products()),
                                h.Class(
                                    "mt-5 inline-flex text-sm font-medium text-primary underline"
                                ),
                            ],
                            ["Go to products"]
                        ),
                    ]
                ),
            ShopCollections: () =>
                collectionsLayoutView(
                    model,
                    hrefs,
                    editMessage,
                    toParentMessage,
                    h
                ),
            ShopCollection: ({ slug }) =>
                collectionLayoutView(
                    model,
                    slug,
                    hrefs,
                    editMessage,
                    toParentMessage,
                    h
                ),
            ShopCart: () =>
                cartLayoutView(
                    model,
                    hrefs,
                    isEditing,
                    editMessage,
                    toParentMessage,
                    h
                ),
            ShopCheckout: () =>
                checkoutLayoutView(
                    model,
                    hrefs,
                    isEditing,
                    editMessage,
                    toParentMessage,
                    h
                ),
            ShopOrders: () =>
                ordersLayoutView(model, hrefs, isEditing, editMessage, h),
            ShopOrder: ({ orderId }) =>
                receiptLayoutView(model, orderId, editMessage, h),
        })
    )

    return h.div(
        [
            h.Class(
                "relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            keyed("div")(model.route._tag, [], [content]),
            isEditing &&
            model.route._tag !== "ShopCollections" &&
            model.route._tag !== "ShopCollection"
                ? h.aside(
                      [
                          h.Class(
                              "fixed inset-y-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-surface)] border border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
                          ),
                          h.AriaLabel("Shop layout editor"),
                      ],
                      [
                          h.div(
                              [
                                  h.Class(
                                      "flex items-start justify-between gap-4"
                                  ),
                              ],
                              [
                                  h.div(
                                      [],
                                      [
                                          h.h2(
                                              [
                                                  h.Class(
                                                      "text-lg font-semibold"
                                                  ),
                                              ],
                                              ["Edit layout"]
                                          ),
                                          h.p(
                                              [
                                                  h.Class(
                                                      "mt-1 text-sm text-muted-foreground"
                                                  ),
                                              ],
                                              [
                                                  "Route-local data, content, and template controls appear in this overlay.",
                                              ]
                                          ),
                                      ]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.AriaLabel("Close layout editor"),
                                          h.OnClick(editMessage),
                                          h.Class(
                                              "min-h-11 min-w-11 rounded-[var(--radius-control)] border border-border"
                                          ),
                                      ],
                                      ["Close"]
                                  ),
                              ]
                          ),
                          h.div(
                              [
                                  h.Class(
                                      "mt-6 rounded-[var(--radius-surface)] border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground"
                                  ),
                              ],
                              [
                                  "This establishes the shared editing overlay. Route-specific persisted controls are added as each layout slice is ported.",
                              ]
                          ),
                      ]
                  )
                : h.empty,
        ]
    )
}
