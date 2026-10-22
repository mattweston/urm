import { describe, expect, test } from "vitest"
import { Option } from "effect"
import { Url } from "foldkit/url"
import { init } from "@urm/features/labs/dev/submodel"
import { grep_url_href } from "@urm/features/labs/dev/grep/route"
import { restore_grep_route } from "./grep-route.ts"
import { routeForUrl, sidebarRouteTag } from "./routing/route.ts"
import * as Client from "./main.ts"
import { ChangedUrl } from "./routing/message.ts"

const url_for = (href: string) => {
    const browser_url = new URL(href, "http://app.localhost:1420")
    const search = browser_url.search.replace(/^\?/, "")
    return Url.make({
        protocol: "http:",
        host: "app.localhost",
        port: Option.some("1420"),
        pathname: browser_url.pathname,
        search: search === "" ? Option.none() : Option.some(search),
        hash: Option.none(),
    })
}

describe("Grep query URLs", () => {
    test("the client forwards edits to navigation and restores history without unrelated commands", () => {
        const initial = Client.init(url_for("/dev/grep?q=Schema.Struct")).model
        const { model: edited, commands } = Client.update(
            initial,
            Client.GotDevMessage({
                message: {
                    _tag: "GotGrepMessage",
                    message: { _tag: "ChangedQuery", query: "Effect" },
                },
            })
        )
        expect(edited.dev.grep.query).toBe("Effect")
        expect(commands ?? []).toHaveLength(1)
        const { model: expanded } = Client.update(
            edited,
            Client.GotDevMessage({
                message: {
                    _tag: "GotGrepMessage",
                    message: { _tag: "ShowMoreFiles" },
                },
            })
        )
        const { model: same, commands: same_commands } = Client.update(
            expanded,
            ChangedUrl({ url: url_for("/dev/grep?q=Effect") })
        )
        expect(same.dev.grep.visible_files).toBe(20)
        expect(same_commands ?? []).toEqual([])
        const { model: restored, commands: restored_commands } = Client.update(
            same,
            ChangedUrl({ url: url_for("/dev/grep?q=Schema.Struct") })
        )
        expect(restored.dev.grep.query).toBe("Schema.Struct")
        expect(restored.dev.grep.visible_files).toBe(10)
        expect(restored_commands ?? []).toEqual([])
    })
    test.each(["Schema.Struct", "=>", "a+b & c?#/", " ", "", "😀"])(
        "round-trips the literal %j without changing route",
        (query) => {
            const url = url_for(grep_url_href(query))
            expect(restore_grep_route(init()[0], url).grep.query).toBe(query)
            expect(routeForUrl(url)).toEqual({
                _tag: "Dev",
                dev_path: "/dev/grep",
            })
            expect(sidebarRouteTag(routeForUrl(url))).toBe("DevGrep")
        }
    )
    test("restores linked searches, resets query-specific expansion and ignores other routes", () => {
        const original = init()[0]
        const linked = restore_grep_route(
            original,
            url_for("/dev/grep/?q=Effect")
        )
        expect(linked.grep.query).toBe("Effect")
        expect(
            restore_grep_route(linked, url_for("/dev/grep")).grep.query
        ).toBe("Schema.Struct")
        expect(
            restore_grep_route(linked, url_for("/dev/kbd-shortcuts?q=other"))
        ).toBe(linked)
    })
})

test("documentation navigation round-trips search pages, selection and snapshot through browser history", () => {
    const state = {
        query: "Contact",
        selected: "contacts.ts:40:3",
        file_offset: 20,
        match_offsets: { "contacts.ts": 40 },
        doc_offset: 20,
        snapshot: "pinned",
        doc_source: "urm",
    }
    const original = init()[0]
    const search_url = url_for(
        grep_url_href(state.query, { ...state, doc_source: "urm" })
    )
    const search = restore_grep_route(original, search_url)
    const linked = restore_grep_route(
        search,
        url_for(
            grep_url_href(state.query, {
                ...state,
                doc_source: "urm",
                doc_offset: 0,
                doc_path: "docs/domain/schemas/contact.md",
                doc_heading: "Contact",
            })
        )
    )
    expect(linked.grep.doc_path).toBe("docs/domain/schemas/contact.md")
    expect(linked.grep.query).toBe("Contact")
    const back = restore_grep_route(linked, search_url)
    expect(back.grep).toEqual(search.grep)
    expect(back.grep.visible_files).toBe(30)
    expect(back.grep.match_limits["contacts.ts"]).toBe(60)
    expect(back.grep.doc_offset).toBe(20)
    expect(back.grep.selected).toBe(state.selected)
    expect(back.grep.navigation_snapshot).toBe("pinned")
    expect(
        restore_grep_route(original, url_for("/dev/grep?q=Email&state=invalid"))
            .grep.query
    ).toBe("Email")
})
