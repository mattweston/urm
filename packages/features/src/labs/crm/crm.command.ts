import { Effect } from "effect"
import { Command } from "foldkit"

import { generateDataset } from "./crm.generate.ts"
import { CompletedGenerateDataset } from "./crm.message.ts"
import { DatasetSize } from "./crm.model.ts"

export const GenerateDataset = Command.define("GenerateDataset", {
    args: { size: DatasetSize },
    messages: [CompletedGenerateDataset],
    execute: ({ size }) =>
        Effect.sync(() =>
            CompletedGenerateDataset({
                size,
                dataset: generateDataset(size),
            })
        ),
})
