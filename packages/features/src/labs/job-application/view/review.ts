import { Match as M, Option } from "effect"
import { File } from "foldkit"
import { type Html, type HtmlBuilder } from "foldkit/html"

import type { Model } from "../model.ts"
import * as EducationEntry from "../step/education/entry.ts"
import * as Education from "../step/education/education.ts"
import * as PersonalInfo from "../step/personalInfo.ts"
import * as Skills from "../step/skills/skills.ts"
import * as WorkHistoryEntry from "../step/workHistory/entry.ts"
import * as WorkHistory from "../step/workHistory/workHistory.ts"
import { employmentRange, pluralize } from "./format.ts"

const reviewSection = <ParentMessage>(
    title: string,
    content: Html,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground"
            ),
        ],
        [
            h.h3(
                [h.Class("text-sm font-semibold text-foreground mb-2")],
                [title]
            ),
            content,
        ]
    )
}

const fieldRow = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return value
        ? h.div(
              [h.Class("flex justify-between py-1")],
              [
                  h.span([h.Class("text-sm text-muted-foreground")], [label]),
                  h.span([h.Class("text-sm text-foreground")], [value]),
              ]
          )
        : h.empty
}

const personalInfoSection = <ParentMessage>(
    personalInfo: Model["personalInfo"],
    pronounLabel: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return reviewSection<ParentMessage>(
        "Personal Information",
        h.div(
            [h.Class("divide-y divide-border")],
            [
                fieldRow<ParentMessage>(
                    "Name",
                    `${personalInfo.firstName.value} ${personalInfo.lastName.value}`.trim(),
                    h
                ),
                fieldRow<ParentMessage>("Email", personalInfo.email.value, h),
                fieldRow<ParentMessage>("Phone", personalInfo.phone.value, h),
                fieldRow<ParentMessage>("Pronouns", pronounLabel, h),
                fieldRow<ParentMessage>(
                    "Portfolio",
                    personalInfo.portfolioUrl.value,
                    h
                ),
            ]
        ),
        h
    )
}

const workEntryReview = <ParentMessage>(
    entry: WorkHistoryEntry.Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const title = entry.company.value
        ? `${entry.title.value} at ${entry.company.value}`
        : entry.title.value

    return h.keyed("div")(
        entry.id,
        [h.Class("py-1")],
        [
            h.strong([h.Class("text-sm text-foreground")], [title]),
            ...Option.match(entry.maybeStartDate, {
                onNone: () => [],
                onSome: (start) => [
                    h.p(
                        [h.Class("text-xs text-muted-foreground")],
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
        ]
    )
}

const workHistorySection = <ParentMessage>(
    workHistory: Model["workHistory"],
    h: HtmlBuilder<ParentMessage>
): Html => {
    return reviewSection<ParentMessage>(
        `Work History (${pluralize(workHistory.entries.length, "position", "positions")})`,
        h.div(
            [h.Class("space-y-2")],
            workHistory.entries.map((entry) =>
                workEntryReview<ParentMessage>(entry, h)
            )
        ),
        h
    )
}

const educationTimeline = (entry: EducationEntry.Model): string => {
    if (entry.isCurrentlyEnrolled) {
        return " (Currently enrolled)"
    }

    if (entry.graduationYear) {
        return ` – ${entry.graduationYear}`
    }

    return ""
}

const educationEntryReview = <ParentMessage>(
    entry: EducationEntry.Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const title = entry.fieldOfStudy.value
        ? `${entry.degree.value} in ${entry.fieldOfStudy.value}`
        : entry.degree.value

    return h.keyed("div")(
        entry.id,
        [h.Class("py-1")],
        [
            h.strong([h.Class("text-sm text-foreground")], [title]),
            h.p(
                [h.Class("text-xs text-muted-foreground")],
                [entry.school.value + educationTimeline(entry)]
            ),
        ]
    )
}

const educationSection = <ParentMessage>(
    education: Model["education"],
    h: HtmlBuilder<ParentMessage>
): Html => {
    return reviewSection<ParentMessage>(
        `Education (${pluralize(education.entries.length, "entry", "entries")})`,
        h.div(
            [h.Class("space-y-2")],
            education.entries.map((entry) =>
                educationEntryReview<ParentMessage>(entry, h)
            )
        ),
        h
    )
}

const skillsSection = <ParentMessage>(
    skills: Model["skills"],
    h: HtmlBuilder<ParentMessage>
): Html => {
    return reviewSection<ParentMessage>(
        `Skills (${skills.entries.length})`,
        h.div(
            [h.Class("flex flex-wrap gap-1.5")],
            skills.entries
                .filter((entry) => entry.name.value)
                .map((entry) =>
                    h.keyed("span")(
                        entry.id,
                        [
                            h.Class(
                                "rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        [entry.name.value]
                    )
                )
        ),
        h
    )
}

const coverLetterSection = <ParentMessage>(
    coverLetter: Model["coverLetter"],
    h: HtmlBuilder<ParentMessage>
): Html => {
    return reviewSection<ParentMessage>(
        "Cover Letter",
        coverLetter.content
            ? h.p(
                  [h.Class("text-sm text-foreground whitespace-pre-wrap")],
                  [coverLetter.content]
              )
            : h.p(
                  [h.Class("text-sm text-muted-foreground italic")],
                  ["No cover letter provided"]
              ),
        h
    )
}

const attachmentsSection = <ParentMessage>(
    attachments: Model["attachments"],
    h: HtmlBuilder<ParentMessage>
): Html => {
    return reviewSection<ParentMessage>(
        "Attachments",
        h.div(
            [h.Class("space-y-1")],
            [
                Option.match(attachments.maybeResume, {
                    onNone: () =>
                        h.p(
                            [h.Class("text-sm text-muted-foreground italic")],
                            ["No resume uploaded"]
                        ),
                    onSome: (resume) =>
                        h.div(
                            [h.Class("flex items-center gap-2")],
                            [
                                h.span([], ["📄"]),
                                h.span(
                                    [h.Class("text-sm text-foreground")],
                                    [File.name(resume)]
                                ),
                            ]
                        ),
                }),
                ...attachments.additionalFiles.map((file) =>
                    h.div(
                        [h.Class("flex items-center gap-2")],
                        [
                            h.span([], ["📎"]),
                            h.span(
                                [h.Class("text-sm text-foreground")],
                                [File.name(file)]
                            ),
                        ]
                    )
                ),
            ]
        ),
        h
    )
}

const submitButtonClass = (isEnabled: boolean): string =>
    isEnabled
        ? "w-full rounded-[var(--radius-control)] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
        : "w-full rounded-[var(--radius-surface)] bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground cursor-not-allowed"

const blockedNotice = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.keyed("p")(
        "blocked-notice",
        [h.Class("text-sm text-destructive text-center")],
        ["Fix the errors in the highlighted steps before submitting."]
    )
}

const submissionSection = <ParentMessage>(
    submission: Model["submission"],
    isSubmittable: boolean,
    onSubmit: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return M.value(submission).pipe(
        M.tagsExhaustive({
            NotSubmitted: () =>
                h.keyed("div")(
                    "submit-idle",
                    [h.Class("pt-4 space-y-2")],
                    [
                        ...(isSubmittable
                            ? []
                            : [blockedNotice<ParentMessage>(h)]),
                        h.keyed("button")(
                            "submit",
                            [
                                h.Type("button"),
                                ...(isSubmittable
                                    ? [h.OnClick(onSubmit)]
                                    : [h.Disabled(true)]),
                                h.Class(submitButtonClass(isSubmittable)),
                            ],
                            ["Submit Application"]
                        ),
                    ]
                ),
            Submitting: () =>
                h.keyed("div")(
                    "submit-pending",
                    [h.Class("pt-4")],
                    [
                        h.button(
                            [
                                h.Type("button"),
                                h.Class(
                                    "w-full rounded-lg bg-primary/80 px-4 py-3 text-sm font-semibold text-primary-foreground cursor-wait"
                                ),
                            ],
                            ["Submitting..."]
                        ),
                    ]
                ),
            SubmitSuccess: () =>
                h.keyed("div")(
                    "submit-success",
                    [
                        h.Role("status"),
                        h.Class(
                            "mt-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-center"
                        ),
                    ],
                    [
                        h.p(
                            [h.Class("text-lg font-semibold text-foreground")],
                            ["Application Submitted!"]
                        ),
                        h.p(
                            [h.Class("text-sm text-muted-foreground mt-1")],
                            [
                                "Thank you for applying to work on Foldkit. We'll be in touch!",
                            ]
                        ),
                    ]
                ),
            SubmitError: ({ error }) =>
                h.keyed("div")(
                    "submit-error",
                    [h.Class("space-y-3 pt-4")],
                    [
                        h.keyed("div")(
                            "error-alert",
                            [
                                h.Role("alert"),
                                h.Class(
                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3 text-sm text-destructive"
                                ),
                            ],
                            [error]
                        ),
                        ...(isSubmittable
                            ? []
                            : [blockedNotice<ParentMessage>(h)]),
                        h.keyed("button")(
                            "submit",
                            [
                                h.Type("button"),
                                ...(isSubmittable
                                    ? [h.OnClick(onSubmit)]
                                    : [h.Disabled(true)]),
                                h.Class(submitButtonClass(isSubmittable)),
                            ],
                            ["Try Again"]
                        ),
                    ]
                ),
        })
    )
}

export const review = <ParentMessage>(
    model: Model,
    onSubmit: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const pronounLabel = Option.match(
        model.personalInfo.maybeSelectedPronouns,
        {
            onNone: () => "",
            onSome: (value) =>
                value === "Other" ? model.personalInfo.customPronouns : value,
        }
    )

    return h.div(
        [h.Class("space-y-4")],
        [
            personalInfoSection<ParentMessage>(
                model.personalInfo,
                pronounLabel,
                h
            ),
            workHistorySection<ParentMessage>(model.workHistory, h),
            educationSection<ParentMessage>(model.education, h),
            skillsSection<ParentMessage>(model.skills, h),
            coverLetterSection<ParentMessage>(model.coverLetter, h),
            attachmentsSection<ParentMessage>(model.attachments, h),
            submissionSection<ParentMessage>(
                model.submission,
                PersonalInfo.isComplete(model.personalInfo) &&
                    WorkHistory.isComplete(model.workHistory) &&
                    Education.isComplete(model.education) &&
                    Skills.isComplete(model.skills),
                onSubmit,
                h
            ),
        ]
    )
}
