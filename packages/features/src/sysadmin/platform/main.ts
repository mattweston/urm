import { Runtime } from "foldkit"
import { type Url } from "foldkit/url"
import { init, update } from "./app.update.ts"
import { Model } from "./app.model.ts"
import { view } from "./app.view.ts"
import { ClickedLink } from "./route.message.ts"
import { onUrlChange } from "./route.command.ts"

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
    routing: {
        onUrlRequest: (request: (typeof ClickedLink.Type)["request"]) =>
            ClickedLink({ request }),
        onUrlChange,
    },
    container,
})

Runtime.run(application)

requestAnimationFrame(() => {
    maybeFoldkitShell?.setAttribute("data-foldkit-ready", "true")
})
