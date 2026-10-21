import { Array, Match as M, Option } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"

import type { Message } from "./manage.message.ts"
import { GotAvatarDropMessage } from "./manage.message.ts"
import type { Model } from "./manage.model.ts"
import {
    CreateMember,
    DeleteMember,
    LoadMembers,
    UpdateMember,
    UploadAvatar,
} from "./manage.command.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const blankDraft = () => ({
    first: "",
    last: "",
    twitter: "",
    avatar: "",
    notes: "",
})

const draftFromMember = (member: Model["members"][number]) => ({
    first: member.first,
    last: member.last,
    twitter: member.twitter ?? "",
    avatar: member.avatar ?? "",
    notes: member.notes ?? "",
})

const sortMembers = (members: ReadonlyArray<Model["members"][number]>) =>
    [...members].sort((left, right) =>
        `${left.first} ${left.last}`.localeCompare(
            `${right.first} ${right.last}`
        )
    )

export const init = (): UpdateReturn => [
    {
        loading: true,
        error: null,
        members: [],
        search: "",
        selectedMemberId: "",
        formMode: "detail",
        draft: blankDraft(),
        avatarDrop: Ui.FileDrop.init({ id: "member-avatar-drop" }),
        selectedAvatarFiles: [],
        uploadBusy: false,
        submitting: false,
    },
    [LoadMembers()],
]

export const initDeferred = (): UpdateReturn => {
    const [model] = init()

    return [model, []]
}

export const reflectMembers = (
    model: Model,
    members: Model["members"]
): Model => {
    const nextMembers = sortMembers(members)
    const selected =
        nextMembers.find((member) => member.id === model.selectedMemberId) ??
        nextMembers[0]

    return {
        ...model,
        loading: false,
        error: null,
        members: nextMembers,
        selectedMemberId: selected?.id ?? "",
        draft:
            selected === undefined ? blankDraft() : draftFromMember(selected),
    }
}

export const reflectMembersFailure = (model: Model, error: string): Model => ({
    ...model,
    loading: false,
    error,
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            MembersLoaded: ({ members }) => {
                const nextMembers = sortMembers(members)
                const nextSelected = nextMembers[0]?.id ?? ""

                return [
                    {
                        ...model,
                        loading: false,
                        error: null,
                        members: nextMembers,
                        selectedMemberId: nextSelected,
                        draft:
                            nextMembers[0] === undefined
                                ? blankDraft()
                                : draftFromMember(nextMembers[0]),
                    },
                    [],
                ]
            },
            FailedLoadingMembers: ({ error }) => [
                {
                    ...model,
                    loading: false,
                    error,
                },
                [],
            ],
            MembersSearchChanged: ({ value }) => [
                {
                    ...model,
                    search: value,
                },
                [],
            ],
            SelectedMemberChanged: ({ memberId }) => {
                const maybeMember = Array.findFirst(
                    model.members,
                    (member) => member.id === memberId
                )

                return [
                    {
                        ...model,
                        selectedMemberId: memberId,
                        formMode: "detail",
                        draft: Option.match(maybeMember, {
                            onNone: () => blankDraft(),
                            onSome: (member) => draftFromMember(member),
                        }),
                        selectedAvatarFiles: [],
                        uploadBusy: false,
                    },
                    [],
                ]
            },
            ClickedCreateMember: () => [
                {
                    ...model,
                    formMode: "create",
                    selectedMemberId: "",
                    draft: blankDraft(),
                    selectedAvatarFiles: [],
                    uploadBusy: false,
                },
                [],
            ],
            ClickedEditMember: ({ memberId }) => {
                const maybeMember = Array.findFirst(
                    model.members,
                    (member) => member.id === memberId
                )

                return [
                    {
                        ...model,
                        selectedMemberId: memberId,
                        formMode: "edit",
                        draft: Option.match(maybeMember, {
                            onNone: () => blankDraft(),
                            onSome: (member) => draftFromMember(member),
                        }),
                        selectedAvatarFiles: [],
                        uploadBusy: false,
                    },
                    [],
                ]
            },
            ClickedDeleteMember: ({ memberId }) => [
                {
                    ...model,
                    selectedMemberId: memberId,
                },
                [DeleteMember({ id: memberId })],
            ],
            ClosedMemberForm: () => {
                const maybeMember = Array.findFirst(
                    model.members,
                    (member) => member.id === model.selectedMemberId
                )

                return [
                    {
                        ...model,
                        formMode: "detail",
                        draft: Option.match(maybeMember, {
                            onNone: () => blankDraft(),
                            onSome: (member) => draftFromMember(member),
                        }),
                        selectedAvatarFiles: [],
                        uploadBusy: false,
                    },
                    [],
                ]
            },
            UpdatedMemberDraft: ({ field, value }) => [
                {
                    ...model,
                    draft: {
                        ...model.draft,
                        [field]: value,
                    },
                },
                [],
            ],
            GotAvatarDropMessage: ({ message: dropMessage }) => {
                const {
                    model: nextDrop,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.FileDrop.update(model.avatarDrop, dropMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextFiles = Option.match(maybeOutMessage, {
                    onNone: () => model.selectedAvatarFiles,
                    onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
                        M.tagsExhaustive({
                            ReceivedFiles: ({ files }) =>
                                [...files].slice(0, 1),
                            RejectedNonFiles: () => model.selectedAvatarFiles,
                        })
                    ),
                })

                return [
                    {
                        ...model,
                        avatarDrop: nextDrop,
                        selectedAvatarFiles: nextFiles,
                    },
                    Command.mapMessages(commands, (nextMessage) =>
                        GotAvatarDropMessage({ message: nextMessage })
                    ),
                ]
            },
            RemovedSelectedAvatarFile: ({ fileIndex }) => [
                {
                    ...model,
                    selectedAvatarFiles: model.selectedAvatarFiles.filter(
                        (_, index) => index !== fileIndex
                    ),
                },
                [],
            ],
            ClickedUploadAvatar: () => {
                const file = model.selectedAvatarFiles[0]

                if (model.uploadBusy || file === undefined) {
                    return [model, []]
                }

                return [
                    {
                        ...model,
                        uploadBusy: true,
                        error: null,
                    },
                    [UploadAvatar({ file })],
                ]
            },
            UploadedAvatar: ({ url }) => [
                {
                    ...model,
                    uploadBusy: false,
                    draft: {
                        ...model.draft,
                        avatar: url,
                    },
                    selectedAvatarFiles: [],
                },
                [],
            ],
            UploadAvatarFailed: ({ error }) => [
                {
                    ...model,
                    uploadBusy: false,
                    error,
                },
                [],
            ],
            SubmittedMemberForm: () => {
                if (model.submitting) {
                    return [model, []]
                }

                const first = model.draft.first.trim()
                const last = model.draft.last.trim()

                if (first.length === 0 || last.length === 0) {
                    return [model, []]
                }

                if (model.formMode === "create") {
                    return [
                        {
                            ...model,
                            submitting: true,
                        },
                        [CreateMember({ draft: model.draft })],
                    ]
                }

                if (
                    model.formMode === "edit" &&
                    model.selectedMemberId.length > 0
                ) {
                    return [
                        {
                            ...model,
                            submitting: true,
                        },
                        [
                            UpdateMember({
                                id: model.selectedMemberId,
                                draft: model.draft,
                            }),
                        ],
                    ]
                }

                return [model, []]
            },
            MemberCreated: ({ member }) => [
                {
                    ...model,
                    submitting: false,
                    formMode: "detail",
                    members: sortMembers([...model.members, member]),
                    selectedMemberId: member.id,
                    draft: draftFromMember(member),
                    selectedAvatarFiles: [],
                },
                [],
            ],
            MemberUpdated: ({ member }) => [
                {
                    ...model,
                    submitting: false,
                    formMode: "detail",
                    members: sortMembers(
                        model.members.map((current) =>
                            current.id === member.id ? member : current
                        )
                    ),
                    selectedMemberId: member.id,
                    draft: draftFromMember(member),
                    selectedAvatarFiles: [],
                },
                [],
            ],
            MemberDeleted: ({ memberId }) => {
                const nextMembers = model.members.filter(
                    (member) => member.id !== memberId
                )
                const nextSelected = nextMembers[0]?.id ?? ""
                const maybeSelected = Array.head(nextMembers)

                return [
                    {
                        ...model,
                        submitting: false,
                        members: nextMembers,
                        selectedMemberId: nextSelected,
                        formMode: "detail",
                        draft: Option.match(maybeSelected, {
                            onNone: () => blankDraft(),
                            onSome: (member) => draftFromMember(member),
                        }),
                    },
                    [],
                ]
            },
            MembersActionFailed: ({ error }) => [
                {
                    ...model,
                    submitting: false,
                    uploadBusy: false,
                    error,
                },
                [],
            ],
        })
    )
