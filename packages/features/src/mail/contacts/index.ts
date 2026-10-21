export { module } from "./module.ts"
export {
    Contact,
    ContactDraft,
    ContactEmailAddress,
    ContactEmailAddressDraft,
    blankContactDraft,
    contactDraftFromContact,
    contactFromDraft,
    toCreateContactInput,
    toUiContact,
    toUiContacts,
    toUpdateContactInput,
    primaryContactEmail,
    type Contact as ContactType,
    type ContactDraft as ContactDraftType,
    type ContactEmailAddress as ContactEmailAddressType,
    type ContactEmailAddressDraft as ContactEmailAddressDraftType,
} from "./contacts.data.ts"
export {
    Model,
    ContactsDialogClosed,
    ContactsDialogCreate,
    ContactsDialogEdit,
    ContactsDialogDelete,
    type Model as ContactsModel,
} from "./contacts.model.ts"
export {
    Message,
    ContactsSearchChanged,
    UpdatedContactDraft,
    AddedContactEmailAddress,
    RemovedContactEmailAddress,
    UpdatedContactEmailAddress,
    ChangedPrimaryContactEmail,
    SelectedContactChanged,
    ClickedCreateContact,
    ClickedEditContact,
    ClickedDeleteContact,
    ClosedContactDialog,
    SubmittedContactForm,
    ConfirmedDeleteContact,
    ContactsLoaded,
    ContactCreated,
    ContactUpdated,
    ContactDeleted,
    ContactsActionFailed,
    type Message as ContactsMessage,
} from "./contacts.message.ts"
export {
    LoadContacts,
    CreateContact,
    UpdateContact,
    DeleteContact,
} from "./contacts.command.ts"
export { init, update } from "./contacts.update.ts"
export { view, make_view } from "./contacts.view.ts"
