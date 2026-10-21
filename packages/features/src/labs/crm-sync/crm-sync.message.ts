import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { RemoteContactsPage } from "../crm-remote/crm-remote.domain.ts"
import { ActivityRecency } from "../crm/crm.model.ts"
import { SyncContactDetail } from "./crm-sync.domain.ts"
import { CrmSyncRoute } from "./crm-sync.route.ts"

// The only handler that resolves a filter into a read. Everything that changes
// the filter writes a URL and waits for it to come back through here, so a deep
// link and a back button take exactly the same path as a keystroke.
export const ChangedSyncRoute = taggedStruct("ChangedSyncRoute", {
    route: CrmSyncRoute,
})
// Navigation has nothing to do on completion; the route change is what carries
// the work. It exists because a Command has to name the messages it can send.
export const CompletedSyncUrlReplacement = taggedStruct(
    "CompletedSyncUrlReplacement"
)
// Option, not a failure: an id that names no contact is an answer, not an
// error, and the detail page has a state for it.
export const SettledSyncContactDetail = taggedStruct(
    "SettledSyncContactDetail",
    {
        contactId: S.String,
        result: S.Result(S.Option(SyncContactDetail), S.String),
    }
)

// Scrolling and container measurement. Both change which pages the window
// needs, so both go through the same handler that reconciles window to pages.
export const GotSyncVirtualListMessage = taggedStruct(
    "GotSyncVirtualListMessage",
    {
        message: Ui.VirtualList.Message,
    }
)

// queryKey, not just page: the result is written back to the cache entry that
// asked for it, so a response that arrives after the user has moved on still
// fills its own slot rather than being dropped or landing on the wrong one.
export const SettledSyncRemotePage = taggedStruct("SettledSyncRemotePage", {
    queryKey: S.String,
    result: S.Result(RemoteContactsPage, S.String),
})
// isVerification separates the read that proves the local copy agrees with the
// screen from an ordinary read that is meant to be displayed.
export const SettledSyncLocalPage = taggedStruct("SettledSyncLocalPage", {
    queryKey: S.String,
    isVerification: S.Boolean,
    result: S.Result(RemoteContactsPage, S.String),
})
export const SettledSyncHydrationBatch = taggedStruct(
    "SettledSyncHydrationBatch",
    {
        hydratedContacts: S.Number,
    }
)
export const UpdatedSyncSearchText = taggedStruct("UpdatedSyncSearchText", {
    value: S.String,
})
// Carries the text that armed the timer, so update can ask on receipt whether
// it is still what the Model is waiting for.
export const ElapsedSyncSearchDebounce = taggedStruct(
    "ElapsedSyncSearchDebounce",
    {
        value: S.String,
    }
)
export const ClickedSyncRebuild = taggedStruct("ClickedSyncRebuild")
export const CompletedSyncRebuild = taggedStruct("CompletedSyncRebuild")
export const FailedSyncOperation = taggedStruct("FailedSyncOperation", {
    error: S.String,
})

export const ClickedEditSyncContact = taggedStruct("ClickedEditSyncContact", {
    contactId: S.String,
})
export const UpdatedSyncEditedName = taggedStruct("UpdatedSyncEditedName", {
    value: S.String,
})
export const ClickedCancelSyncContactEdit = taggedStruct(
    "ClickedCancelSyncContactEdit"
)
export const SubmittedSyncContactEdit = taggedStruct("SubmittedSyncContactEdit")
// Carries the name that was submitted, not just the outcome. A rejected write
// has to put back what the row held before, and by the time the result arrives
// the Model no longer knows what that was.
export const SettledSyncContactWrite = taggedStruct("SettledSyncContactWrite", {
    contactId: S.String,
    previousName: S.Option(S.String),
    result: S.Result(S.String, S.String),
})
// Edits are read back at startup, so a reload shows them before — and
// independently of — the hydration that rebuilds the rows underneath.
export const SettledSyncEditsLoad = taggedStruct("SettledSyncEditsLoad", {
    edits: S.Array(S.Tuple([S.String, S.String])),
})

// A chip is one deliberate change rather than a stream of them, so neither of
// these is debounced: they write the URL immediately whichever source is
// answering.
export const ToggledSyncTagFacet = taggedStruct("ToggledSyncTagFacet", {
    tagId: S.String,
})
export const SelectedSyncActivityRecency = taggedStruct(
    "SelectedSyncActivityRecency",
    {
        recency: ActivityRecency,
    }
)

export const Message = S.Union([
    ChangedSyncRoute,
    CompletedSyncUrlReplacement,
    SettledSyncContactDetail,
    GotSyncVirtualListMessage,
    SettledSyncRemotePage,
    SettledSyncLocalPage,
    SettledSyncHydrationBatch,
    UpdatedSyncSearchText,
    ElapsedSyncSearchDebounce,
    ToggledSyncTagFacet,
    SelectedSyncActivityRecency,
    ClickedSyncRebuild,
    CompletedSyncRebuild,
    FailedSyncOperation,
    ClickedEditSyncContact,
    UpdatedSyncEditedName,
    ClickedCancelSyncContactEdit,
    SubmittedSyncContactEdit,
    SettledSyncContactWrite,
    SettledSyncEditsLoad,
])
export type Message = typeof Message.Type
