import { Option, Schema, pipe } from "effect"
import type { TransactionalEmailTemplateId } from "@urm/email/templates"
import { Route } from "foldkit"
import { taggedStruct } from "foldkit/schema"

export const MailRoute = taggedStruct("Mail")
export const SendRoute = taggedStruct("Send")
export const SentRoute = taggedStruct("Sent")
export const StatsRoute = taggedStruct("Stats")
export const ContactsRoute = taggedStruct("Contacts")
export const MembersRoute = taggedStruct("Members")
export const MembersManageRoute = taggedStruct("MembersManage")
export const NewsletterRoute = taggedStruct("Newsletter")
export const SubscriptionsRoute = taggedStruct("Subscriptions")
export const TemplatesRoute = taggedStruct("Templates")
export const TransactionalTemplateId = Schema.Literals([
    "auth_email_verification",
    "auth_password_reset",
    "auth_password_changed",
])
export const TransactionalRoute = taggedStruct("Transactional", {
    template_id: Schema.NullOr(TransactionalTemplateId),
})
export const NotFoundRoute = taggedStruct("NotFound", { path: Schema.String })

export const AppRoute = Schema.Union([
    MailRoute,
    SendRoute,
    SentRoute,
    StatsRoute,
    ContactsRoute,
    MembersRoute,
    MembersManageRoute,
    NewsletterRoute,
    SubscriptionsRoute,
    TemplatesRoute,
    TransactionalRoute,
    NotFoundRoute,
])

export type AppRoute = typeof AppRoute.Type

const mailRouter = pipe(Route.root, Route.mapTo(MailRoute))
const sendRouter = pipe(Route.literal("send"), Route.mapTo(SendRoute))
const sentRouter = pipe(Route.literal("sent"), Route.mapTo(SentRoute))
const statsRouter = pipe(Route.literal("stats"), Route.mapTo(StatsRoute))
const contactsRouter = pipe(
    Route.literal("contacts"),
    Route.mapTo(ContactsRoute)
)
const membersRouter = pipe(Route.literal("members"), Route.mapTo(MembersRoute))
const newsletterRouter = pipe(
    Route.literal("newsletter"),
    Route.mapTo(NewsletterRoute)
)
const subscriptionsRouter = pipe(
    Route.literal("subscriptions"),
    Route.mapTo(SubscriptionsRoute)
)
const templatesRouter = pipe(
    Route.literal("templates"),
    Route.mapTo(TemplatesRoute)
)

const BASE = "/mail"

export const urlToAppRoute = (pathname: string) =>
    pathname === `${BASE}/transactional` ||
    pathname === `${BASE}/transactional/`
        ? TransactionalRoute({ template_id: null })
        : pathname.startsWith(`${BASE}/transactional/`)
          ? Option.match(
                Schema.decodeUnknownOption(TransactionalTemplateId)(
                    pathname
                        .replace(/\/$/, "")
                        .slice(`${BASE}/transactional/`.length)
                ),
                {
                    onNone: () => NotFoundRoute({ path: pathname }),
                    onSome: (template_id) =>
                        TransactionalRoute({ template_id }),
                }
            )
          : pathname === BASE ||
              pathname === `${BASE}/` ||
              pathname === `${BASE}/dashboard` ||
              pathname === `${BASE}/dashboard/`
            ? MailRoute()
            : pathname === `${BASE}/send/` || pathname === `${BASE}/send`
              ? SendRoute()
              : pathname === `${BASE}/sent/` || pathname === `${BASE}/sent`
                ? SentRoute()
                : pathname === `${BASE}/stats/` || pathname === `${BASE}/stats`
                  ? StatsRoute()
                  : pathname === `${BASE}/members/manage/` ||
                      pathname === `${BASE}/members/manage`
                    ? MembersManageRoute()
                    : pathname === `${BASE}/members/` ||
                        pathname === `${BASE}/members`
                      ? MembersRoute()
                      : pathname === `${BASE}/contacts/` ||
                          pathname === `${BASE}/contacts`
                        ? ContactsRoute()
                        : pathname === `${BASE}/newsletter/` ||
                            pathname === `${BASE}/newsletter`
                          ? NewsletterRoute()
                          : pathname === `${BASE}/subscriptions/` ||
                              pathname === `${BASE}/subscriptions`
                            ? SubscriptionsRoute()
                            : pathname === `${BASE}/templates/` ||
                                pathname === `${BASE}/templates`
                              ? TemplatesRoute()
                              : NotFoundRoute({ path: pathname })

export const mailHref = () => BASE + mailRouter()
export const dashboardHref = () => `${BASE}/dashboard/`
export const sendHref = () => `${BASE}${sendRouter()}/`
export const sentHref = () => `${BASE}${sentRouter()}/`
export const statsHref = () => `${BASE}${statsRouter()}/`
export const contactsHref = () => `${BASE}${contactsRouter()}/`
export const membersHref = () => `${BASE}${membersRouter()}/`
export const manageMembersHref = () => `${BASE}${membersRouter()}/manage/`
export const newsletterHref = () => `${BASE}${newsletterRouter()}/`
export const subscriptionsHref = () => `${BASE}${subscriptionsRouter()}/`
export const templatesHref = () => `${BASE}${templatesRouter()}/`
export const transactionalHref = (template_id?: TransactionalEmailTemplateId) =>
    `${BASE}/transactional${template_id === undefined ? "" : `/${template_id}`}`

export const isAppScope = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)
