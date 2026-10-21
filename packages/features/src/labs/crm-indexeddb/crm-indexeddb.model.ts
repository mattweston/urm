import { HashMap, Option, Schema as S } from "effect"
import { AsyncData } from "foldkit"

import { RemoteContactsPage } from "../crm-remote/crm-remote.domain.ts"
import {
    ActivityRecency as BaseActivityRecency,
    DatasetSize as BaseDatasetSize,
} from "../crm/crm.model.ts"

export const ActivityRecency = BaseActivityRecency
export const DatasetSize = BaseDatasetSize
export type ActivityRecency = typeof ActivityRecency.Type
export type DatasetSize = typeof DatasetSize.Type

export const IndexedContactsData = AsyncData.Schema(
    RemoteContactsPage,
    S.String
)
export const SeedingState = S.Literals([
    "Inspecting",
    "Seeding",
    "Ready",
    "Failed",
])
export type SeedingState = typeof SeedingState.Type

export const Model = S.Struct({
    selectedDatasetSize: DatasetSize,
    searchText: S.String,
    isSearchDebounced: S.Boolean,
    isDenormalizedRead: S.Boolean,
    isTokenIndexSearch: S.Boolean,
    selectedTagIds: S.Array(S.String),
    activityRecency: ActivityRecency,
    seedingState: SeedingState,
    seededContacts: S.Number,
    activeQueryKey: S.String,
    pendingQueryKey: S.Option(S.String),
    pageByQueryKey: S.HashMap(S.String, IndexedContactsData.schema),
    cacheKeysByRecency: S.Array(S.String),
    maybeError: S.Option(S.String),
})
export type Model = typeof Model.Type

export const emptyModel = (): Model => ({
    selectedDatasetSize: "TenThousand",
    searchText: "",
    isSearchDebounced: true,
    isDenormalizedRead: true,
    isTokenIndexSearch: true,
    selectedTagIds: [],
    activityRecency: "Any",
    seedingState: "Inspecting",
    seededContacts: 0,
    activeQueryKey: "",
    pendingQueryKey: Option.none(),
    pageByQueryKey: HashMap.empty(),
    cacheKeysByRecency: [],
    maybeError: Option.none(),
})
