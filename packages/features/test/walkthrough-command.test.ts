import { AsyncData } from "foldkit"
import { describe, expect, it } from "vitest"

import * as Dice from "../src/learn/walkthrough/examples/on-change.ts"
import * as Roll from "../src/learn/walkthrough/examples/on-demand.ts"
import * as Weather from "../src/learn/walkthrough/examples/decoding.ts"

describe("Foldkit command examples", () => {
    it("starts a dice command when the count changes", () => {
        const { model, commands = [] } = Dice.update(
            Dice.init,
            Dice.ClickedIncreaseDice()
        )

        expect(model.dice_count).toBe(4)
        expect(AsyncData.isPending(model.rolls)).toBe(true)
        expect(commands.map((command) => command.name)).toEqual([
            "RollDice",
            "PlayCue",
        ])
    })

    it("does not trigger a second roll while one is pending", () => {
        const { model: rolling } = Roll.update(
            Roll.init,
            Roll.ClickedRollDice()
        )
        const { model, commands = [] } = Roll.update(
            rolling,
            Roll.ClickedRollDice()
        )

        expect(model).toBe(rolling)
        expect(commands).toHaveLength(0)
    })

    it("stores only a schema-decoded weather reading", () => {
        const reading = Weather.Reading.make({
            current: {
                temperature_2m: 18,
                relative_humidity_2m: 64,
            },
        })
        const { model, commands = [] } = Weather.update(
            Weather.init[0],
            Weather.SucceededFetchWeather({ reading })
        )

        expect(model.weather).toEqual(AsyncData.Success({ data: reading }))
        expect(commands).toHaveLength(0)
    })
})
