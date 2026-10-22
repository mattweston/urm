import { Runtime } from "foldkit"

import * as Appearance from "@urm/features/settings/appearance"

import { browser_breach_check } from "./auth/breach-check/submodel.ts"
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

Appearance.bootstrap()

const container = document.getElementById("root")

if (!(container instanceof HTMLElement)) {
    throw new Error("The labs root container is missing.")
}

Runtime.run(
    Runtime.makeApplication({
        Model,
        init,
        update,
        view,
        subscriptions,
        managedResources,
        container,
        // The breach-check lab posts to the app's own endpoint; nothing else
        // here needs a service.
        resources: browser_breach_check(location.origin),
        routing: {
            onUrlRequest: (request) => ClickedLink({ request }),
            onUrlChange: (url) => ChangedUrl({ url }),
        },
        slow: { onSlow: Runtime.defaultSlowCallback },
        devTools: { Message },
    })
)
