import { Effect, Option } from "effect"
import { Server } from "foldkit/experimental"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"
import * as Issues from "@urm/features/issues/submodel"
import * as Events from "@urm/features/events/submodel"
import * as Projects from "./projects/projects-ui.ts"
import * as Layout from "./design/layout-submodel.ts"
import * as IssuesAdapter from "./issues/submodel.ts"
import * as ProjectsAdapter from "./projects/submodel.ts"

const url = Url.make({
    protocol: "https:",
    host: "urm.test",
    port: Option.none(),
    pathname: "/issues",
    search: Option.none(),
    hash: Option.none(),
})
const render = <Model, Message>(
    model: Model,
    view: (model: Model, h: HtmlBuilder<Message>) => Html
) =>
    Effect.runPromise(
        Server.renderToString(
            {
                init: () => ({ model, commands: [] }),
                view: (current: Model, h: HtmlBuilder<Message>) => ({
                    title: "Permissions",
                    body: view(current, h),
                }),
            },
            { buildId: "migration-permissions" }
        )
    ).then((result) => result.html)

describe("migration browsing permissions", () => {
    test("read-only Issues keeps search and view selection available", async () => {
        const model: Issues.ModelType = {
            ...Issues.init(url)[0],
            can_write: false,
            issuesLoaded: true,
        }
        const html = await render(
            model,
            (current, h: HtmlBuilder<Issues.MessageType>) =>
                h.submodel({
                    slotId: "issues",
                    model: current,
                    view: Issues.routedSubmodelView,
                    viewInputs: IssuesAdapter.hrefs,
                    toParentMessage: (message) => message,
                })
        )
        const search = html.match(/<input\b[^>]*id="issues-search"[^>]*>/)?.[0]
        expect(search).toBeDefined()
        expect(search).not.toContain("disabled")
        expect(html).not.toContain("<fieldset")
        expect(html).not.toContain("Add issue")
        const [filtered] = IssuesAdapter.update(
            { ...IssuesAdapter.init(url), can_write: false },
            { _tag: "SearchQueryChanged", value: "bug" }
        )
        expect(filtered.ui.searchQuery).toBe("bug")
    })
    test("read-only Projects disables task writes while retaining filters", async () => {
        const model: Projects.Model = {
            ...Projects.init({ _tag: "Project", project_slug: "example" }),
            can_write: false,
            opened_project_id: Option.some("project"),
            projects: [
                {
                    id: "project",
                    domain_id: "domain",
                    name: "Example",
                    slug: "example",
                    status: "active",
                    order: 0,
                    created_at: 1,
                    updated_at: 1,
                },
            ],
            tasks: [
                {
                    id: "task",
                    domain_id: "domain",
                    project_id: "project",
                    title: "Read me",
                    status: "active",
                    order: 0,
                    updated_at: 1,
                },
            ],
        }
        const html = await render(
            model,
            (current, h: HtmlBuilder<Projects.Message>) =>
                h.submodel({
                    slotId: "projects",
                    model: current,
                    view: Projects.view,
                    viewInputs: { tags: [], entity_tags: [] },
                    toParentMessage: (message) => message,
                })
        )
        expect(html.match(/<input\b[^>]*id="task-task"[^>]*>/)?.[0]).toContain(
            "disabled"
        )
        const filters = [
            ...html.matchAll(
                /<button\b([^>]*)>(All|Active|Completed)<\/button>/g
            ),
        ]
        expect(filters).toHaveLength(3)
        for (const filter of filters)
            expect(filter[1]).not.toContain("disabled")
        const [filtered] = ProjectsAdapter.update(
            { ...ProjectsAdapter.init({ _tag: "Projects" }), pending: true },
            { _tag: "SelectedTaskFilter", filter: "Completed" }
        )
        expect(filtered.ui.task_filter).toBe("Completed")
        expect(filtered.pending).toBe(true)
    })
    test("read-only Events retains details and hides authoring entry points", async () => {
        const model: Events.ModelType = {
            ...Events.init("/events")[0],
            can_write: false,
            loadingEvents: false,
        }
        const html = await render(
            model,
            (current, h: HtmlBuilder<Events.MessageType>) =>
                h.submodel({
                    slotId: "events",
                    model: current,
                    view: Events.view,
                    toParentMessage: (message) => message,
                })
        )
        expect(html).not.toContain("<fieldset")
        expect(
            html.match(/<a\b[^>]*href="[^"]*events\/new[^"]*"[^>]*>/)?.[0]
        ).toContain("hidden")
    })
    test("preview browsing preserves an in-flight save and read-only mutation guards", () => {
        const model = { ...Layout.init(url), can_write: false, pending: true }
        const [preview] = Layout.update(
            model,
            Layout.GotLayoutEditorMessage({
                message: { _tag: "ToggledPreview" },
            }),
            Option.none(),
            []
        )
        expect(preview.ui.editor.is_preview_open).toBe(
            !model.ui.editor.is_preview_open
        )
        expect(preview.pending).toBe(true)
        expect(
            Layout.update(
                model,
                Layout.GotLayoutEditorMessage({
                    message: { _tag: "RequestedSaveSiteAppearance" },
                }),
                Option.none(),
                []
            )[1]
        ).toEqual([])
    })
})
