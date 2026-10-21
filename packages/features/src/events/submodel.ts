import { Subscription } from "foldkit"

import { subscriptions as eventSubscriptions } from "./platform/app.subscription.ts"
import { Message } from "./platform/app.message.ts"
import { Model } from "./platform/app.model.ts"

export { Model } from "./platform/app.model.ts"
export type { Model as ModelType } from "./platform/app.model.ts"
export { Message } from "./platform/app.message.ts"
export type { Message as MessageType } from "./platform/app.message.ts"
export {
    EventCreated,
    CompletedReorderMenuItems,
    EventDeleted,
    EventUpdated,
    EventsActionFailed,
    EventsLoaded,
    EventsSnapshotLoaded,
    MenuItemCreated,
    MenuItemDeleted,
    MenuItemUpdated,
    MenuItemsLoaded,
    ToggledEventEditing,
    UploadedImage,
    ResolvedEventImageUrls,
    FailedResolvingEventImages,
    UploadImageFailed,
} from "./platform/app.message.ts"
export {
    Event,
    EventDraft,
    MenuItem,
    MenuItemDraft,
} from "./platform/events.data.ts"
export type {
    Event as EventType,
    EventDraft as EventDraftType,
    MenuItem as MenuItemType,
    MenuItemDraft as MenuItemDraftType,
} from "./platform/events.data.ts"
export {
    ChangedUrl,
    CompletedNavigateInternal,
} from "./platform/route.message.ts"
export { eventsHref, isAppScope } from "./platform/route.ts"
export { init, update } from "./platform/app.update.ts"
export { submodelView as view } from "./platform/app.view.ts"

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (parentModel: ParentModel) => Model
    readonly toParentMessage: (message: Message) => ParentMessage
}) => {
    const { maybeEventMapHostId } = Subscription.lift(eventSubscriptions)<
        ParentModel,
        ParentMessage
    >(config)

    return { eventsEventMap: maybeEventMapHostId }
}
