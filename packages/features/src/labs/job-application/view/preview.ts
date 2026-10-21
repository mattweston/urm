import { Array, Option, String, pipe } from "effect"
import { type Html, type HtmlBuilder } from "foldkit/html"

import type { Model } from "../model.ts"
import * as EducationEntry from "../step/education/entry.ts"
import type * as Education from "../step/education/education.ts"
import * as SkillsEntry from "../step/skills/entry.ts"
import type * as Skills from "../step/skills/skills.ts"
import * as WorkHistoryEntry from "../step/workHistory/entry.ts"
import type * as WorkHistory from "../step/workHistory/workHistory.ts"
import { employmentRange } from "./format.ts"

const COVER_LETTER_PREVIEW_MAX_CHARS = 200

const truncate = (value: string, max: number): string =>
    value.length > max ? `${value.slice(0, max)}...` : value

const sectionHeading = <ParentMessage>(
    title: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.h3(
        [
            h.Class(
                "text-xs font-bold uppercase tracking-wider text-muted-foreground border-b-(length:--surface-border-width) border-border pb-1 mb-2"
            ),
        ],
        [title]
    )
}

const headerSection = <ParentMessage>(
    fullName: string,
    pronounLabel: string,
    email: string,
    phone: string,
    portfolio: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const contacts = Array.filter([email, phone, portfolio], String.isNonEmpty)

    return h.div(
        [
            h.Class(
                "text-center mb-4 pb-4 border-b-(length:--surface-border-width) border-border"
            ),
        ],
        [
            h.keyed("h2")(
                "preview-name",
                [h.Class("text-xl font-bold text-foreground")],
                [fullName]
            ),
            ...(String.isNonEmpty(pronounLabel)
                ? [
                      h.keyed("p")(
                          "preview-pronouns",
                          [h.Class("text-xs text-muted-foreground italic")],
                          [pronounLabel]
                      ),
                  ]
                : []),
            ...(Array.isReadonlyArrayNonEmpty(contacts)
                ? [
                      h.keyed("p")(
                          "preview-contact",
                          [
                              h.Class(
                                  "text-xs text-muted-foreground mt-1 break-words"
                              ),
                          ],
                          [contacts.join(" · ")]
                      ),
                  ]
                : []),
        ]
    )
}

const workEntryView = <ParentMessage>(
    entry: WorkHistoryEntry.Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        `work-${entry.id}`,
        [h.Class("mb-3")],
        [
            ...(String.isNonEmpty(entry.title.value)
                ? [
                      h.strong(
                          [h.Class("block text-sm text-foreground")],
                          [entry.title.value]
                      ),
                  ]
                : []),
            ...(String.isNonEmpty(entry.company.value)
                ? [
                      h.p(
                          [h.Class("text-xs text-muted-foreground")],
                          [entry.company.value]
                      ),
                  ]
                : []),
            ...Option.match(entry.maybeStartDate, {
                onNone: () => [],
                onSome: (start) => [
                    h.p(
                        [h.Class("text-xs text-muted-foreground mt-0.5")],
                        [
                            employmentRange(
                                start,
                                entry.isCurrentlyEmployed,
                                entry.maybeEndDate
                            ),
                        ]
                    ),
                ],
            }),
            ...(String.isNonEmpty(entry.description)
                ? [
                      h.p(
                          [h.Class("text-xs text-muted-foreground mt-1")],
                          [entry.description]
                      ),
                  ]
                : []),
        ]
    )
}

const experienceSection = <ParentMessage>(
    workHistory: WorkHistory.Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [h.Class("mb-4")],
        [
            sectionHeading<ParentMessage>("Experience", h),
            ...Array.filter(
                workHistory.entries,
                (entry) =>
                    String.isNonEmpty(entry.company.value) ||
                    String.isNonEmpty(entry.title.value)
            ).map((entry) => workEntryView<ParentMessage>(entry, h)),
        ]
    )
}

const educationTimelineLine = <ParentMessage>(
    entry: EducationEntry.Model,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> => {
    if (entry.isCurrentlyEnrolled) {
        return [
            h.p(
                [h.Class("text-xs text-muted-foreground mt-0.5")],
                ["Currently enrolled"]
            ),
        ]
    }

    if (String.isNonEmpty(entry.graduationYear)) {
        return [
            h.p(
                [h.Class("text-xs text-muted-foreground mt-0.5")],
                [`Class of ${entry.graduationYear}`]
            ),
        ]
    }

    return []
}

const educationEntryView = <ParentMessage>(
    entry: EducationEntry.Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const degreeLine = Array.filter(
        [entry.degree.value, entry.fieldOfStudy.value],
        String.isNonEmpty
    ).join(", ")

    return h.keyed("div")(
        `education-${entry.id}`,
        [h.Class("mb-3")],
        [
            ...(String.isNonEmpty(degreeLine)
                ? [
                      h.strong(
                          [h.Class("block text-sm text-foreground")],
                          [degreeLine]
                      ),
                  ]
                : []),
            ...(String.isNonEmpty(entry.school.value)
                ? [
                      h.p(
                          [h.Class("text-xs text-muted-foreground")],
                          [entry.school.value]
                      ),
                  ]
                : []),
            ...educationTimelineLine<ParentMessage>(entry, h),
        ]
    )
}

const educationSection = <ParentMessage>(
    education: Education.Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [h.Class("mb-4")],
        [
            sectionHeading<ParentMessage>("Education", h),
            ...Array.filter(education.entries, (entry) =>
                String.isNonEmpty(entry.school.value)
            ).map((entry) => educationEntryView<ParentMessage>(entry, h)),
        ]
    )
}

type SkillsByProficiency = ReadonlyArray<
    Readonly<{ level: string; names: ReadonlyArray<string> }>
>

const PROFICIENCY_ORDER: ReadonlyArray<SkillsEntry.Model["proficiency"]> = [
    "Expert",
    "Advanced",
    "Intermediate",
    "Beginner",
]

const groupSkillsByProficiency = (
    entries: ReadonlyArray<SkillsEntry.Model>
): SkillsByProficiency => {
    const grouped = pipe(
        entries,
        Array.filter((entry) => String.isNonEmpty(entry.name.value)),
        Array.groupBy((entry) => entry.proficiency)
    )

    return pipe(
        PROFICIENCY_ORDER,
        Array.flatMap((level) => {
            const entries = grouped[level]

            return entries === undefined
                ? []
                : [
                      {
                          level,
                          names: Array.map(
                              entries,
                              (entry) => entry.name.value
                          ),
                      },
                  ]
        })
    )
}

const skillGroupView = <ParentMessage>(
    group: Readonly<{ level: string; names: ReadonlyArray<string> }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.p(
        [h.Class("text-xs text-foreground mb-1")],
        [
            h.strong([h.Class("text-foreground")], [`${group.level}:`]),
            ` ${group.names.join(", ")}`,
        ]
    )
}

const skillsSection = <ParentMessage>(
    skills: Skills.Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const grouped = groupSkillsByProficiency(skills.entries)

    return h.section(
        [h.Class("mb-4")],
        [
            sectionHeading<ParentMessage>("Skills", h),
            ...grouped.map((group) => skillGroupView<ParentMessage>(group, h)),
        ]
    )
}

const coverLetterSection = <ParentMessage>(
    content: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [],
        [
            sectionHeading<ParentMessage>("Cover Letter", h),
            h.p(
                [h.Class("text-xs text-muted-foreground whitespace-pre-wrap")],
                [truncate(content, COVER_LETTER_PREVIEW_MAX_CHARS)]
            ),
        ]
    )
}

export const preview = <ParentMessage>(
    {
        personalInfo: {
            firstName: { value: firstName },
            lastName: { value: lastName },
            email: { value: email },
            phone: { value: phone },
            portfolioUrl: { value: portfolio },
            maybeSelectedPronouns,
            customPronouns,
        },
        workHistory,
        education,
        skills,
        coverLetter,
    }: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const fullName =
        String.isNonEmpty(firstName) || String.isNonEmpty(lastName)
            ? `${firstName} ${lastName}`.trim()
            : "Your Name"

    const pronounLabel = Option.match(maybeSelectedPronouns, {
        onNone: () => "",
        onSome: (value) => (value === "Other" ? customPronouns : value),
    })

    const hasExperience = Array.some(
        workHistory.entries,
        (entry) =>
            String.isNonEmpty(entry.company.value) ||
            String.isNonEmpty(entry.title.value)
    )
    const hasEducation = Array.some(education.entries, (entry) =>
        String.isNonEmpty(entry.school.value)
    )
    const hasSkills = Array.some(skills.entries, (entry) =>
        String.isNonEmpty(entry.name.value)
    )

    return h.div(
        [h.Class("font-serif")],
        [
            headerSection<ParentMessage>(
                fullName,
                pronounLabel,
                email,
                phone,
                portfolio,
                h
            ),
            ...(hasExperience
                ? [experienceSection<ParentMessage>(workHistory, h)]
                : []),
            ...(hasEducation
                ? [educationSection<ParentMessage>(education, h)]
                : []),
            ...(hasSkills ? [skillsSection<ParentMessage>(skills, h)] : []),
            ...(String.isNonEmpty(coverLetter.content)
                ? [coverLetterSection<ParentMessage>(coverLetter.content, h)]
                : []),
        ]
    )
}
