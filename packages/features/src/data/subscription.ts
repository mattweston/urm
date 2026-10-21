import { Subscription } from "foldkit"
import * as Spreadsheet from "../spreadsheet/index.ts"
import type { Model } from "./model.ts"
import { GotTableMessage, type Message } from "./message.ts"
import { GotSpreadsheetMessage } from "./tables/message.ts"

const table_subscriptions = Object.fromEntries(
    Object.entries(Spreadsheet.subscriptions).map(([name, subscription]) => [
        `data_${name}`,
        subscription,
    ])
)

export const subscriptions = Subscription.lift(table_subscriptions)<
    Model,
    Message
>({
    toChildModel: (model) => model.tables.spreadsheet,
    toParentMessage: (message) =>
        GotTableMessage({ message: GotSpreadsheetMessage({ message }) }),
    when: (model) => model.route === "Home" || model.route === "Spreadsheets",
})
