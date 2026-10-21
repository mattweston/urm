import { Model } from "./manage.model.ts"
import { Message } from "./manage.message.ts"
import {
    init,
    initDeferred,
    reflectMembers,
    reflectMembersFailure,
    update,
} from "./manage.update.ts"
import { view } from "./manage.view.ts"
export { make_view } from "./manage.view.ts"

export const manage = {
    name: "members-manage",
    model: Model,
    message: Message,
    init,
    update,
    view,
} as const

export {
    Model,
    Message,
    init,
    initDeferred,
    reflectMembers,
    reflectMembersFailure,
    update,
    view,
}
export {
    MemberDraft,
    type MemberDraft as MemberDraftType,
} from "./manage.model.ts"
export {
    ClickedCreateMember,
    ClickedDeleteMember,
    ClickedEditMember,
    ClickedUploadAvatar,
    GotAvatarDropMessage,
    ClosedMemberForm,
    MemberCreated,
    MemberDeleted,
    MembersActionFailed,
    MembersSearchChanged,
    MemberUpdated,
    SelectedMemberChanged,
    SubmittedMemberForm,
    UploadAvatarFailed,
    UploadedAvatar,
    UpdatedMemberDraft,
} from "./manage.message.ts"
