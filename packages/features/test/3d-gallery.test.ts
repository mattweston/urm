import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { init, update } from "../src/labs/3d-gallery-edit/gallery.update.ts"
import { frames, GOLDEN_RATIO } from "../src/labs/3d-gallery-edit/images.ts"
import {
    default_image_settings,
    image_layout,
} from "../src/labs/3d-gallery-edit/gallery.presentation.ts"
import * as Message from "../src/labs/3d-gallery-edit/gallery.message.ts"

describe("3D gallery", () => {
    it("browses in both directions from the overview and wraps without opening the editor", () => {
        const [initial] = init()
        const [first] = update(
            initial,
            Message.ClickedBrowseArtwork({ direction: 1 })
        )
        const [last] = update(
            first,
            Message.ClickedBrowseArtwork({ direction: -1 })
        )
        expect(Option.getOrUndefined(first.selectedFrameKey)).toBe(
            frames[0]?.key
        )
        expect(Option.getOrUndefined(last.selectedFrameKey)).toBe(
            frames.at(-1)?.key
        )
        expect(first.editing).toBe(false)
        const [editing] = update(first, Message.ClickedEditArtwork())
        expect(editing.editing).toBe(true)
        expect(
            update(editing, Message.ClickedBrowseArtwork({ direction: 1 }))[0]
                .editing
        ).toBe(false)
    })

    it("retains edits across details, grid, and artwork navigation and synchronizes plaques", () => {
        const [initial] = init()
        const [edited, commands] = update(
            initial,
            Message.ChangedGalleryText({
                frameKey: "bridge",
                field: "title",
                value: "New title",
            })
        )
        expect(
            commands.some((command) => command.name === "SyncGalleryScene")
        ).toBe(true)
        const [grid, grid_commands] = update(edited, Message.ToggledGridView())
        expect(
            grid_commands.find((command) => command.name === "SyncGalleryScene")
                ?.args
        ).toMatchObject({ active: false })
        const [details] = update(
            grid,
            Message.ClickedDetails({ frameKey: "bridge" })
        )
        const [browsing] = update(
            details,
            Message.ClickedFrame({ frameKey: "city" })
        )
        expect(browsing.textOverrides.bridge?.title).toBe("New title")
        expect(browsing.editing).toBe(false)
    })

    it("gives the artwork list and its details distinct routes", () => {
        const [initial] = init()
        const [list, list_commands] = update(initial, Message.ToggledGridView())
        expect(list.route._tag).toBe("Gallery3dEditArtworkList")
        expect(list.grid_view).toBe(true)
        expect(
            list_commands.find((command) => command.name === "NavigateGallery")
                ?.args
        ).toEqual({ href: "/labs/3d-gallery-edit/artworks/" })

        const [details, detail_commands] = update(
            list,
            Message.ClickedArtworkListItem({ frameKey: "bridge" })
        )
        expect(details.route._tag).toBe("Gallery3dEditArtworkDetails")
        expect(details.grid_view).toBe(true)
        expect(
            detail_commands.find(
                (command) => command.name === "NavigateGallery"
            )?.args
        ).toEqual({ href: "/labs/3d-gallery-edit/artworks/bridge/" })

        const [back] = update(details, Message.ClickedArtworkList())
        expect(back.route._tag).toBe("Gallery3dEditArtworkList")
        expect(Option.isNone(back.selectedFrameKey)).toBe(true)
    })

    it("reports initial failures and retries only failed artworks", () => {
        let [model] = init()
        for (const frame of frames) {
            ;[model] = update(
                model,
                Message.UpdatedTextureState({
                    frame_key: frame.key,
                    status: frame.key === "city" ? "failed" : "loaded",
                })
            )
        }
        expect(model.imagesState._tag).toBe("ImagesFailed")
        const [retrying, commands] = update(
            { ...model, scene_available: true },
            Message.ClickedRetryImages()
        )
        expect(retrying.imagesState._tag).toBe("ImagesLoading")
        expect(commands[0]?.args).toEqual({ frame_keys: ["city"] })
        const [loaded] = update(
            retrying,
            Message.UpdatedTextureState({ frame_key: "city", status: "loaded" })
        )
        expect(loaded.imagesState._tag).toBe("ImagesLoaded")
    })

    it("supports browsing and text editing when WebGL fails", () => {
        const [initial] = init()
        const [fallback] = update(
            initial,
            Message.FailedMountGallery({ reason: "No WebGL" })
        )
        expect(fallback.grid_view).toBe(true)
        const [selected, commands] = update(
            fallback,
            Message.ClickedFrame({ frameKey: "bridge" })
        )
        expect(commands.some((command) => command.name === "FocusFrame")).toBe(
            false
        )
        const [edited] = update(
            selected,
            Message.ChangedGalleryText({
                frameKey: "bridge",
                field: "artist",
                value: "Artist",
            })
        )
        expect(edited.textOverrides.bridge?.artist).toBe("Artist")
        const [failed] = update(
            edited,
            Message.UpdatedTextureState({
                frame_key: "bridge",
                status: "failed",
            })
        )
        const [retrying, retries] = update(failed, Message.ClickedRetryImages())
        expect(retrying.texture_states.bridge).toBe("loading")
        expect(retries).toEqual([])
    })

    it("prevents restore and retry from racing an image replacement", () => {
        const [initial] = init()
        const busy = {
            ...initial,
            image_busy: true,
            imageOverrides: { bridge: "blob:replacement" },
        }
        expect(
            update(
                busy,
                Message.ClickedRestoreFrameImage({ frameKey: "bridge" })
            )
        ).toEqual([busy, []])
        expect(update(busy, Message.ClickedRetryImages())).toEqual([busy, []])
        expect(
            update(
                busy,
                Message.FailedReplaceFrameImage({
                    frameKey: "bridge",
                    error: "Invalid image",
                })
            )[0].image_busy
        ).toBe(false)
    })
})

describe("artwork proportions", () => {
    it.each([
        [1600, 900],
        [900, 1600],
        [1000, 1000],
        [300, 1800],
    ])("fits %s × %s without stretching or cropping", (width, height) => {
        const layout = image_layout(width, height, default_image_settings)
        expect(layout.scale_x / (layout.scale_y * GOLDEN_RATIO)).toBeCloseTo(
            width / height
        )
        expect(Math.max(layout.scale_x, layout.scale_y)).toBe(1)
        expect(layout.repeat_x).toBe(1)
        expect(layout.repeat_y).toBe(1)
    })

    it("fills the frame with proportional cropping and supports opposite crop edges", () => {
        const left = image_layout(1600, 900, {
            mode: "fill",
            crop_x: 0,
            crop_y: 0,
        })
        const right = image_layout(1600, 900, {
            mode: "fill",
            crop_x: 1,
            crop_y: 1,
        })
        expect(left.scale_x).toBe(1)
        expect(left.scale_y).toBe(1)
        expect((1600 * left.repeat_x) / (900 * left.repeat_y)).toBeCloseTo(
            1 / GOLDEN_RATIO
        )
        expect(left.offset_x).toBe(0)
        expect(right.offset_x + right.repeat_x).toBeCloseTo(1)
        const top = image_layout(300, 1800, {
            mode: "fill",
            crop_x: 0,
            crop_y: 0,
        })
        const bottom = image_layout(300, 1800, {
            mode: "fill",
            crop_x: 1,
            crop_y: 1,
        })
        expect(top.offset_y + top.repeat_y).toBeCloseTo(1)
        expect(bottom.offset_y).toBe(0)
    })
})
