import { Effect } from "effect"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import { expect, test } from "vitest"
import {
    AddedComponent,
    ChangedComponentHref,
    type Message,
} from "./object.message.ts"
import type { Model } from "./object.model.ts"
import { init, update } from "./object.update.ts"
import { view } from "./object.view.ts"

test("the inline Link properties expose labelled Bookmark suggestions without navigating the canvas", async () => {
    const [initial] = init({ id: "form", name: "Form", components: [] })
    const [added] = update(initial, AddedComponent({ kind: "link" }))
    const [model] = update(
        added,
        ChangedComponentHref({ value: "javascript:alert(1)" })
    )
    const result = await Effect.runPromise(
        Server.renderToString(
            {
                init: () => ({ model }),
                view: (current: Model, h: HtmlBuilder<Message>) => ({
                    title: "Form",
                    body: h.submodel({
                        slotId: "form-builder",
                        model: current,
                        view,
                        viewInputs: {
                            link_suggestions: [
                                {
                                    id: "privacy",
                                    title: "Privacy policy",
                                    href: "https://example.com/privacy",
                                    tags: [],
                                },
                            ],
                        },
                        toParentMessage: (message) => message,
                    }),
                }),
            },
            { buildId: "form-links-test" }
        )
    )
    expect(result.html).toContain("Destination URL")
    expect(result.html).toContain(
        'list="builder-link-draft-component-1-bookmarks"'
    )
    expect(result.html).toContain('value="https://example.com/privacy"')
    expect(result.html).not.toContain('href="javascript:')
})
