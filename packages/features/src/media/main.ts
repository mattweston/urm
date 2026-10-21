import { Runtime } from "foldkit"
import { type Url } from "foldkit/url"
import { Model } from "./platform/app.model.ts"
import { subscriptions } from "./gallery/gallery.subscription.ts"
import { init, update } from "./platform/app.update.ts"
import { view } from "./platform/app.view.ts"
import { ClickedLink } from "./platform/route.message.ts"
import { onUrlChange } from "./platform/route.command.ts"

const container = document.getElementById("foldkit-root")!
const maybeFoldkitShell = container.closest<HTMLElement>(".foldkit-shell")

const application = Runtime.makeApplication({
    Model,
    init: (url: Url) => {
        const [next_model, commands] = init(url.pathname)
        return { model: next_model, commands }
    },
    update: (
        model: Parameters<typeof update>[0],
        message: Parameters<typeof update>[1]
    ) => {
        const [next_model, commands] = update(model, message)
        return { model: next_model, commands }
    },
    view,
    subscriptions,
    container,
    routing: {
        onUrlRequest: (request: (typeof ClickedLink.Type)["request"]) =>
            ClickedLink({ request }),
        onUrlChange,
    },
})

Runtime.run(application)

requestAnimationFrame(() => {
    maybeFoldkitShell?.setAttribute("data-foldkit-ready", "true")
})
