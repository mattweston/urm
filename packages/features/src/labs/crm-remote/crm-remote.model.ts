import { HashMap, Schema as S } from "effect"
import { AsyncData } from "foldkit"

import { RemoteContactsPage } from "./crm-remote.domain.ts"
import {
    ActivityRecency as BaseActivityRecency,
    DatasetSize as BaseDatasetSize,
} from "../crm/crm.model.ts"
import {
    CrmRemoteRoute,
    emptyCrmRemoteBrowseFields,
} from "./crm-remote.route.ts"

export const ActivityRecency = BaseActivityRecency
export const DatasetSize = BaseDatasetSize
export type ActivityRecency = typeof ActivityRecency.Type
export type DatasetSize = typeof DatasetSize.Type

export const RemoteContactsAsyncData = AsyncData.Schema(
    RemoteContactsPage,
    S.String
)

export const Model = S.Struct({
    route: CrmRemoteRoute,
    activeQueryKey: S.String,
    pageByQueryKey: S.HashMap(S.String, RemoteContactsAsyncData.schema),
    cacheKeysByRecency: S.Array(S.String),
    // The URL is the source of truth for the query, but with debouncing on it
    // trails the input by the quiet period, so the text field needs its own
    // value to stay responsive. It is resynced from the route on every
    // ChangedRemoteCrmRoute, which keeps back/forward and cold loads correct.
    searchDraft: S.String,
    isSearchDebounced: S.Boolean,
    // Shown in the view: the whole point of the debounce toggle is watching
    // this number grow slower.
    issuedQueryCount: S.Number,
})
export type Model = typeof Model.Type

export const emptyModel = (): Model => ({
    route: CrmRemoteRoute(emptyCrmRemoteBrowseFields),
    activeQueryKey: "",
    pageByQueryKey: HashMap.empty(),
    cacheKeysByRecency: [],
    searchDraft: "",
    isSearchDebounced: true,
    issuedQueryCount: 0,
})
