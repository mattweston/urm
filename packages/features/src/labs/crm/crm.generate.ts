import { Array, Option, pipe } from "effect"

import type { Activity, Contact, Dataset } from "./crm.domain.ts"
import { TAGS } from "./crm.domain.ts"
import { DatasetSize } from "./crm.model.ts"

const FIRST_NAMES: ReadonlyArray<string> = [
    "Ada",
    "Grace",
    "Katherine",
    "Margaret",
    "Dorothy",
    "Mary",
    "Radia",
    "Annie",
    "Barbara",
    "Evelyn",
    "Joan",
    "Frances",
]

const LAST_NAMES: ReadonlyArray<string> = [
    "Lovelace",
    "Hopper",
    "Johnson",
    "Hamilton",
    "Vaughan",
    "Jackson",
    "Perlman",
    "Easley",
    "Liskov",
    "Boyd",
    "Clarke",
    "Allen",
]

const COMPANIES: ReadonlyArray<string> = [
    "Northstar Systems",
    "Paper Trail Labs",
    "Helio Works",
    "Signal Forge",
    "Blue Orchard",
    "Cinder Analytics",
    "Orbit Studio",
    "Civic Cloud",
]

const ACTIVITY_KINDS: ReadonlyArray<string> = [
    "Call",
    "Email",
    "Demo",
    "Renewal",
    "Support",
]

const ACTIVITY_SUMMARIES: ReadonlyArray<string> = [
    "Discussed team rollout",
    "Asked for security review",
    "Shared migration notes",
    "Booked follow-up",
    "Sent pricing options",
]

const DATASET_COUNTS: Readonly<Record<DatasetSize, number>> = {
    OneThousand: 1_000,
    TenThousand: 10_000,
    FiftyThousand: 50_000,
    TwoHundredFiftyThousand: 250_000,
}

const atCycledIndex = (values: ReadonlyArray<string>, index: number): string =>
    values[index % values.length] ?? ""

export const tagIdsForIndex = (index: number): ReadonlyArray<string> =>
    pipe(
        TAGS,
        Array.filter(
            (_tag, tagIndex) => (index + tagIndex) % (tagIndex + 2) === 0
        ),
        Array.map(({ id }) => id)
    )

export const contactForIndex = (index: number): Contact => {
    const firstName = atCycledIndex(FIRST_NAMES, index)
    const lastName = atCycledIndex(
        LAST_NAMES,
        Math.floor(index / FIRST_NAMES.length)
    )
    const company = atCycledIndex(COMPANIES, index)
    const id = `contact-${index + 1}`
    const name = `${firstName} ${lastName} ${index + 1}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index + 1}@example.com`

    return {
        id,
        name,
        email,
        company,
        searchText: `${name} ${email}`.toLowerCase(),
    }
}

// The inverse of the id contactForIndex mints. A generated dataset has no
// lookup table to consult, so a URL carrying a contact id has to be able to get
// back to the index everything else is derived from. Whether that index is
// inside the dataset is the caller's question, not this one's.
export const contactIndexForId = (contactId: string): Option.Option<number> => {
    const prefix = "contact-"
    const oneBased = contactId.startsWith(prefix)
        ? Number(contactId.slice(prefix.length))
        : Number.NaN

    return Number.isInteger(oneBased) && oneBased >= 1
        ? Option.some(oneBased - 1)
        : Option.none()
}

export const activitiesForContact = (
    contactId: string,
    index: number
): ReadonlyArray<Activity> =>
    Array.makeBy(3, (activityIndex) => ({
        id: `${contactId}-activity-${activityIndex + 1}`,
        contactId,
        kind: atCycledIndex(ACTIVITY_KINDS, index + activityIndex),
        summary: atCycledIndex(ACTIVITY_SUMMARIES, index + activityIndex),
        occurredDaysAgo: (index * 7 + activityIndex * 19) % 180,
    }))

export const contactCountForDatasetSize = (size: DatasetSize): number =>
    DATASET_COUNTS[size]

export const generateDataset = (size: DatasetSize): Dataset => {
    const contactCount = contactCountForDatasetSize(size)
    const contacts = Array.makeBy(contactCount, contactForIndex)
    const contactIds = Array.map(contacts, ({ id }) => id)
    const contactEntries = Array.map(contacts, (contact) => [
        contact.id,
        contact,
    ])
    const tagEntries = Array.map(TAGS, (tag) => [tag.id, tag])
    const contactTags = Array.map(contacts, (contact, index) => ({
        contactId: contact.id,
        tagIds: tagIdsForIndex(index),
    }))
    const activities = Array.flatMap(contacts, (contact, index) =>
        activitiesForContact(contact.id, index)
    )
    const activityEntries = Array.map(activities, (activity) => [
        activity.id,
        activity,
    ])
    const tagIdsByContactEntries = Array.map(
        contactTags,
        ({ contactId, tagIds }) => [contactId, tagIds]
    )
    const contactIdsByTagEntries = Array.map(TAGS, (tag) => [
        tag.id,
        pipeContactIdsForTag(contactTags, tag.id),
    ])
    const activityIdsByContactEntries = Array.map(
        contacts,
        (contact, index) => [
            contact.id,
            Array.map(activitiesForContact(contact.id, index), ({ id }) => id),
        ]
    )
    const latestActivityByContactEntries = Array.map(
        contacts,
        (contact, index) => [
            contact.id,
            activitiesForContact(contact.id, index)[0] ?? {
                id: `${contact.id}-activity-fallback`,
                contactId: contact.id,
                kind: "Email",
                summary: "No recent activity",
                occurredDaysAgo: 999,
            },
        ]
    )

    return {
        contactIds,
        contactsById: Object.fromEntries(contactEntries),
        tagsById: Object.fromEntries(tagEntries),
        activitiesById: Object.fromEntries(activityEntries),
        tagIdsByContact: Object.fromEntries(tagIdsByContactEntries),
        contactIdsByTag: Object.fromEntries(contactIdsByTagEntries),
        activityIdsByContact: Object.fromEntries(activityIdsByContactEntries),
        latestActivityByContact: Object.fromEntries(
            latestActivityByContactEntries
        ),
    }
}

const pipeContactIdsForTag = (
    contactTags: ReadonlyArray<
        Readonly<{ contactId: string; tagIds: ReadonlyArray<string> }>
    >,
    tagId: string
): ReadonlyArray<string> =>
    pipe(
        contactTags,
        Array.filter(({ tagIds }) => tagIds.includes(tagId)),
        Array.map(({ contactId }) => contactId)
    )
