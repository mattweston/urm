import { Duration, Effect, Schema as S } from "effect"
import { Command } from "foldkit"

import { querySimulatedRemoteContacts } from "../crm-remote/crm-remote.domain.ts"
import { SettledNormalizedContactsQuery } from "./crm-normalized.message.ts"
import { ActivityRecency, DatasetSize } from "./crm-normalized.model.ts"

// The same simulated backend the remote demo queries. The client is what
// differs: this one splits the response into a store and a list of ids.
const QueryNormalizedContacts = Command.define("QueryNormalizedContacts", {
    args: {
        size: DatasetSize,
        searchText: S.String,
        selectedTagIds: S.Array(S.String),
        activityRecency: ActivityRecency,
        page: S.Number,
        queryKey: S.String,
    },
    messages: [SettledNormalizedContactsQuery],
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
                SettledNormalizedContactsQuery({
                    queryKey: input.queryKey,
                    result,
                })
            )
        ),
})

export const queryNormalizedContacts = QueryNormalizedContacts
