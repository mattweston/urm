import { Effect } from "effect"
import { expect, test } from "vitest"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import { resolveSiteTheme } from "@urm/domain/schemas/site-appearance"
import { publication_email_theme } from "@urm/email/publication-theme"
import {
    default_transactional_copy,
    TransactionalTemplateId,
} from "@urm/email/transactional-content"
import { transactional_history_view } from "./history.view.ts"
import {
    init,
    update,
    LoadedTransactionalTemplates,
    ToggledTransactionalEditing,
    ChangedTransactionalCopy,
    RequestedTransactionalHistory,
    LoadedTransactionalHistory,
    type Model,
    type Message,
} from "./editor.ts"
import { transactional_view } from "./view.ts"

const publication_theme = {
    brand_name: "Publication brand",
    site_theme: resolveSiteTheme({
        theme_id: "catppuccin-frappe",
        appearance: "dark",
    }),
}
const render = async (
    template_id: TransactionalTemplateId,
    preview = false
) => {
    const [loaded] = update(
        init("domain-a"),
        LoadedTransactionalTemplates({ states: [] })
    )
    const [dirty] = update(
        loaded,
        ChangedTransactionalCopy({
            template_id,
            field: "heading",
            value: "Unsaved inline heading",
        })
    )
    const model = preview
        ? update(dirty, ToggledTransactionalEditing({ template_id }))[0]
        : dirty
    const result = await Effect.runPromise(
        Server.renderToString(
            {
                init: () => ({ model }),
                view: (current: Model, h: HtmlBuilder<Message>) => ({
                    title: "Transactional email",
                    body: transactional_view(
                        template_id,
                        h,
                        publication_theme,
                        current,
                        (message) => message
                    ),
                }),
            },
            { buildId: "transactional-inline-test" }
        )
    )
    return result.html
}

test("places all copy controls in one themed canvas, with version actions outside", async () => {
    for (const template_id of TransactionalTemplateId.literals) {
        const html = await render(template_id)
        const canvas =
            html.match(
                /<section[^>]*aria-label="Transactional email editing canvas"[^>]*>[\s\S]*?<\/section>/
            )?.[0] ?? ""
        expect(canvas).toContain('name="subject"')
        expect(canvas).toContain('name="heading"')
        expect(canvas).toContain('name="introduction"')
        expect(canvas).toContain("Unsaved inline heading")
        expect(canvas).toContain("Publication brand")
        expect(canvas).toContain(
            publication_email_theme(publication_theme).content_background_color
        )
        expect(canvas).not.toContain("Save new version")
        expect(canvas).not.toContain("Activate saved version")
        expect(canvas).not.toContain('type="url"')
        expect(html).not.toContain("<iframe")
        expect(html).not.toContain("Draft copy")
        expect(html).toContain('role="switch"')
        expect(html).toContain('aria-checked="true"')
        expect(canvas).toContain(
            template_id === "auth_password_changed"
                ? "contact support immediately"
                : "This link expires in"
        )
    }
})

test("Edit off shows only the production iframe and retains unsaved draft copy", async () => {
    const html = await render("auth_password_reset", true)
    expect(html).toContain("<iframe")
    expect(html).toContain('sandbox=""')
    expect(html).toContain("Unsaved inline heading")
    expect(html).toContain('aria-checked="false"')
    expect(html).not.toContain('name="heading"')
    expect(html).not.toContain('name="introduction"')
    expect(html).not.toContain('name="subject"')
    expect(html).not.toContain(
        'aria-label="Transactional email editing canvas"'
    )
})

test("history exposes read-only copy and explicit restore controls outside the inline form", async () => {
    const template_id = "auth_password_reset"
    const copy = {
        ...default_transactional_copy(template_id),
        subject: "<script>history</script>",
    }
    const state = {
        template_id,
        latest: { version: 2, copy },
        active: { version: 1, copy },
    } satisfies import("@urm/email/transactional-content").TransactionalTemplateState
    const [loaded] = update(
        init("domain-a"),
        LoadedTransactionalTemplates({ states: [state] })
    )
    const [loading] = update(
        loaded,
        RequestedTransactionalHistory({ template_id, older: false })
    )
    const request_id =
        loading.editors.find((editor) => editor.template_id === template_id)
            ?.history.request_id ?? -1
    const [model] = update(
        loading,
        LoadedTransactionalHistory({
            domain_id: "domain-a",
            template_id,
            request_id,
            before_version: null,
            page: {
                versions: [
                    {
                        version: 1,
                        copy,
                        created_at: 1,
                        restored_from_version: 0,
                    },
                ],
                next_before_version: 1,
            },
        })
    )
    const result = await Effect.runPromise(
        Server.renderToString(
            {
                init: () => ({ model }),
                view: (current: Model, h: HtmlBuilder<Message>) => {
                    const editor = current.editors.find(
                        (entry) => entry.template_id === template_id
                    )
                    return {
                        title: "History",
                        body:
                            editor === undefined
                                ? h.div([], [])
                                : transactional_history_view(
                                      editor,
                                      state,
                                      true,
                                      h,
                                      (message) => message
                                  ),
                    }
                },
            },
            { buildId: "transactional-history-test" }
        )
    )
    expect(result.html).toContain("Version 1 · Active")
    expect(result.html).toContain("Restored from built-in copy.")
    expect(result.html).toContain("Restore version 1 as new saved version")
    expect(result.html).toContain("Load older versions")
    expect(result.html).toContain("&lt;script&gt;history&lt;/script&gt;")
    expect(result.html).not.toContain("<input")
    expect(result.html).not.toContain("<textarea")
    expect(result.html).not.toContain("<form")
})
