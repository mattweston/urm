import { Subscription } from "foldkit"

import * as ObjectBuilder from "../objects/builder/submodel.ts"
import { GotObjectBuilderMessage, type Message } from "./forms.message.ts"
import type { Model } from "./forms.model.ts"

export const subscriptions = Subscription.lift(ObjectBuilder.subscriptions)<
    Model,
    Message
>({
    toChildModel: (model) => model.builder,
    toParentMessage: (message) => GotObjectBuilderMessage({ message }),
    when: (model) => model.detail_loaded && model.is_editing,
})
