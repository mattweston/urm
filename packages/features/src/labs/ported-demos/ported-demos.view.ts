import { Match as M } from "effect"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Cartlane from "../cartlane/index.ts"
import * as Draftboard from "../draftboard/index.ts"
import * as Relay from "../relay/index.ts"
import * as Streambox from "../streambox/index.ts"
import * as Threadline from "../threadline/index.ts"
import {
    GotCartlaneMessage,
    GotDraftboardMessage,
    GotRelayMessage,
    GotStreamboxMessage,
    GotThreadlineMessage,
    type Message,
} from "./ported-demos.message.ts"
import type { DemoRoute, Model } from "./ported-demos.model.ts"
import { demoHref } from "./ported-demos.route.ts"

export type PortedDemosHrefs = Readonly<{
    demo: (route: DemoRoute) => string
    cartlane: Cartlane.CartlaneHrefs
}>

const default_hrefs: PortedDemosHrefs = {
    demo: demoHref,
    cartlane: {
        catalog: Cartlane.catalogHref,
        product: Cartlane.productHref,
        cart: Cartlane.cartHref,
        checkout: Cartlane.checkoutHref,
        order: Cartlane.orderHref,
    },
}

const button_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
const headerView = (
    route: DemoRoute,
    hrefs: PortedDemosHrefs,
    h: HtmlBuilder<Message>
): Html =>
    h.header(
        [h.Class("space-y-4")],
        [
            h.div(
                [],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                            ),
                        ],
                        ["Ported lab"]
                    ),
                    h.h1([h.Class("text-3xl font-bold")], [route]),
                ]
            ),
            h.nav(
                [h.Class("flex flex-wrap gap-2")],
                (
                    [
                        "Cartlane",
                        "Draftboard",
                        "Relay",
                        "Streambox",
                        "Threadline",
                    ] as const
                ).map((item) =>
                    h.a(
                        [
                            h.Href(hrefs.demo(item)),
                            h.Class(
                                `${button_class} ${item === route ? "bg-primary text-primary-foreground" : ""}`
                            ),
                        ],
                        [item]
                    )
                )
            ),
        ]
    )
const portedDemosView = (
    model: Model,
    hrefs: PortedDemosHrefs,
    h: HtmlBuilder<Message>
): Html =>
    h.main(
        [h.Class("mx-auto min-h-screen max-w-7xl space-y-7 p-5 md:p-8")],
        [
            headerView(model.route, hrefs, h),
            M.value(model.route).pipe(
                M.when("Cartlane", () =>
                    h.submodel({
                        slotId: "cartlane",
                        model: model.cartlane,
                        view: Cartlane.view,
                        viewInputs: {
                            catalogHref: hrefs.cartlane.catalog,
                            productHref: hrefs.cartlane.product,
                            cartHref: hrefs.cartlane.cart,
                            checkoutHref: hrefs.cartlane.checkout,
                            orderHref: hrefs.cartlane.order,
                        },
                        toParentMessage: (message) =>
                            GotCartlaneMessage({ message }),
                    })
                ),
                M.when("Draftboard", () =>
                    h.submodel({
                        slotId: "draftboard",
                        model: model.draftboard,
                        view: Draftboard.view,
                        toParentMessage: (message) =>
                            GotDraftboardMessage({ message }),
                    })
                ),
                M.when("Relay", () =>
                    h.submodel({
                        slotId: "relay",
                        model: model.relay,
                        view: Relay.view,
                        toParentMessage: (message) =>
                            GotRelayMessage({ message }),
                    })
                ),
                M.when("Streambox", () =>
                    h.submodel({
                        slotId: "streambox",
                        model: model.streambox,
                        view: Streambox.view,
                        toParentMessage: (message) =>
                            GotStreamboxMessage({ message }),
                    })
                ),
                M.when("Threadline", () =>
                    h.submodel({
                        slotId: "threadline",
                        model: model.threadline,
                        view: Threadline.view,
                        toParentMessage: (message) =>
                            GotThreadlineMessage({ message }),
                    })
                ),
                M.exhaustive
            ),
        ]
    )
export const view = Submodel.defineView<
    Model,
    Message,
    {
        readonly demoHref?: PortedDemosHrefs["demo"]
        readonly cartlaneCatalogHref?: Cartlane.CartlaneHrefs["catalog"]
        readonly cartlaneProductHref?: Cartlane.CartlaneHrefs["product"]
        readonly cartlaneCartHref?: Cartlane.CartlaneHrefs["cart"]
        readonly cartlaneCheckoutHref?: Cartlane.CartlaneHrefs["checkout"]
        readonly cartlaneOrderHref?: Cartlane.CartlaneHrefs["order"]
    }
>((model, inputs, h) =>
    portedDemosView(
        model,
        {
            demo: inputs.demoHref ?? default_hrefs.demo,
            cartlane: {
                catalog:
                    inputs.cartlaneCatalogHref ??
                    default_hrefs.cartlane.catalog,
                product:
                    inputs.cartlaneProductHref ??
                    default_hrefs.cartlane.product,
                cart:
                    inputs.cartlaneCartHref ?? default_hrefs.cartlane.cart,
                checkout:
                    inputs.cartlaneCheckoutHref ??
                    default_hrefs.cartlane.checkout,
                order:
                    inputs.cartlaneOrderHref ?? default_hrefs.cartlane.order,
            },
        },
        h
    )
)
