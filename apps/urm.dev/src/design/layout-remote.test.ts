import { Option } from "effect"
import { Url } from "foldkit/url"
import { Remote } from "foldkit-remote"
import { describe, expect, test } from "vitest"
import * as Layout from "./layout-submodel.ts"
const url = Url.make({
    protocol: "https:",
    host: "urm.test",
    port: Option.none(),
    pathname: "/design/layouts/main-layout",
    search: Option.none(),
    hash: Option.none(),
})
const scope = { account_id: "account", domain_id: "domain", can_write: true }
describe("PostgreSQL publication layout state", () => {
    test("treats the selected PostgreSQL domain as the root site", () => {
        const [model] = Layout.synchronize(Layout.init(url), scope)
        const assigned = Layout.with_publications(model, Option.none(), [], {
            id: scope.domain_id,
            name: "Test 1",
            slug: "test1",
        })
        expect(assigned.ui.editor.sites).toEqual([
            expect.objectContaining({
                id: scope.domain_id,
                domain_id: scope.domain_id,
                name: "Test 1",
                slug: "test1",
            }),
        ])
        expect(assigned.ui.editor.selected_owner_id).toEqual(
            Option.some(scope.domain_id)
        )
    })

    test("loads once and discards old workspace results and drafts", () => {
        const [loading, commands] = Layout.synchronize(Layout.init(url), scope)
        expect(commands[0]?.name).toBe("LoadPublicationConfiguration")
        expect(Layout.synchronize(loading, scope)[1]).toEqual([])
        const draft = {
            ...loading,
            ui: {
                ...loading.ui,
                editor: { ...loading.ui.editor, site_title: "Private draft" },
            },
        }
        const [switched] = Layout.synchronize(draft, {
            ...scope,
            domain_id: "other",
        })
        expect(switched.ui.editor.site_title).not.toBe("Private draft")
        expect(switched.ui).not.toHaveProperty("layout")
        expect(switched.ui.editor).not.toHaveProperty("pages")
        expect(
            Layout.update(
                switched,
                {
                    _tag: "ConfigurationLoaded",
                    epoch: loading.epoch,
                    remote: Remote.initial,
                    mode: "load",
                    asset_url: null,
                },
                Option.none(),
                []
            )[0]
        ).toBe(switched)
    })
    test("rejects old adapter results, unknown owners and pre-load writes", () => {
        const [model] = Layout.synchronize(Layout.init(url), scope)
        expect(
            Layout.update(
                model,
                { _tag: "RequestedInitializePublicationNavigation" },
                Option.none(),
                []
            )[1]
        ).toEqual([])
        expect(
            Layout.update(
                model,
                { _tag: "LoadedPublicationLayout", layout: null },
                Option.none(),
                []
            )[0]
        ).toBe(model)
        expect(
            Layout.update(
                model,
                Layout.GotLayoutEditorMessage({
                    message: {
                        _tag: "AssignedMainLayoutOwner",
                        owner_id: "missing",
                    },
                }),
                Option.none(),
                []
            )[0]
        ).toBe(model)
    })
})
