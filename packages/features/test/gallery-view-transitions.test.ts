import { describe, expect, it } from "vitest"

import {
    ClosedGalleryImage,
    SelectedGalleryImage,
    init,
    update,
} from "../src/labs/gallery-view-transitions/index.ts"

describe("gallery view transitions demo", () => {
    it("selects one image and returns to the gallery", () => {
        const [selected] = update(
            init,
            SelectedGalleryImage({ id: "ridge-light" })
        )
        const [closed] = update(selected, ClosedGalleryImage())

        expect(selected.selected_image_id).toBe("ridge-light")
        expect(closed.selected_image_id).toBeNull()
    })
})
