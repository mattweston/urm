import { Subscription } from "foldkit"

import * as Dice from "./examples/on-change.ts"
import * as Author from "./examples/combining.ts"
import * as Like from "./examples/optimistic-update.ts"
import * as Roll from "./examples/on-demand.ts"
import * as Search from "./examples/streaming.ts"
import * as Weather from "./examples/decoding.ts"
import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

export const subscriptions = Subscription.aggregate<Model, Message>()(
    Subscription.lift(Dice.subscriptions)<Model, Message>({
        toChildModel: (model) => model.dice,
        toParentMessage: (message) => message,
    }),
    Subscription.lift(Weather.subscriptions)<Model, Message>({
        toChildModel: (model) => model.weather,
        toParentMessage: (message) => message,
    }),
    Subscription.lift(Roll.subscriptions)<Model, Message>({
        toChildModel: (model) => model.roll,
        toParentMessage: (message) => message,
    }),
    Subscription.lift(Author.subscriptions)<Model, Message>({
        toChildModel: (model) => model.author,
        toParentMessage: (message) => message,
    }),
    Subscription.lift(Like.subscriptions)<Model, Message>({
        toChildModel: (model) => model.like,
        toParentMessage: (message) => message,
    }),
    Subscription.lift(Search.subscriptions)<Model, Message>({
        toChildModel: (model) => model.search,
        toParentMessage: (message) => message,
    })
)
