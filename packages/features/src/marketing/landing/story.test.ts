import { Scene, Story } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { FileDrop } from "@foldkit/ui"
import { SyncedRichTextEditorPlainText } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import { describe, expect, test } from "vitest"
import { copy_text } from "./copy.ts"
import {
    AddedBlock,
    AddedBlockItem,
    ChangedMotion,
    ClearedHeroImage,
    ClickedCancel,
    ClickedEdit,
    ClickedSave,
    ClickedSaveTemplate,
    GotHeroImageDropMessage,
    GotLandingRichTextEditorMessage,
    RemovedBlock,
    RemovedBlockItem,
    SelectedHeroImage,
    SelectedLogoImage,
    type Message,
    ToggledMotionPreview,
    UpdatedBlockItem,
    UpdatedCopy,
    UpdatedTemplateName,
} from "./message.ts"
import type { Model } from "./model.ts"
import {
    init,
    landing_page_document,
    loaded_page_content,
    update,
} from "./update.ts"
import { view } from "./view.ts"
import {
    blankLandingEditorHref,
    editorPresetForPath,
    isLandingEditorPath,
    landingEditorPageId,
    landingEditorHref,
} from "./index.ts"

const initial_model = init()[0]
const standalone_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    view(model, (message) => message, h)
const dark_site_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    view(model, (message) => message, h, [], {
        theme_id: "default",
        appearance: "dark",
    })
const media_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    view(model, (message) => message, h, [
        {
            id: "image-1",
            url: "https://example.com/hero.jpg",
            alt: "People meeting",
            text: "",
            order_position: 0,
            updated_at: 1,
        },
    ])
const edit_toggle = Scene.role("switch", { name: "Edit page" })

describe("landing editor", () => {
    test("scopes the publication theme to the landing canvas", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: dark_site_view,
            },
            Scene.given(initial_model),
            Scene.expect(
                Scene.selector(
                    'main .site-appearance-preview[data-site-appearance="dark"]'
                )
            ).toExist()
        )
    })

    test("uses canonical Web creation and Content item routes", () => {
        expect(landingEditorHref()).toBe("/web/pages/new?kind=urm_marketing")
        expect(blankLandingEditorHref()).toBe(
            "/web/pages/new?kind=landing_blank"
        )
        expect(blankLandingEditorHref("page-1")).toBe(
            "/content/web/page-1?mode=edit"
        )
        expect(landingEditorPageId("/marketing/layouts/blank/page-1/")).toBe(
            "page-1"
        )
        expect(landingEditorPageId("/content/web/page-1")).toBe("page-1")
        expect(isLandingEditorPath("/marketing/layouts/urm")).toBe(true)
        expect(isLandingEditorPath("/marketing/layouts/blank")).toBe(true)
        expect(isLandingEditorPath("/labs/marketing/landing")).toBe(true)
        expect(isLandingEditorPath("/labs/documents/landing")).toBe(false)
    })

    test("starts the build-from-scratch editor without blocks", () => {
        const model = init(editorPresetForPath("/marketing/layouts/blank/"))[0]

        expect(model.preset).toBe("blank")
        expect(model.blocks).toEqual([])
        expect(model.saved_blocks).toEqual([])
    })

    test("serializes an added intro block into the selected page", () => {
        const loaded = loaded_page_content(
            init("blank")[0],
            "page-1",
            JSON.stringify({ schema_version: 1, blocks: [] })
        )
        const [with_intro] = update(loaded, AddedBlock({ section: "intro" }))

        expect(landing_page_document(with_intro).blocks).toMatchObject([
            {
                _tag: "Intro",
                id: "intro",
                heading: expect.any(String),
                body: expect.any(String),
            },
        ])
    })

    test("toggles editing with the Foldkit switch state", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standalone_view,
            },
            Scene.given(initial_model),
            Scene.expect(edit_toggle).toHaveAttr("aria-checked", "false"),
            Scene.expect(Scene.selector("[data-switch-track]")).toExist(),
            Scene.expect(Scene.selector("[data-switch-thumb]")).toExist(),
            Scene.expect(Scene.text("Save draft")).toBeAbsent(),
            Scene.click(edit_toggle),
            Scene.expect(edit_toggle).toHaveAttr("aria-checked", "true"),
            Scene.expect(Scene.text("Save draft")).toExist(),
            Scene.click(edit_toggle),
            Scene.expect(edit_toggle).toHaveAttr("aria-checked", "false"),
            Scene.expect(Scene.text("Save draft")).toBeAbsent()
        )
    })

    test("saving keeps the edited copy", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(initial_model),
            Story.message(ClickedEdit()),
            Story.message(
                UpdatedCopy({ key: "hero_title", text: "A new headline" })
            ),
            Story.message(ClickedSave()),
            Story.model((model) => {
                expect(model.editor_state._tag).toBe("Viewing")
                expect(copy_text(model.drafts, "hero_title")).toBe(
                    "A new headline"
                )
                expect(copy_text(model.saved_snapshot, "hero_title")).toBe(
                    "A new headline"
                )
            })
        )
    })

    test("persists the selected page motion and restores it on cancel", () => {
        const [changed] = update(
            initial_model,
            ChangedMotion({ motion: "fade" })
        )
        const [saved] = update(changed, ClickedSave())
        const [changed_again] = update(saved, ChangedMotion({ motion: "none" }))
        const [cancelled] = update(changed_again, ClickedCancel())

        expect(landing_page_document(saved).motion).toBe("fade")
        expect(cancelled.motion).toBe("fade")
    })

    test("keeps motion still while editing until preview is enabled", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standalone_view,
            },
            Scene.given(initial_model),
            Scene.expect(
                Scene.selector('[data-landing-motion="stagger"]')
            ).toExist(),
            Scene.click(edit_toggle),
            Scene.expect(Scene.label("Motion")).toExist(),
            Scene.expect(
                Scene.role("button", {
                    name: "Preview motion",
                    pressed: false,
                })
            ).toExist(),
            Scene.expect(
                Scene.selector('[data-landing-motion="none"]')
            ).toExist(),
            Scene.expect(
                Scene.selector('[data-landing-motion-preview="false"]')
            ).toExist(),
            Scene.click(
                Scene.role("button", {
                    name: "Preview motion",
                    pressed: false,
                })
            ),
            Scene.expect(
                Scene.selector('[data-landing-motion="stagger"]')
            ).toExist(),
            Scene.expect(
                Scene.selector('[data-landing-motion-preview="true"]')
            ).toExist()
        )

        const [previewing] = update(initial_model, ToggledMotionPreview())
        expect(previewing.preview_motion).toBe(true)
    })

    test("cancelling restores the saved snapshot", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(initial_model),
            Story.message(ClickedEdit()),
            Story.message(
                UpdatedCopy({ key: "hero_title", text: "Discard this" })
            ),
            Story.message(ClickedCancel()),
            Story.model((model) => {
                expect(model.editor_state._tag).toBe("Viewing")
                expect(copy_text(model.drafts, "hero_title")).toBe(
                    copy_text(initial_model.saved_snapshot, "hero_title")
                )
            })
        )
    })

    test("adds, removes, saves, and restores page blocks", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(initial_model),
            Story.message(ClickedEdit()),
            Story.message(RemovedBlock({ section: "pricing" })),
            Story.message(ClickedSave()),
            Story.message(ClickedEdit()),
            Story.message(AddedBlock({ section: "pricing" })),
            Story.message(ClickedCancel()),
            Story.model((model) => {
                expect(model.blocks).not.toContain("pricing")
                expect(model.saved_blocks).not.toContain("pricing")
            })
        )
    })

    test("edits repeatable content inline and serializes it", () => {
        const loaded = loaded_page_content(
            init("blank")[0],
            "page-1",
            JSON.stringify({
                schema_version: 1,
                blocks: [
                    {
                        _tag: "FeatureGrid",
                        id: "features",
                        heading: "Features",
                        items: [{ heading: "Original", body: "Original body" }],
                    },
                ],
            })
        )
        const [edited] = update(
            loaded,
            UpdatedBlockItem({
                section: "features",
                index: 0,
                field: "first",
                text: "Edited inline",
            })
        )
        const [with_second] = update(
            edited,
            AddedBlockItem({ section: "features" })
        )

        expect(landing_page_document(with_second).blocks).toMatchObject([
            {
                _tag: "FeatureGrid",
                items: [
                    { heading: "Edited inline", body: "Original body" },
                    {
                        heading: "Feature title",
                        body: "Describe this feature.",
                    },
                ],
            },
        ])
    })

    test("cancelling restores repeatable content", () => {
        const [editing] = update(initial_model, ClickedEdit())
        const [removed] = update(
            editing,
            RemovedBlockItem({ section: "faq", index: 0 })
        )
        const [cancelled] = update(removed, ClickedCancel())

        expect(cancelled.block_items.faq).toEqual(initial_model.block_items.faq)
    })

    test("edits actions inline and keeps their links and styles", () => {
        const [edited_label] = update(
            initial_model,
            UpdatedBlockItem({
                section: "hero",
                index: 0,
                field: "first",
                text: "Start here",
            })
        )
        const [edited_href] = update(
            edited_label,
            UpdatedBlockItem({
                section: "hero",
                index: 0,
                field: "second",
                text: "/start/",
            })
        )

        expect(landing_page_document(edited_href).blocks[0]).toMatchObject({
            _tag: "Hero",
            actions: [
                { label: "Start here", href: "/start/", style: "primary" },
                { label: "Learn more", href: "#features", style: "link" },
            ],
        })
    })

    test("selects and clears a domain hero image", () => {
        const [selected] = update(
            initial_model,
            SelectedHeroImage({ image_id: "image-1", alt: "People meeting" })
        )
        expect(landing_page_document(selected).blocks[0]).toMatchObject({
            _tag: "Hero",
            image: {
                _tag: "DomainImage",
                image_id: "image-1",
                alt: "People meeting",
            },
        })

        const [cleared] = update(selected, ClearedHeroImage())
        expect(landing_page_document(cleared).blocks[0]).not.toHaveProperty(
            "image"
        )
    })

    test("authors rich text as a structural landing block", () => {
        const blank = init("blank")[0]
        const [with_block] = update(blank, AddedBlock({ section: "rich_text" }))
        const [edited] = update(
            with_block,
            GotLandingRichTextEditorMessage({
                message: SyncedRichTextEditorPlainText({
                    value: "A directly edited introduction.",
                    start: 31,
                    end: 31,
                }),
            })
        )

        expect(landing_page_document(edited).blocks).toMatchObject([
            {
                _tag: "RichText",
                document: {
                    children: [
                        {
                            type: "paragraph",
                            children: [
                                {
                                    type: "text",
                                    text: "A directly edited introduction.",
                                },
                            ],
                        },
                    ],
                },
            },
        ])
    })

    test("uses domain media for editable logo grids", () => {
        const [selected] = update(
            initial_model,
            SelectedLogoImage({
                index: 0,
                image_id: "image-1",
                alt: "Partner logo",
            })
        )
        const integrations = landing_page_document(selected).blocks.find(
            (block) => block._tag === "LogoGrid"
        )

        expect(
            integrations?._tag === "LogoGrid"
                ? integrations.logos[0]
                : undefined
        ).toMatchObject({
            name: "Bento",
            image: {
                _tag: "DomainImage",
                image_id: "image-1",
                alt: "Partner logo",
            },
        })
    })

    test("requires a name before saving an organization template", () => {
        const [invalid] = update(initial_model, ClickedSaveTemplate())
        expect(invalid.template_save_status).toBe("error")

        const [named] = update(
            invalid,
            UpdatedTemplateName({ value: "Campaign layout" })
        )
        const [saving] = update(named, ClickedSaveTemplate())
        expect(saving.template_save_status).toBe("saving")
        expect(saving.template_name).toBe("Campaign layout")
    })

    test("turns the hero artwork into an upload and library picker", () => {
        const hero_file = new globalThis.File(["image"], "hero.png", {
            type: "image/png",
        })

        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: media_view,
            },
            Scene.given(initial_model),
            Scene.expect(Scene.text("Choose from library")).toBeAbsent(),
            Scene.click(edit_toggle),
            Scene.expect(Scene.label("Upload image")).toExist(),
            Scene.expect(
                Scene.role("button", { name: "Choose from library" })
            ).toExist(),
            Scene.click(Scene.role("button", { name: "Choose from library" })),
            Scene.expect(Scene.text("Domain image library")).toExist(),
            Scene.expect(
                Scene.role("button", {
                    name: "Use People meeting as the hero image",
                })
            ).toExist(),
            Scene.expect(
                Scene.selector("[data-hero-placeholder-toolbar]")
            ).toExist(),
            Scene.click(
                Scene.role("button", {
                    name: "Use People meeting as the hero image",
                })
            ),
            Scene.expect(
                Scene.selector("[data-hero-placeholder-toolbar]")
            ).toBeAbsent()
        )

        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(initial_model),
            Story.message(ClickedEdit()),
            Story.message(
                GotHeroImageDropMessage({
                    message: FileDrop.Message.DroppedFiles({
                        files: [hero_file],
                    }),
                })
            ),
            Story.model((model) => {
                expect(model.hero_image_upload_busy).toBe(true)
            })
        )
    })

    test("shows repeatable controls inside the visual canvas", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standalone_view,
            },
            Scene.given(initial_model),
            Scene.click(edit_toggle),
            Scene.expect(Scene.label("Feature 1 heading")).toExist(),
            Scene.expect(Scene.label("Feature 1 body")).toExist(),
            Scene.expect(
                Scene.role("button", { name: "Add feature" })
            ).toExist(),
            Scene.expect(Scene.label("FAQ 1 question")).toExist(),
            Scene.expect(Scene.label("FAQ 1 answer")).toExist(),
            Scene.expect(Scene.label("hero action 1 label")).toExist(),
            Scene.expect(Scene.label("hero action 1 URL")).toExist(),
            Scene.expect(
                Scene.role("button", { name: "Add call-to-action button" })
            ).toExist(),
            Scene.expect(
                Scene.role("button", { name: "Add question" })
            ).toExist()
        )
    })
})
