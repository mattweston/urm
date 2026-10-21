import { Array, Option, Schema as S, String, pipe } from "effect"

export const Contact = S.Struct({
    id: S.String,
    name: S.String,
    email: S.String,
    company: S.String,
    searchText: S.String,
})

export type Contact = typeof Contact.Type

export const Tag = S.Struct({
    id: S.String,
    label: S.String,
    tone: S.String,
})

export type Tag = typeof Tag.Type

export const Activity = S.Struct({
    id: S.String,
    contactId: S.String,
    kind: S.String,
    summary: S.String,
    occurredDaysAgo: S.Number,
})

export type Activity = typeof Activity.Type

export const Dataset = S.Struct({
    contactIds: S.Array(S.String),
    contactsById: S.Record(S.String, Contact),
    tagsById: S.Record(S.String, Tag),
    activitiesById: S.Record(S.String, Activity),
    tagIdsByContact: S.Record(S.String, S.Array(S.String)),
    contactIdsByTag: S.Record(S.String, S.Array(S.String)),
    activityIdsByContact: S.Record(S.String, S.Array(S.String)),
    latestActivityByContact: S.Record(S.String, Activity),
})

export type Dataset = typeof Dataset.Type

export const EMPTY_DATASET: Dataset = {
    contactIds: [],
    contactsById: {},
    tagsById: {},
    activitiesById: {},
    tagIdsByContact: {},
    contactIdsByTag: {},
    activityIdsByContact: {},
    latestActivityByContact: {},
}

export const TAGS: ReadonlyArray<Tag> = [
    { id: "enterprise", label: "Enterprise", tone: "bg-sky-100 text-sky-900" },
    { id: "founder", label: "Founder", tone: "bg-pink-100 text-pink-900" },
    { id: "trial", label: "Trial", tone: "bg-amber-100 text-amber-900" },
    {
        id: "partner",
        label: "Partner",
        tone: "bg-emerald-100 text-emerald-900",
    },
    {
        id: "churn-risk",
        label: "Churn risk",
        tone: "bg-rose-100 text-rose-900",
    },
    {
        id: "champion",
        label: "Champion",
        tone: "bg-violet-100 text-violet-900",
    },
]

export const contactMatchesText = (
    contact: Contact,
    normalizedSearch: string
): boolean =>
    String.isEmpty(normalizedSearch) ||
    contact.searchText.includes(normalizedSearch)

export const contactMatchesSelectedTags = (
    contactId: string,
    selectedTagIds: ReadonlyArray<string>,
    tagIdsByContact: Dataset["tagIdsByContact"]
): boolean => {
    const contactTagIds = tagIdsByContact[contactId] ?? []

    return selectedTagIds.every((tagId) => contactTagIds.includes(tagId))
}

export const contactMatchesRecency = (
    contactId: string,
    maxActivityAgeDays: number,
    latestActivityByContact: Dataset["latestActivityByContact"]
): boolean =>
    pipe(
        Option.fromNullishOr(latestActivityByContact[contactId]),
        Option.match({
            onNone: () => false,
            onSome: (activity) =>
                activity.occurredDaysAgo <= maxActivityAgeDays,
        })
    )

export const tagsForContact = (
    contactId: string,
    dataset: Dataset
): ReadonlyArray<Tag> =>
    pipe(
        dataset.tagIdsByContact[contactId] ?? [],
        Array.map(
            (tagId): Tag =>
                dataset.tagsById[tagId] ?? {
                    id: tagId,
                    label: tagId,
                    tone: "bg-muted text-muted-foreground",
                }
        )
    )

export const latestActivityForContact = (
    contactId: string,
    dataset: Dataset
): Option.Option<Activity> =>
    Option.fromNullishOr(dataset.latestActivityByContact[contactId])
