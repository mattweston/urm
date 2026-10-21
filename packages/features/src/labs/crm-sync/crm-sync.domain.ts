import { Schema as S } from "effect"

import { Activity, Contact, Tag } from "../crm/crm.domain.ts"

// One contact, opened on its own. Activities are the whole history rather than
// the latest one the list row shows, which is what the local schema had to grow
// a store for.
export const SyncContactDetail = S.Struct({
    contact: Contact,
    tags: S.Array(Tag),
    activities: S.Array(Activity),
    queryPlan: S.String,
})

export type SyncContactDetail = typeof SyncContactDetail.Type
