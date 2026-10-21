import { is_contacts_path } from "./contacts/path.ts"
import { contacts_resources } from "./contacts/resources.ts"
import { handle_slow } from "./labs/sysadmin/slow-warnings/submodel.ts"
import { Capacitor } from "@capacitor/core"
import { Layer } from "effect"
import { Runtime } from "foldkit"

import * as Appearance from "@urm/features/settings/appearance"

import { layer as postgres_auth_layer } from "./auth/postgres-shell.layer.ts"
import {
    Message,
    Model,
    init,
    managedResources,
    subscriptions,
    update,
    view,
} from "./main.ts"
import { ChangedUrl, ClickedLink } from "./routing/message.ts"
import { development_redirect_url } from "./startup.ts"

const canonicalize_http_document_path = (): void => {
    if (is_contacts_path(globalThis.location.pathname)) return
    if (
        (globalThis.location.protocol === "http:" ||
            globalThis.location.protocol === "https:") &&
        globalThis.location.pathname !== "/"
    ) {
        globalThis.history.replaceState(
            null,
            "",
            `/${globalThis.location.search}${globalThis.location.hash}`
        )
    }
}

const is_native = Capacitor.isNativePlatform()
const redirect_url = development_redirect_url(
    globalThis.location.href,
    is_native
)

if (redirect_url !== undefined) {
    globalThis.location.replace(redirect_url)
} else {
    if (is_native) {
        document.documentElement.dataset.nativePlatform =
            Capacitor.getPlatform()
    }
    canonicalize_http_document_path()
    Appearance.bootstrap()

    const container = document.getElementById("root")

    if (!(container instanceof HTMLElement)) {
        throw new Error("The application root container is missing.")
    }

    const resources = postgres_auth_layer.pipe(
        Layer.provideMerge(contacts_resources(location.origin))
    )

    const application = Runtime.makeApplication({
        Model,
        init,
        update: (
            model: Parameters<typeof update>[0],
            message: Parameters<typeof update>[1]
        ) => {
            const [next_model, commands] = update(model, message)
            return { model: next_model, commands }
        },
        view,
        subscriptions,
        managedResources,
        container,
        resources,
        routing: {
            onUrlRequest: (request) => ClickedLink({ request }),
            onUrlChange: (url) => ChangedUrl({ url }),
        },
        viewTransition: ({ previousModel, model, message }) => {
            if (message._tag === "GotLabsGridBuilderMessage") {
                return (
                    message.message._tag === "ClickedAddBox" ||
                    message.message._tag === "ClickedRemoveBox"
                )
            }

            if (message._tag === "GotLabsGalleryMessage") {
                return message.message._tag === "ClickedArtworkListItem"
                    ? { types: ["to-gallery-image"] }
                    : message.message._tag === "ClickedArtworkList"
                      ? { types: ["to-gallery-grid"] }
                      : false
            }

            if (message._tag === "ChangedUrl") {
                const previous_route =
                    previousModel.labs_gallery.gallery.route._tag
                const route = model.labs_gallery.gallery.route._tag
                if (
                    previous_route === "Gallery3dEditArtworkList" &&
                    route === "Gallery3dEditArtworkDetails"
                ) {
                    return { types: ["to-gallery-image"] }
                }
                if (
                    previous_route === "Gallery3dEditArtworkDetails" &&
                    route === "Gallery3dEditArtworkList"
                ) {
                    return { types: ["to-gallery-grid"] }
                }
                return false
            }

            if (
                message._tag !== "GotMediaMessage" &&
                message._tag !== "GotLabsGalleryTransitionsMessage"
            ) {
                return false
            }

            return message.message._tag === "SelectedGalleryImage"
                ? { types: ["to-gallery-image"] }
                : message.message._tag === "ClosedGalleryImage"
                  ? { types: ["to-gallery-grid"] }
                  : false
        },
        slow: {
            onSlow: (context) => {
                const model =
                    context._tag === "Update"
                        ? context.nextModel
                        : context.model
                if (model.labs_slow_warnings.active) {
                    handle_slow(context)
                } else {
                    Runtime.defaultSlowCallback(context)
                }
            },
        },
        devTools: { Message },
    })

    Runtime.run(application)
}
