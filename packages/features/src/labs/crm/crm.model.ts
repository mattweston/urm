import { Option, Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { Dataset, EMPTY_DATASET } from "./crm.domain.ts"

export const DatasetSize = S.Literals([
    "OneThousand",
    "TenThousand",
    "FiftyThousand",
    "TwoHundredFiftyThousand",
])

export type DatasetSize = typeof DatasetSize.Type

export const ActivityRecency = S.Literals(["SevenDays", "ThirtyDays", "Any"])

export type ActivityRecency = typeof ActivityRecency.Type

// "Any" is a number rather than a special case so callers stay one comparison.
export const maxActivityAgeDays = (recency: ActivityRecency): number =>
    recency === "SevenDays"
        ? 7
        : recency === "ThirtyDays"
          ? 30
          : Number.MAX_SAFE_INTEGER

export const Generating = taggedStruct("Generating", { size: DatasetSize })
export const Ready = taggedStruct("Ready", { size: DatasetSize })
export const LoadState = S.Union([Generating, Ready])

export type LoadState = typeof LoadState.Type

export const Model = S.Struct({
    loadState: LoadState,
    dataset: Dataset,
    selectedDatasetSize: DatasetSize,
    searchText: S.String,
    selectedTagIds: S.Array(S.String),
    activityRecency: ActivityRecency,
    filteredContactIds: S.Array(S.String),
    list: Ui.VirtualList.Model,
    maybeSelectedContactId: S.Option(S.String),
})

export type Model = typeof Model.Type

export const emptyModel = (): Model => ({
    loadState: Generating({ size: "TenThousand" }),
    dataset: EMPTY_DATASET,
    selectedDatasetSize: "TenThousand",
    searchText: "",
    selectedTagIds: [],
    activityRecency: "ThirtyDays",
    filteredContactIds: [],
    list: Ui.VirtualList.init({
        id: "crm-contacts-list",
        rowHeightPx: 96,
    }),
    maybeSelectedContactId: Option.none(),
})
