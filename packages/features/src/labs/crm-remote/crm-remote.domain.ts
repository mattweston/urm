import { Array, Schema as S } from "effect"

import { Activity, Contact, Tag, TAGS } from "../crm/crm.domain.ts"
import {
    activitiesForContact,
    contactCountForDatasetSize,
    contactForIndex,
    tagIdsForIndex,
} from "../crm/crm.generate.ts"
import type { ActivityRecency, DatasetSize } from "../crm/crm.model.ts"

export const RemoteContactRow = S.Struct({
    contact: Contact,
    tags: S.Array(Tag),
    latestActivity: Activity,
})

export type RemoteContactRow = typeof RemoteContactRow.Type

export const RemoteContactsPage = S.Struct({
    totalMatches: S.Number,
    page: S.Number,
    queryPlan: S.String,
    rows: S.Array(RemoteContactRow),
    hasNextPage: S.Boolean,
})

export type RemoteContactsPage = typeof RemoteContactsPage.Type

export const PAGE_SIZE = 50

const maximumActivityAge = (activityRecency: ActivityRecency): number =>
    activityRecency === "SevenDays"
        ? 7
        : activityRecency === "ThirtyDays"
          ? 30
          : Number.MAX_SAFE_INTEGER

const tagIndex = (tagId: string): number =>
    TAGS.findIndex((tag) => tag.id === tagId)

const contactIndexesForTag = (
    tagId: string,
    contactCount: number
): ReadonlyArray<number> => {
    const index = tagIndex(tagId)
    if (index < 0) return []

    const stride = index + 2
    const firstIndex = (stride - (index % stride)) % stride
    const count =
        firstIndex >= contactCount
            ? 0
            : Math.floor((contactCount - firstIndex - 1) / stride) + 1

    return Array.makeBy(count, (offset) => firstIndex + offset * stride)
}

const contactIndexesForRecency = (
    maximumAge: number,
    contactCount: number
): ReadonlyArray<number> => {
    const indexes: Array<number> = []
    const greatestIndexedAge = Math.min(maximumAge, 179)

    for (
        let occurredDaysAgo = 0;
        occurredDaysAgo <= greatestIndexedAge;
        occurredDaysAgo += 1
    ) {
        // 103 is the multiplicative inverse of 7 modulo 180. It retrieves the
        // contacts in an activity-recency index bucket without scanning contacts.
        const firstIndex = (occurredDaysAgo * 103) % 180
        for (
            let contactIndex = firstIndex;
            contactIndex < contactCount;
            contactIndex += 180
        ) {
            indexes.push(contactIndex)
        }
    }

    return indexes
}

const queryPlanFor = (
    input: Readonly<{
        searchText: string
        selectedTagIds: ReadonlyArray<string>
        activityRecency: ActivityRecency
    }>
): string => {
    const indexes = [
        input.selectedTagIds.length > 0 ? "tag index" : "",
        input.activityRecency === "Any" ? "" : "activity-recency index",
    ].filter((index) => index !== "")
    const textPlan =
        input.searchText.trim() === "" ? "" : "substring scan (no text index)"
    const plan = [...indexes, textPlan].filter((step) => step !== "")

    return plan.length === 0 ? "primary contact index" : plan.join(" + ")
}

const rarestTagId = (selectedTagIds: ReadonlyArray<string>): string =>
    selectedTagIds.reduce(
        (rarestTagId, tagId) =>
            tagIndex(tagId) > tagIndex(rarestTagId) ? tagId : rarestTagId,
        selectedTagIds[0] ?? ""
    )

const indexedCandidateIndexes = (
    input: Readonly<{
        selectedTagIds: ReadonlyArray<string>
        activityRecency: ActivityRecency
        contactCount: number
    }>
): ReadonlyArray<number> => {
    const tagCandidates =
        input.selectedTagIds.length === 0
            ? []
            : contactIndexesForTag(
                  rarestTagId(input.selectedTagIds),
                  input.contactCount
              )
    const recencyCandidates =
        input.activityRecency === "Any"
            ? []
            : contactIndexesForRecency(
                  maximumActivityAge(input.activityRecency),
                  input.contactCount
              )

    if (tagCandidates.length === 0) return recencyCandidates
    if (recencyCandidates.length === 0) return tagCandidates
    return tagCandidates.length <= recencyCandidates.length
        ? tagCandidates
        : recencyCandidates
}

const remoteContactRow = (contactIndex: number): RemoteContactRow => {
    const contact = contactForIndex(contactIndex)
    const tagIds = tagIdsForIndex(contactIndex)
    const activities = activitiesForContact(contact.id, contactIndex)
    const latestActivity = activities[0] ?? {
        id: `${contact.id}-activity-fallback`,
        contactId: contact.id,
        kind: "Email",
        summary: "No recent activity",
        occurredDaysAgo: 999,
    }
    const tags = Array.map(
        Array.filter(TAGS, (tag) => tagIds.includes(tag.id)),
        (tag) => tag
    )

    return { contact, tags, latestActivity }
}

// This deliberately represents the RPC response, not an in-browser database.
// Virtual tag and activity-recency indexes enumerate only candidate ids; free
// text remains a substring scan unless the simulated schema adds a text index.
export const querySimulatedRemoteContacts = (
    input: Readonly<{
        size: DatasetSize
        searchText: string
        selectedTagIds: ReadonlyArray<string>
        activityRecency: ActivityRecency
        page: number
    }>
): RemoteContactsPage => {
    const pageStart = input.page * PAGE_SIZE
    const contactCount = contactCountForDatasetSize(input.size)
    const normalizedSearch = input.searchText.trim().toLowerCase()
    const maximumAge = maximumActivityAge(input.activityRecency)
    const hasIndexedFacet =
        input.selectedTagIds.length > 0 || input.activityRecency !== "Any"
    const queryPlan = queryPlanFor(input)

    if (!hasIndexedFacet && normalizedSearch === "") {
        const rows = Array.makeBy(
            Math.min(PAGE_SIZE, Math.max(0, contactCount - pageStart)),
            (offset) => remoteContactRow(pageStart + offset)
        )
        return {
            totalMatches: contactCount,
            page: input.page,
            queryPlan,
            rows,
            hasNextPage: pageStart + rows.length < contactCount,
        }
    }

    const candidateIndexes = hasIndexedFacet
        ? indexedCandidateIndexes({
              selectedTagIds: input.selectedTagIds,
              activityRecency: input.activityRecency,
              contactCount,
          })
        : Array.makeBy(contactCount, (contactIndex) => contactIndex)
    const rows: Array<RemoteContactRow> = []
    let totalMatches = 0

    for (const contactIndex of candidateIndexes) {
        const contact = contactForIndex(contactIndex)
        const tagIds = tagIdsForIndex(contactIndex)
        const activities = activitiesForContact(contact.id, contactIndex)
        const latestActivity = activities[0] ?? {
            id: `${contact.id}-activity-fallback`,
            contactId: contact.id,
            kind: "Email",
            summary: "No recent activity",
            occurredDaysAgo: 999,
        }
        const matchesSearch =
            normalizedSearch === "" ||
            contact.searchText.includes(normalizedSearch)
        const matchesTags = input.selectedTagIds.every((tagId) =>
            tagIds.includes(tagId)
        )
        const matchesRecency = latestActivity.occurredDaysAgo <= maximumAge

        if (!matchesSearch || !matchesTags || !matchesRecency) continue

        if (totalMatches >= pageStart && rows.length < PAGE_SIZE) {
            rows.push(remoteContactRow(contactIndex))
        }
        totalMatches += 1
    }

    return {
        totalMatches,
        page: input.page,
        queryPlan,
        rows,
        hasNextPage: pageStart + rows.length < totalMatches,
    }
}
