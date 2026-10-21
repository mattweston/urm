import { Array, Option } from "effect"
import { File } from "foldkit"
import * as Foldkit from "foldkit"
import * as Ui from "@foldkit/ui"
import { type Html, type HtmlBuilder } from "foldkit/html"

import { toImageSrc } from "@urm/utils/media"

import type { Model } from "./manage.model.ts"
import {
    ClickedCreateMember,
    ClickedDeleteMember,
    ClickedEditMember,
    ClickedUploadAvatar,
    ClosedMemberForm,
    MembersSearchChanged,
    RemovedSelectedAvatarFile,
    SelectedMemberChanged,
    SubmittedMemberForm,
    UpdatedMemberDraft,
    GotAvatarDropMessage,
    type Message,
} from "./manage.message.ts"

const fullName = (first: string, last: string) => `${first} ${last}`.trim()

const initials = (first: string, last: string) =>
    fullName(first, last)
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase()

const emptyAvatar = (first: string, last: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName(first, last) || "Unknown Member")}&size=192&background=c8c8c8&color=ffffff`

const filteredMembers = (model: Model) => {
    const query = model.search.trim().toLowerCase()

    return model.members.filter((member) => {
        if (query.length === 0) return true

        return [
            member.first,
            member.last,
            member.twitter ?? "",
            member.notes ?? "",
        ]
            .join(" ")
            .toLowerCase()
            .includes(query)
    })
}

const selectedMember = (model: Model) =>
    Option.match(
        Array.findFirst(
            model.members,
            ({ id }) => id === model.selectedMemberId
        ),
        {
            onNone: () => Array.head(model.members),
            onSome: (member) => Option.some(member),
        }
    )

const avatarDropZone = (model: Model, h: HtmlBuilder<Message>): Html => {
    return h.submodel({
        slotId: model.avatarDrop.id,
        model: model.avatarDrop,
        view: Ui.FileDrop.view,
        viewInputs: {
            multiple: false,
            accept: ["image/png", "image/jpeg", "image/webp", "image/gif"],
            toView: (attributes) =>
                h.label(
                    [
                        ...attributes.root,
                        h.Class(
                            "flex flex-col items-center gap-2 cursor-pointer rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-muted px-6 py-10 text-center hover:border-primary select-none data-[drag-over]:border-primary data-[drag-over]:bg-accent"
                        ),
                    ],
                    [
                        h.p(
                            [h.Class("text-base font-medium text-foreground")],
                            ["Drop avatar or click to browse"]
                        ),
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            ["PNG, JPG, WEBP, or GIF. Maximum 1 MB."]
                        ),
                        h.input(attributes.input),
                    ]
                ),
        },
        toParentMessage: (message) => GotAvatarDropMessage({ message }),
    })
}

const avatarPreview = (
    model: Model,
    h: HtmlBuilder<Message>,
    can_upload: boolean
): Html => {
    const file = model.selectedAvatarFiles[0]

    return h.div(
        [h.Class("space-y-3")],
        [
            h.div(
                [h.Class("flex flex-col gap-3 sm:flex-row sm:items-start")],
                [
                    h.div(
                        [
                            h.Class(
                                "flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#c8c8c8]"
                            ),
                        ],
                        [
                            h.img([
                                h.Src(
                                    model.draft.avatar.length > 0
                                        ? toImageSrc(model.draft.avatar)
                                        : emptyAvatar(
                                              model.draft.first,
                                              model.draft.last
                                          )
                                ),
                                h.Alt(
                                    `${fullName(model.draft.first, model.draft.last) || "Member"} avatar`
                                ),
                                h.Class("size-full object-cover"),
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Class("min-w-0 flex-1 space-y-2")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Avatar"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    model.draft.avatar.length > 0
                                        ? "Current avatar URL is set."
                                        : can_upload
                                          ? "Upload a new profile image or paste a URL."
                                          : "Paste an image URL to set the avatar.",
                                ]
                            ),
                            model.selectedAvatarFiles.length === 0
                                ? h.empty
                                : h.div(
                                      [h.Class("space-y-2")],
                                      model.selectedAvatarFiles.map(
                                          (avatarFile, fileIndex) =>
                                              h.div(
                                                  [
                                                      h.Class(
                                                          "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2"
                                                      ),
                                                  ],
                                                  [
                                                      h.div(
                                                          [h.Class("min-w-0")],
                                                          [
                                                              h.p(
                                                                  [
                                                                      h.Class(
                                                                          "truncate text-sm font-medium text-foreground"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      File.name(
                                                                          avatarFile
                                                                      ),
                                                                  ]
                                                              ),
                                                              h.p(
                                                                  [
                                                                      h.Class(
                                                                          "text-xs text-muted-foreground"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      String(
                                                                          File.size(
                                                                              avatarFile
                                                                          )
                                                                      ),
                                                                  ]
                                                              ),
                                                          ]
                                                      ),
                                                      h.button(
                                                          [
                                                              h.Type("button"),
                                                              h.OnClick(
                                                                  RemovedSelectedAvatarFile(
                                                                      {
                                                                          fileIndex,
                                                                      }
                                                                  )
                                                              ),
                                                              h.Class(
                                                                  "text-sm text-muted-foreground hover:text-destructive"
                                                              ),
                                                          ],
                                                          ["Remove"]
                                                      ),
                                                  ]
                                              )
                                      )
                                  ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                !can_upload ||
                                                    model.uploadBusy ||
                                                    model.selectedAvatarFiles
                                                        .length === 0
                                            ),
                                            h.OnClick(ClickedUploadAvatar()),
                                            h.Class(
                                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            ),
                                        ],
                                        [
                                            model.uploadBusy
                                                ? "Uploading..."
                                                : "Upload avatar",
                                        ]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(
                                                UpdatedMemberDraft({
                                                    field: "avatar",
                                                    value: "",
                                                })
                                            ),
                                            h.Class(
                                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        ["Clear avatar"]
                                    ),
                                ]
                            ),
                            h.fieldset(
                                [h.Disabled(!can_upload)],
                                [avatarDropZone(model, h)]
                            ),
                            file === undefined
                                ? h.empty
                                : h.div(
                                      [
                                          h.Class(
                                              "text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [`Selected: ${File.name(file)}`]
                                  ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const memberForm = (
    model: Model,
    h: HtmlBuilder<Message>,
    can_upload: boolean
): Html => {
    return h.fieldset(
        [
            h.Disabled(model.submitting),
            h.Class(
                "rounded-[2rem] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-4")],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [h.Class("text-xl font-semibold")],
                                [
                                    model.formMode === "create"
                                        ? "Create Member"
                                        : "Edit Member",
                                ]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    model.formMode === "create"
                                        ? can_upload
                                            ? "Add a new member and upload a profile image."
                                            : "Add a new member and an optional avatar URL."
                                        : "Update details or swap the profile image.",
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ClosedMemberForm()),
                            h.Class(
                                "text-sm text-muted-foreground hover:text-foreground"
                            ),
                        ],
                        ["Close"]
                    ),
                ]
            ),
            h.div([h.Class("mt-6")], [avatarPreview(model, h, can_upload)]),
            h.form(
                [
                    h.Class("mt-6 grid gap-4 md:grid-cols-2"),
                    h.OnSubmit(SubmittedMemberForm()),
                ],
                [
                    textField(
                        "First name",
                        model.draft.first,
                        (value) =>
                            UpdatedMemberDraft({ field: "first", value }),
                        h
                    ),
                    textField(
                        "Last name",
                        model.draft.last,
                        (value) => UpdatedMemberDraft({ field: "last", value }),
                        h
                    ),
                    textField(
                        "Twitter",
                        model.draft.twitter,
                        (value) =>
                            UpdatedMemberDraft({ field: "twitter", value }),
                        h
                    ),
                    textField(
                        "Avatar URL",
                        model.draft.avatar,
                        (value) =>
                            UpdatedMemberDraft({ field: "avatar", value }),
                        h
                    ),
                    h.div(
                        [h.Class("md:col-span-2")],
                        [
                            h.label(
                                [h.Class("space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "block text-sm font-medium text-foreground"
                                            ),
                                        ],
                                        ["Notes"]
                                    ),
                                    h.textarea([
                                        h.Value(model.draft.notes),
                                        h.Class(
                                            "min-h-32 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                                        ),
                                        h.OnInput((value) =>
                                            UpdatedMemberDraft({
                                                field: "notes",
                                                value,
                                            })
                                        ),
                                    ]),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "md:col-span-2 flex items-center justify-end gap-2 pt-2"
                            ),
                        ],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ClosedMemberForm()),
                                    h.Class(
                                        "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                ["Cancel"]
                            ),
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Disabled(model.submitting),
                                    h.Class(
                                        "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                [model.submitting ? "Saving..." : "Save"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const memberDetail = (
    model: Model,
    h: HtmlBuilder<Message>,
    can_write: boolean
): Html => {
    const maybeMember = selectedMember(model)

    return Option.match(maybeMember, {
        onNone: () =>
            h.div(
                [
                    h.Class(
                        "rounded-[2rem] border-(length:--surface-border-width) border-dashed border-border bg-card p-10 text-center text-muted-foreground"
                    ),
                ],
                ["Select a member to see details."]
            ),
        onSome: (member) =>
            h.div(
                [
                    h.Class(
                        "rounded-[2rem] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-start justify-between gap-4"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex items-center gap-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex size-48 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#c8c8c8]"
                                            ),
                                        ],
                                        [
                                            h.img([
                                                h.Src(
                                                    member.avatar
                                                        ? toImageSrc(
                                                              member.avatar
                                                          )
                                                        : emptyAvatar(
                                                              member.first,
                                                              member.last
                                                          )
                                                ),
                                                h.Alt(
                                                    `${fullName(member.first, member.last) || "Member"} avatar`
                                                ),
                                                h.Class(
                                                    "size-full object-cover"
                                                ),
                                            ]),
                                        ]
                                    ),
                                    h.div(
                                        [],
                                        [
                                            h.h2(
                                                [
                                                    h.Class(
                                                        "text-2xl font-semibold tracking-tight"
                                                    ),
                                                ],
                                                [
                                                    fullName(
                                                        member.first,
                                                        member.last
                                                    ) || "No Name",
                                                ]
                                            ),
                                            member.twitter
                                                ? h.p(
                                                      [
                                                          h.Class(
                                                              "text-sm text-muted-foreground"
                                                          ),
                                                      ],
                                                      [`@${member.twitter}`]
                                                  )
                                                : h.p(
                                                      [
                                                          h.Class(
                                                              "text-sm text-muted-foreground"
                                                          ),
                                                      ],
                                                      ["No Twitter handle"]
                                                  ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                !can_write || model.submitting
                                            ),
                                            h.OnClick(
                                                ClickedEditMember({
                                                    memberId: member.id,
                                                })
                                            ),
                                            h.Class(
                                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            ),
                                        ],
                                        ["Edit"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                !can_write || model.submitting
                                            ),
                                            h.OnClick(
                                                ClickedDeleteMember({
                                                    memberId: member.id,
                                                })
                                            ),
                                            h.Class(
                                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-destructive/20 bg-destructive/10 px-4 text-sm font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                        ],
                                        ["Delete"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("mt-6 grid gap-4 md:grid-cols-2")],
                        [
                            detailField(
                                "Email",
                                member.twitter
                                    ? `https://twitter.com/${member.twitter}`
                                    : undefined,
                                member.twitter ? `@${member.twitter}` : "-",
                                h
                            ),
                            detailField(
                                "Updated",
                                undefined,
                                new Date(member.updated_at).toLocaleString(),
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "md:col-span-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                                            ),
                                        ],
                                        ["Notes"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 whitespace-pre-wrap text-sm text-foreground"
                                            ),
                                        ],
                                        [
                                            member.notes.length > 0
                                                ? member.notes
                                                : "No notes",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
    })
}

const detailField = (
    label: string,
    href: string | undefined,
    value: string,
    h: HtmlBuilder<Message>
): Html => {
    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    ),
                ],
                [label]
            ),
            href === undefined
                ? h.div([h.Class("mt-2 text-foreground")], [value])
                : h.a(
                      [
                          h.Href(href),
                          h.Class(
                              "mt-2 inline-flex text-foreground underline-offset-4 hover:underline"
                          ),
                      ],
                      [value]
                  ),
        ]
    )
}

const textField = (
    label: string,
    value: string,
    onInput: (value: string) => Message,
    h: HtmlBuilder<Message>
): Html => {
    return h.label(
        [h.Class("space-y-2")],
        [
            h.span(
                [h.Class("block text-sm font-medium text-foreground")],
                [label]
            ),
            h.input([
                h.Value(value),
                h.Class(
                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                ),
                h.OnInput((nextValue) => onInput(nextValue)),
            ]),
        ]
    )
}

export const make_view = (
    options: { can_write?: boolean; can_upload?: boolean } = {}
) =>
    Foldkit.Submodel.defineView<Model, Message>(
        (model, h: HtmlBuilder<Message>): Html => {
            const members = filteredMembers(model)

            return h.div(
                [
                    h.Class(
                        "h-full min-h-0 overflow-hidden bg-background text-foreground"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "mx-auto grid h-full max-w-[1600px] gap-4 overflow-hidden p-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:p-6"
                            ),
                        ],
                        [
                            h.aside(
                                [
                                    h.Class(
                                        "flex h-full flex-col overflow-hidden rounded-[2rem] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "border-b-(length:--surface-border-width) border-border p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-lg font-semibold"
                                                    ),
                                                ],
                                                ["Members"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    options.can_upload === false
                                                        ? "Add, edit, and delete members."
                                                        : "Add, edit, upload avatars, and delete members.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "flex min-w-0 items-center gap-2 border-b-(length:--surface-border-width) border-border p-4"
                                            ),
                                        ],
                                        [
                                            h.input([
                                                h.Type("search"),
                                                h.Value(model.search),
                                                h.Placeholder("Search"),
                                                h.Class(
                                                    "h-10 min-w-0 flex-1 rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 text-sm outline-none focus:border-ring"
                                                ),
                                                h.OnInput((value) =>
                                                    MembersSearchChanged({
                                                        value,
                                                    })
                                                ),
                                            ]),
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Disabled(
                                                        options.can_write ===
                                                            false ||
                                                            model.submitting
                                                    ),
                                                    h.OnClick(
                                                        ClickedCreateMember()
                                                    ),
                                                    h.Class(
                                                        "inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                    ),
                                                ],
                                                ["New"]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "min-h-0 flex-1 overflow-auto p-2"
                                            ),
                                        ],
                                        [
                                            members.length === 0
                                                ? h.div(
                                                      [
                                                          h.Class(
                                                              "p-4 text-sm text-muted-foreground"
                                                          ),
                                                      ],
                                                      ["No members"]
                                                  )
                                                : h.div(
                                                      [
                                                          h.Class(
                                                              "flex flex-col gap-2"
                                                          ),
                                                      ],
                                                      members.map((member) =>
                                                          h.button(
                                                              [
                                                                  h.Type(
                                                                      "button"
                                                                  ),
                                                                  h.OnClick(
                                                                      SelectedMemberChanged(
                                                                          {
                                                                              memberId:
                                                                                  member.id,
                                                                          }
                                                                      )
                                                                  ),
                                                                  h.Class(
                                                                      member.id ===
                                                                          model.selectedMemberId
                                                                          ? "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/30 bg-muted px-4 py-3 text-left [box-shadow:var(--shadow-surface)]"
                                                                          : "flex items-center justify-between gap-3 rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-4 py-3 text-left transition hover:border-border/70 hover:bg-accent [box-shadow:var(--shadow-control)]"
                                                                  ),
                                                              ],
                                                              [
                                                                  h.div(
                                                                      [
                                                                          h.Class(
                                                                              "min-w-0"
                                                                          ),
                                                                      ],
                                                                      [
                                                                          h.div(
                                                                              [
                                                                                  h.Class(
                                                                                      "truncate font-medium"
                                                                                  ),
                                                                              ],
                                                                              [
                                                                                  fullName(
                                                                                      member.first,
                                                                                      member.last
                                                                                  ) ||
                                                                                      "No Name",
                                                                              ]
                                                                          ),
                                                                          member.twitter
                                                                              ? h.div(
                                                                                    [
                                                                                        h.Class(
                                                                                            "truncate text-sm text-muted-foreground"
                                                                                        ),
                                                                                    ],
                                                                                    [
                                                                                        `@${member.twitter}`,
                                                                                    ]
                                                                                )
                                                                              : h.div(
                                                                                    [
                                                                                        h.Class(
                                                                                            "truncate text-sm text-muted-foreground"
                                                                                        ),
                                                                                    ],
                                                                                    [
                                                                                        "No Twitter handle",
                                                                                    ]
                                                                                ),
                                                                      ]
                                                                  ),
                                                                  h.div(
                                                                      [
                                                                          h.Class(
                                                                              "text-xs text-muted-foreground"
                                                                          ),
                                                                      ],
                                                                      [
                                                                          initials(
                                                                              member.first,
                                                                              member.last
                                                                          ),
                                                                      ]
                                                                  ),
                                                              ]
                                                          )
                                                      )
                                                  ),
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [h.Class("h-full min-h-0 overflow-auto")],
                                [
                                    ...(model.error === null
                                        ? []
                                        : [
                                              h.div(
                                                  [
                                                      h.Role("alert"),
                                                      h.Class(
                                                          "mb-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                                                      ),
                                                  ],
                                                  [model.error]
                                              ),
                                          ]),
                                    model.formMode === "create" ||
                                    model.formMode === "edit"
                                        ? memberForm(
                                              model,
                                              h,
                                              options.can_upload !== false
                                          )
                                        : memberDetail(
                                              model,
                                              h,
                                              options.can_write !== false
                                          ),
                                ]
                            ),
                        ]
                    ),
                ]
            )
        }
    )

export const view = make_view()
