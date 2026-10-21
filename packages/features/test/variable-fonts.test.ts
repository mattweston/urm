import { describe, expect, it } from "vitest"

import {
    ClickedLoadStaticFonts,
    SelectedFont,
    ToggledItalic,
    UpdatedWeight,
} from "../src/labs/typography/variable-fonts/variable-fonts.message.ts"
import { init } from "../src/labs/typography/variable-fonts/variable-fonts.model.ts"
import {
    isVariableFontsPath,
    variableFontsHref,
} from "../src/labs/typography/variable-fonts/route.ts"
import { update } from "../src/labs/typography/variable-fonts/variable-fonts.update.ts"

describe("variable-font lab", () => {
    it("recognizes its canonical route", () => {
        expect(variableFontsHref()).toBe("/labs/typography/variable-fonts/")
        expect(isVariableFontsPath(variableFontsHref())).toBe(true)
        expect(isVariableFontsPath("/labs/typography/variable-fonts")).toBe(
            true
        )
        expect(isVariableFontsPath("/labs/typography")).toBe(false)
    })

    it("updates the selected weight and static-font state", () => {
        const [initial] = init()
        const [weighted] = update(initial, UpdatedWeight({ value: 650 }))
        const [loaded] = update(weighted, ClickedLoadStaticFonts())

        expect(weighted.weight).toBe(650)
        expect(loaded.areStaticsLoaded).toBe(true)
    })

    it("clamps weight to the selected font axis", () => {
        const [initial] = init()
        const [heavy] = update(initial, UpdatedWeight({ value: 850 }))
        const [firaCode] = update(heavy, SelectedFont({ value: "fira-code" }))

        expect(firaCode.font).toBe("fira-code")
        expect(firaCode.weight).toBe(700)
    })

    it("turns off italic for a family without an italic face", () => {
        const [initial] = init()
        const [italic] = update(initial, ToggledItalic())
        const [inter] = update(italic, SelectedFont({ value: "inter" }))
        const [stillRoman] = update(inter, ToggledItalic())

        expect(italic.isItalic).toBe(true)
        expect(inter.isItalic).toBe(false)
        expect(stillRoman.isItalic).toBe(false)
    })
})
