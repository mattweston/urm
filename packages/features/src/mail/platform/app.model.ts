import { Schema as S } from "effect"
import { AppRoute } from "./route.ts"
import { Model as TransactionalModel } from "../transactional/editor.ts"
import { Model as ContactsModelSchema } from "../contacts/index.ts"
import { Model as MembersModelSchema } from "../members/index.ts"
import { Model as MembersManageModelSchema } from "../members/manage.ts"
import { Model as NewsletterModelSchema } from "../newsletter/index.ts"
import { Model as SendModelSchema } from "../send/index.ts"
import { Model as SentModelSchema } from "../sent/index.ts"
import { Model as StatsModelSchema } from "../stats/index.ts"
import { Model as SubscriptionsModelSchema } from "../subscriptions/index.ts"
import { Model as TemplatesModelSchema } from "../templates/app.model.ts"

export const AppModel = S.Struct({
    transactional: TransactionalModel,
    route: AppRoute,
    selectedMailId: S.String,
    filter: S.Union([S.Literal("all"), S.Literal("unread")]),
    search: S.String,
    mutedThread: S.Boolean,
    contacts: ContactsModelSchema,
    members: MembersModelSchema,
    membersManage: MembersManageModelSchema,
    newsletter: NewsletterModelSchema,
    send: SendModelSchema,
    sent: SentModelSchema,
    stats: StatsModelSchema,
    subscriptions: SubscriptionsModelSchema,
    templates: TemplatesModelSchema,
    isSidebarCollapsed: S.Boolean,
    isSidebarMobileOpen: S.Boolean,
    sidebarTooltipsRevision: S.Number,
})

export type AppModel = typeof AppModel.Type
