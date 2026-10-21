import { Duration, Effect, Schema as S } from "effect"
import { Command } from "foldkit"

import { querySimulatedRemoteContacts } from "./crm-remote.domain.ts"
import {
    ElapsedRemoteCrmSearchDebounce,
    SettledRemoteContactsQuery,
} from "./crm-remote.message.ts"
import { ActivityRecency, DatasetSize } from "./crm-remote.model.ts"

export const SEARCH_DEBOUNCE_MS = 350
const SEARCH_DEBOUNCE = Duration.millis(SEARCH_DEBOUNCE_MS)

const QueryRemoteContacts = Command.define("QueryRemoteContacts", {
    args: {
        size: DatasetSize,
        searchText: S.String,
        selectedTagIds: S.Array(S.String),
        activityRecency: ActivityRecency,
        page: S.Number,
        queryKey: S.String,
    },
    messages: [SettledRemoteContactsQuery],
    execute: (input) =>
        Effect.sleep(Duration.millis(280)).pipe(
            Effect.andThen(() =>
                Effect.try({
                    try: () => querySimulatedRemoteContacts(input),
                    catch: (error) => `${error}`,
                })
            ),
            Effect.result,
            Effect.map((result) =>
                SettledRemoteContactsQuery({
                    queryKey: input.queryKey,
                    result,
                })
            )
        ),
})

// The timer is not interruptible. Interruption is the situational layer for
// superseded work worth stopping; a sleep is not, so every keystroke's timer
// runs to completion and update judges it at receipt against the Model.
const DebounceRemoteCrmSearch = Command.define("DebounceRemoteCrmSearch", {
    args: { value: S.String },
    messages: [ElapsedRemoteCrmSearchDebounce],
    execute: ({ value }) =>
        Effect.sleep(SEARCH_DEBOUNCE).pipe(
            Effect.as(ElapsedRemoteCrmSearchDebounce({ value }))
        ),
})

export const queryRemoteContacts = QueryRemoteContacts
export const debounceRemoteCrmSearch = DebounceRemoteCrmSearch
