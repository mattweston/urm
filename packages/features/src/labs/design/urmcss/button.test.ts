import { Button } from "@urm/ui/urmcss/button.ts"
import { inertHtml } from "foldkit/html"
import { describe, expect, test, vi } from "vitest"
import { is_button_path, is_urmcss_path } from "./route.ts"
import { button_view } from "./button.ts"
import { init, update } from "./state.ts"
import { Effect, Option } from "effect"
import { Calendar } from "foldkit"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import type { Model, Message } from "./state.ts"
import { it } from "@effect/vitest"

describe("URMCSS Button experiment", () => {
    test("calendar selection updates its own state without changing the action counter", () => {
        const model = init()
        const date = model.calendar.calendar.today
        const [selected] = update(model, {
            _tag: "GotCalendarMessage",
            message: { _tag: "ClickedDay", date },
        })
        expect(selected.calendar.maybeSelectedDate).toEqual(Option.some(date))
        expect(selected.clickCount).toBe(0)
        const [blocked] = update(selected, {
            _tag: "GotCalendarMessage",
            message: { _tag: "ClickedDay", date: Calendar.addDays(date, 1) },
        })
        expect(blocked.calendar.maybeSelectedDate).toEqual(Option.some(date))
        const [clicked] = update(selected, { _tag: "ClickedButton" })
        expect(clicked.clickCount).toBe(1)
        expect(clicked.calendar).toBe(selected.calendar)
    })

    test("applies square sizing only to explicitly icon-only buttons", () => {
        const icon = () => inertHtml.svg([], [])
        const text_button = Button(
            { children: [icon(), "Create document"] },
            inertHtml
        )
        const icon_button = Button(
            { children: [icon()], icon_only: true, label: "Create document" },
            inertHtml
        )
        expect(JSON.stringify(text_button)).not.toContain(
            '"data-content":"icon"'
        )
        expect(icon_button).toMatchObject({
            data: {
                attrs: {
                    "data-content": "icon",
                    "aria-label": "Create document",
                },
            },
        })
    })
    it.effect(
        "renders the comparison and real calendar through a runtime frame",
        () =>
            Effect.gen(function* () {
                const rendered = yield* Server.renderToString(
                    {
                        init: () => ({
                            model: { ...init(), clickCount: 3 },
                            commands: [],
                        }),
                        view: (model: Model, h: HtmlBuilder<Message>) => ({
                            title: "URMCSS Button",
                            body: button_view(model, (message) => message, h),
                        }),
                    },
                    { buildId: "urmcss-button-test" }
                )
                expect(rendered.html).toContain("Button activations: 3")
                expect(rendered.html).toContain("Tailwind")
                expect(rendered.html).toContain('aria-label="Create document"')
                expect(rendered.html).toContain('role="grid"')
                expect(rendered.html).toContain("urmcss-calendar-cell")
                expect(rendered.html).toContain("urmcss-media-actions")
            })
    )
    test("preserves Foldkit's focusable disabled behavior without wiring activation", async () => {
        await Effect.runPromise(
            Server.renderToString(
                {
                    init: () => ({ model: null }),
                    view: (_model: null, builder: HtmlBuilder<string>) => {
                        const on_click = vi.fn(builder.OnClick)
                        const h = { ...builder, OnClick: on_click }
                        const disabled = Button(
                            {
                                children: ["Unavailable"],
                                onClick: "clicked",
                                disabled: true,
                            },
                            h
                        )
                        expect(on_click).not.toHaveBeenCalled()
                        expect(disabled).toMatchObject({
                            data: {
                                props: { type: "button", tabIndex: 0 },
                                attrs: { "aria-disabled": "true" },
                            },
                        })
                        Button({ children: ["Save"], onClick: "clicked" }, h)
                        expect(on_click).toHaveBeenCalledWith("clicked")
                        return { title: "Button behavior", body: disabled }
                    },
                },
                { buildId: "button-behavior-test" }
            )
        )
    })

    test.each(["/design/urmcss/button", "/design/urmcss/button/"])(
        "recognizes the Button route at %s",
        (path) => {
            expect(is_button_path(path)).toBe(true)
            expect(is_urmcss_path(path)).toBe(true)
        }
    )

    test("does not claim unknown sibling routes", () => {
        expect(is_urmcss_path("/design/urmcss/buttonish")).toBe(false)
        expect(is_button_path("/design/urmcss/")).toBe(false)
    })
})
