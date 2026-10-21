import { Effect, Option, Schema } from "effect"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"
import { expect, test } from "vitest"
import { Preview } from "./data.ts"
import { prepare_preview } from "./prepare.ts"
import { view } from "./view.ts"
import {
    init,
    GotDocumentationTabsMessage,
    GotAutocompleteMessage,
    GotSourceDropdownMessage,
    restore_query,
    update,
    ChangedQuery,
    update_with_commands,
} from "./model.ts"
import type { Model, Message } from "./model.ts"
import { GotTabsMessage } from "../../documents/documentation/tabs.ts"

const preview = Schema.decodeUnknownSync(Preview)(
    prepare_preview({
        snapshot: "tabs",
        files: [{ path: "topic.ts", text: "unmatched" }],
        diagnostics: [],
        sections: [
            {
                id: "example",
                path: "topic.md",
                title: "Inputs",
                page_title: "Topic",
                associations: [],
                text: [
                    '::::Tabs{labels="First,Second"}',
                    ":::TabItem",
                    "First panel content.",
                    ":::",
                    ":::TabItem",
                    "Second panel content.",
                    ":::",
                    "::::",
                ].join("\n\n"),
            },
            {
                id: "other",
                path: "topic.md",
                title: "Outputs",
                page_title: "Topic",
                associations: [],
                text: "Output guidance.",
            },
        ],
    })
)
const render = async (model: Model, source_preview: Preview = preview) =>
    (
        await Effect.runPromise(
            Server.renderToString(
                {
                    init: () => ({ model, commands: [] }),
                    view: (current: Model, h: HtmlBuilder<Message>) => ({
                        title: "Grep",
                        body: view(current, source_preview, h),
                    }),
                },
                { buildId: "grep-tabs-test" }
            )
        )
    ).html

test("groups sections by page and runs the shared tab selection with focus commands", async () => {
    const model = { ...init(), query: "topic" }
    const first = await render(model)
    expect(first.match(/<article\b/g)).toHaveLength(1)
    expect(first).toContain('role="tablist"')
    expect(first).toContain("First panel content.")
    expect(first).not.toContain("Second panel content.")
    expect(first).toContain("Output guidance.")
    const [selected, commands] = update_with_commands(
        model,
        GotDocumentationTabsMessage({
            id: "grep-tabs-example-0",
            message: GotTabsMessage({
                message: Schema.decodeUnknownSync(Ui.Tabs.Message)({
                    _tag: "SelectedTab",
                    index: 1,
                    value: "Second",
                }),
            }),
        })
    )
    expect(commands.length).toBeGreaterThan(0)
    const second = await render(selected)
    expect(second).toContain("Second panel content.")
    expect(second).not.toContain("First panel content.")
})

test("autocomplete renders themed options and preserves free text and selection", async () => {
    const initial = { ...init(), query: "topic" }
    const [typing] = update_with_commands(
        initial,
        GotAutocompleteMessage({
            message: Schema.decodeUnknownSync(Ui.Combobox.Message)({
                _tag: "UpdatedInputValue",
                value: "top",
            }),
        })
    )
    expect(typing.query).toBe("top")
    const [opened] = update_with_commands(
        typing,
        GotAutocompleteMessage({
            message: Schema.decodeUnknownSync(Ui.Combobox.Message)({
                _tag: "Opened",
                maybeActiveItemIndex: Option.none(),
            }),
        })
    )
    const html = await render(opened)
    expect(html).toContain('role="combobox"')
    expect(html).toContain("grep-topic-options")
    expect(html).toContain("grep-topic-option")
    expect(html).not.toContain("<datalist")
    const [selected] = update_with_commands(
        typing,
        GotAutocompleteMessage({
            message: Schema.decodeUnknownSync(Ui.Combobox.Message)({
                _tag: "SelectedItem",
                item: "Topic",
                displayText: "Topic",
                wasSelected: false,
            }),
        })
    )
    expect(selected.query).toBe("Topic")
    expect(selected.doc_offset).toBe(0)
})

test("initial, restored and explicitly changed queries stay visible in the combobox", async () => {
    const initial = init()
    expect(initial.autocomplete.inputValue).toBe(initial.query)
    const restored = restore_query(initial, "Schema.Literals")
    expect(restored.autocomplete.inputValue).toBe("Schema.Literals")
    const changed = update(
        restored,
        ChangedQuery({ query: "decodeDocumentContent" })
    )
    expect(changed.autocomplete.inputValue).toBe(changed.query)
    expect(await render(restored)).toContain('value="Schema.Literals"')
})

test("remote searches render accessible, motion-safe skeletons until results arrive", async () => {
    const remote_preview = Schema.decodeUnknownSync(Preview)({
        snapshot: "remote",
        files: [],
        diagnostics: [],
        sections: [],
    })
    const html = await render(init(), remote_preview)

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain("Searching…")
    expect(html).toContain('data-skeleton="documentation-result"')
    expect(html).toContain('data-skeleton="code-result"')
    expect(html).toContain("motion-safe:animate-pulse")
    expect(html).not.toContain("Loading documentation…")
    expect(html).not.toContain("Loading repository code…")
})

test("documentation source uses a themed Foldkit listbox and selects Foldkit without changing the code query", async () => {
    const initial = init("Combobox")
    const [opened] = update_with_commands(
        initial,
        GotSourceDropdownMessage({
            message: Schema.decodeUnknownSync(Ui.Listbox.Message)({
                _tag: "Opened",
                maybeActiveItemIndex: Option.none(),
            }),
        })
    )
    const html = await render(opened)
    expect(html).not.toContain("<select")
    expect(html).toContain('role="listbox"')
    expect(html).toContain("Foldkit")
    expect(html).toContain("grep-topic-options")
    expect(html.match(/lg:h-\[calc\(100vh-16rem\)\]/g)).toHaveLength(2)
    expect(html.indexOf("Repository code")).toBeLessThan(
        html.indexOf("Repository source")
    )
    const [selected, commands] = update_with_commands(
        opened,
        GotSourceDropdownMessage({
            message: Schema.decodeUnknownSync(Ui.Listbox.Message)({
                _tag: "SelectedItem",
                item: "foldkit",
            }),
        })
    )
    expect(selected.doc_source).toBe("foldkit")
    expect(selected.query).toBe("Combobox")
    expect(commands.length).toBeGreaterThan(0)
})
