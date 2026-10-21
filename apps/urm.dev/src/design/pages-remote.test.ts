import { Option } from "effect"
import { Url } from "foldkit/url"
import { Remote } from "foldkit-remote"
import { describe, expect, test } from "vitest"
import * as Pages from "./pages-submodel.ts"
const url = (path: string) =>
    Url.make({
        protocol: "https:",
        host: "urm.test",
        port: Option.none(),
        pathname: path,
        search: Option.none(),
        hash: Option.none(),
    })
const scope = { account_id: "account", domain_id: "domain", can_write: true }
describe("PostgreSQL Pages state", () => {
    test("returning from layout preview preserves the loaded Pages state", () => {
        const [loading] = Pages.synchronize(
            Pages.init(url("/web/pages")),
            scope
        )
        const ready = {
            ...loading,
            pending: false,
            ui: { ...loading.ui, is_loading: false },
        }
        const [away] = Pages.update(
            ready,
            Pages.ChangedUrl({ url: url("/design/layouts/main-layout") })
        )
        const [returned, commands] = Pages.update(
            away,
            Pages.ChangedUrl({ url: url("/web/pages") })
        )
        expect(returned.ui.is_loading).toBe(false)
        expect(returned.remote).toBe(ready.remote)
        expect(commands).toEqual([])
    })
    test("a load failure after route navigation ends loading", () => {
        const [loading] = Pages.synchronize(
            Pages.init(url("/web/pages")),
            scope
        )
        const [navigated] = Pages.update(
            loading,
            Pages.ChangedUrl({ url: url("/web/pages/new") })
        )
        const [failed] = Pages.update(navigated, {
            _tag: "PagesFailed",
            epoch: loading.epoch,
            editor_epoch: loading.editor_epoch,
            error: "Unavailable",
        })
        expect(failed.ui.is_loading).toBe(false)
        expect(failed.pending).toBe(false)
        expect(Option.getOrNull(failed.ui.error)).toBe("Unavailable")
    })
    test("loads once, discards scoped drafts and rejects late owner responses", () => {
        const [loading, commands] = Pages.synchronize(
            Pages.init(url("/web/pages/new")),
            scope
        )
        expect(commands[0]?.name).toBe("LoadPagesLibrary")
        expect(Pages.synchronize(loading, scope)[1]).toEqual([])
        const ready = {
            ...loading,
            pending: false,
            ui: { ...loading.ui, is_loading: false },
        }
        const [draft] = Pages.update(ready, {
            _tag: "ChangedNewPageTitle",
            value: "Draft",
        })
        expect(draft.ui.new_page_title).toBe("Draft")
        expect(draft.ui).not.toHaveProperty("pages")
        const [switched, requests] = Pages.update(
            draft,
            Pages.ChangedUrl({ url: url("/web/pages/subdomains/docs/new") })
        )
        expect(switched.subdomain_slug).toBe("docs")
        expect(switched.ui.new_page_title).toBe("")
        expect(requests[0]?.name).toBe("LoadPagesLibrary")
        expect(
            Pages.update(switched, {
                _tag: "PagesLoaded",
                epoch: ready.epoch,
                editor_epoch: ready.editor_epoch,
                remote: Remote.initial,
                saved: false,
                created_template_id: null,
            })[0]
        ).toBe(switched)
    })
    test("blocks writes before loading and when read-only", () => {
        const [loading] = Pages.synchronize(
            Pages.init(url("/web/pages/new")),
            scope
        )
        expect(Pages.update(loading, { _tag: "SubmittedNewPage" })[1]).toEqual(
            []
        )
        const readonly = {
            ...loading,
            pending: false,
            can_write: false,
            ui: { ...loading.ui, is_loading: false, new_page_title: "Page" },
        }
        expect(Pages.update(readonly, { _tag: "SubmittedNewPage" })[1]).toEqual(
            []
        )
    })
    test("keeps drafts after failure and ignores success from an older editor", () => {
        const [model] = Pages.synchronize(
            Pages.init(url("/web/pages/new")),
            scope
        )
        const draft = { ...model, ui: { ...model.ui, new_page_title: "Keep" } }
        const [failed] = Pages.update(draft, {
            _tag: "PagesFailed",
            epoch: model.epoch,
            editor_epoch: model.editor_epoch,
            error: "Failed",
        })
        expect(failed.ui.new_page_title).toBe("Keep")
        expect(failed.pending).toBe(false)
        const [late] = Pages.update(
            { ...draft, editor_epoch: draft.editor_epoch + 1 },
            {
                _tag: "PagesLoaded",
                epoch: model.epoch,
                editor_epoch: model.editor_epoch,
                remote: Remote.initial,
                saved: true,
                created_template_id: null,
            }
        )
        expect(late.ui.new_page_title).toBe("Keep")
    })
})
