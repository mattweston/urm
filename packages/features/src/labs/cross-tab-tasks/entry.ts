import { Runtime } from "foldkit"
import type { Document, HtmlBuilder } from "foldkit/html"

import {
    Message,
    Model,
    init,
    resources,
    subscriptions,
    update,
    view,
} from "./main.ts"

const standaloneView = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: "Cross-Tab Tasks",
    body: view(model, (message) => message, h),
})

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
    view: standaloneView,
    subscriptions,
    resources,
    container: document.getElementById("root"),
    devTools: {
        Message,
    },
})

Runtime.run(application)
