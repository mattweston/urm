import { Option } from "effect"
import { Command } from "foldkit"
import type { Message } from "./message.ts"
import { Model, TelemetryNotAsked } from "./model.ts"

type InitReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): InitReturn => [
    Model.make({
        telemetry: TelemetryNotAsked(),
        chartMode: "Adoption",
        selectedPackageId: "Core",
        period: "LastSixteenWeeks",
        maybeChartHostId: Option.none(),
        maybeChartError: Option.none(),
        maybeSelectedDatumId: Option.none(),
    }),
    [],
]

export type InitMessage = Message
