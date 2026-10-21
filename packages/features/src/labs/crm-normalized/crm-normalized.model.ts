import { HashMap, Option, Schema as S } from "effect"
import { AsyncData } from "foldkit"

import {
    ContactPage,
    INITIAL_STORE,
    NormalizedStore,
} from "./crm-normalized.domain.ts"
import {
    ActivityRecency as BaseActivityRecency,
    DatasetSize as BaseDatasetSize,
} from "../crm/crm.model.ts"

export const ActivityRecency = BaseActivityRecency
export const DatasetSize = BaseDatasetSize
export type ActivityRecency = typeof ActivityRecency.Type
export type DatasetSize = typeof DatasetSize.Type

export const FilterPreset = S.Literals(["EnterpriseTag", "FounderTag"])
export type FilterPreset = typeof FilterPreset.Type

export const ContactPageAsyncData = AsyncData.Schema(ContactPage, S.String)

export const Model = S.Struct({
    selectedDatasetSize: DatasetSize,
    searchText: S.String,
    selectedTagIds: S.Array(S.String),
    activityRecency: ActivityRecency,
    activeQueryKey: S.String,
    pageByQueryKey: S.HashMap(S.String, ContactPageAsyncData.schema),
    cacheKeysByRecency: S.Array(S.String),
    store: NormalizedStore,
    locallyEditedContactIds: S.Array(S.String),
    maybeEditingContactId: S.Option(S.String),
    editedName: S.String,
})

export type Model = typeof Model.Type

export const emptyModel = (): Model => ({
    selectedDatasetSize: "TenThousand",
    searchText: "",
    selectedTagIds: [],
    activityRecency: "Any",
    activeQueryKey: "",
    pageByQueryKey: HashMap.empty(),
    cacheKeysByRecency: [],
    store: INITIAL_STORE,
    locallyEditedContactIds: [],
    maybeEditingContactId: Option.none(),
    editedName: "",
})
