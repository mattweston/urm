import { describe, expect, test } from "vitest"

import {
    ChangedSocialLinkUrl,
    ClickedCancelSocialLinks,
    ClickedEditSocialLinks,
    ClickedSaveSocialLinks,
    SavedSocialLinks,
} from "./social-links.message.ts"
import { init, update } from "./social-links.update.ts"

describe("editable social links", () => {
    test("starts with visible platform homepages", () => {
        const [initial] = init()
        const [saved_without_links] = init([])

        expect(initial.drafts.map((link) => link.url)).toEqual([
            "https://www.facebook.com/",
            "https://www.instagram.com/",
            "https://www.youtube.com/",
            "https://x.com/",
        ])
        expect(saved_without_links.drafts.map((link) => link.url)).toEqual([
            "",
            "",
            "",
            "",
        ])
    })

    test("edits and cancels URL drafts", () => {
        const [initial] = init()
        const [editing] = update(initial, ClickedEditSocialLinks())
        const [changed] = update(
            editing,
            ChangedSocialLinkUrl({
                platform: "Instagram",
                url: "https://instagram.com/urm",
            })
        )
        const [cancelled] = update(changed, ClickedCancelSocialLinks())

        expect(changed.drafts[1]?.url).toBe("https://instagram.com/urm")
        expect(cancelled.drafts).toEqual(initial.saved_snapshot)
        expect(cancelled.editor_state).toBe("Viewing")
    })

    test("rejects an invalid non-empty URL", () => {
        const [initial] = init()
        const [changed] = update(
            initial,
            ChangedSocialLinkUrl({ platform: "X", url: "not a url" })
        )
        const [submitted, commands] = update(changed, ClickedSaveSocialLinks())

        expect(submitted.error).toContain("X needs")
        expect(commands).toEqual([])
    })

    test("emits a save command and accepts the saved snapshot", () => {
        const [initial] = init()
        const [saving, commands] = update(initial, ClickedSaveSocialLinks())
        const [saved] = update(
            saving,
            SavedSocialLinks({ links: saving.drafts })
        )

        expect(saving.editor_state).toBe("Saving")
        expect(commands).toHaveLength(1)
        expect(saved.saved_snapshot).toEqual(saving.drafts)
        expect(saved.editor_state).toBe("Viewing")
    })
})
