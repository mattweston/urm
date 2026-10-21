import { Option } from "effect"
import { Subscription } from "foldkit"
import { AppMessage, GotNewsletterMessage } from "./platform/app.message.ts"
import type { AppModel } from "./platform/app.model.ts"
import * as Newsletter from "./newsletter/index.ts"

export { AppModel as Model } from "./platform/app.model.ts"
export type { AppModel as ModelType } from "./platform/app.model.ts"
export { AppMessage as Message } from "./platform/app.message.ts"
export type { AppMessage as MessageType } from "./platform/app.message.ts"
export {
    GotContactsMessage,
    GotTransactionalMessage,
    LoadedPublicationEmailTheme,
    GotMembersManageMessage,
    GotMembersMessage,
    GotNewsletterMessage,
    GotSendMessage,
    GotSentMessage,
    GotStatsMessage,
    GotSubscriptionsMessage,
} from "./platform/app.message.ts"
export {
    ChangedUrl,
    CompletedNavigateInternal,
} from "./platform/route.message.ts"
export {
    contactsHref,
    dashboardHref,
    isAppScope,
    mailHref,
    manageMembersHref,
    membersHref,
    newsletterHref,
    sendHref,
    sentHref,
    statsHref,
    subscriptionsHref,
    templatesHref,
} from "./platform/route.ts"
export { init, update } from "./platform/app.update.ts"
export { submodelView as view, titleForRoute } from "./platform/app.view.ts"

const mail_subscriptions = Subscription.lift(Newsletter.subscriptions)<
    AppModel,
    AppMessage
>({
    read: (model) => Option.some(model.newsletter),
    toParentMessage: (message) => GotNewsletterMessage({ message }),
})

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly read: (parentModel: ParentModel) => Option.Option<AppModel>
    readonly toParentMessage: (message: AppMessage) => ParentMessage
    readonly when?: (parentModel: ParentModel) => boolean
}) => Subscription.lift(mail_subscriptions)<ParentModel, ParentMessage>(config)
