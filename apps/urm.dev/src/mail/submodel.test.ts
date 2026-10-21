import { Option, Schema as S } from "effect"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import {
    EmailNewsletterDraft,
    EmailSubscriptionBundle,
    Member,
} from "./compat-records.ts"
import { DomainId } from "../domains/domain-record.ts"
import * as Newsletter from "@urm/features/mail/newsletter"
import * as Subscriptions from "@urm/features/mail/subscriptions"
import * as Mail from "@urm/features/mail/submodel"
import * as Transactional from "@urm/features/mail/transactional"
import * as Send from "@urm/features/mail/send"

import * as DesktopMail from "./submodel.ts"

const domain_id = S.decodeUnknownSync(DomainId)(
    "j1700000000000000000000000000001"
)
const second_domain_id = S.decodeUnknownSync(DomainId)(
    "j1700000000000000000000000000002"
)
const member = S.decodeUnknownSync(Member)({
    _creationTime: 1,
    _id: "j4700000000000000000000000000001",
    domain_id,
    first: "Matthias",
    last: "Weston",
    twitter: "psynuzoid",
    avatar: "https://example.com/avatar.jpg",
    notes: "Owner",
    updated_at: 1,
})
const contact_id = "j2700000000000000000000000000001"
const subscription_bundle = S.decodeUnknownSync(EmailSubscriptionBundle)({
    subscription: {
        _creationTime: 1,
        _id: "j7700000000000000000000000000001",
        domain_id,
        contact_id,
        list_key: "newsletter",
        status: "subscribed",
        source: "admin",
        created_at: 1,
        updated_at: 1,
        subscribed_at: 1,
    },
    contact: {
        _creationTime: 1,
        _id: contact_id,
        name: "Ada Lovelace",
        is_test_contact: false,
        created_at: 1,
        updated_at: 1,
    },
    email_addresses: [
        {
            _creationTime: 1,
            _id: "j3700000000000000000000000000001",
            contact_id,
            email: "ada@example.com",
            is_primary: true,
            created_at: 1,
            updated_at: 1,
        },
    ],
})
const newsletter_draft = S.decodeUnknownSync(EmailNewsletterDraft)({
    _creationTime: 1,
    _id: "j8700000000000000000000000000001",
    domain_id,
    name: "June update",
    subject: "URM update",
    headline: "Latest from URM",
    body_text: "Draft body",
    list_key: "newsletter",
    updated_at: 1,
})

test("Sent and Stats request their PostgreSQL catalog on route entry", () => {
    const url = Url.make({
        protocol: "http:",
        host: "urm.test",
        port: Option.some("1420"),
        pathname: "/mail/sent",
        search: Option.none(),
        hash: Option.none(),
    })
    const model = DesktopMail.init("/mail")
    const [, sent_commands] = DesktopMail.changed_url(
        model,
        url,
        "/mail/sent",
        workspace_id
    )
    const [, stats_commands] = DesktopMail.changed_url(
        model,
        { ...url, pathname: "/mail/stats" },
        "/mail/stats",
        workspace_id
    )
    expect(sent_commands.map((command) => command.name)).toContain(
        "LoadMailTransactionalDeliveries"
    )
    expect(stats_commands.map((command) => command.name)).toContain(
        "LoadMailStats"
    )
    const [, unscoped] = DesktopMail.changed_url(model, url, "/mail/sent")
    expect(unscoped.map((command) => command.name)).not.toContain(
        "LoadMailTransactionalDeliveries"
    )
})

test("transactional history and restore commands use the active domain adapter", () => {
    const scoped = DesktopMail.with_domain(
        DesktopMail.init("/mail/transactional/auth_password_reset"),
        Option.some(domain_id)
    )
    const [loaded] = DesktopMail.update(
        scoped,
        DesktopMail.loaded_transactional_templates([])
    )
    const [, history_commands] = DesktopMail.update(
        loaded,
        Mail.GotTransactionalMessage({
            message: Transactional.RequestedTransactionalHistory({
                template_id: "auth_password_reset",
                older: false,
            }),
        }),
        workspace_id
    )
    expect(history_commands[0]?.name).toBe("LoadMailTransactionalHistory")
    expect(history_commands[0]?.args).toMatchObject({
        domain_id: workspace_id,
        before_version: null,
    })
    const [, restore_commands] = DesktopMail.update(
        loaded,
        Mail.GotTransactionalMessage({
            message: Transactional.RestoreTransactionalCopy({
                template_id: "auth_password_reset",
                source_version: 0,
            }),
        }),
        workspace_id
    )
    expect(restore_commands[0]?.name).toBe("ChangeMailTransactionalCopy")
    expect(restore_commands[0]?.args).toMatchObject({
        domain_id: workspace_id,
        operation: "restore",
        source_version: 0,
    })
    const switched = DesktopMail.with_domain(
        loaded,
        Option.some(second_domain_id)
    )
    const [stale] = DesktopMail.update(
        switched,
        Mail.GotTransactionalMessage({
            message: Transactional.LoadedTransactionalHistory({
                domain_id,
                template_id: "auth_password_reset",
                request_id: 1,
                before_version: null,
                page: { versions: [], next_before_version: null },
            }),
        })
    )
    expect(stale.transactional).toEqual(switched.transactional)
})

// The account session's workspace, distinct from the legacy domain id the
// adapter still carries in contacts.domain_id.
const workspace_id = "3f1d8f92-0f2f-4a1e-9d0a-2a2f5a7c1b40"

test("Mail send loads recipients from the account workspace and ignores stale scope", () => {
    const [loading, commands] = DesktopMail.request_send_recipients(
        DesktopMail.init("/mail/send"),
        workspace_id
    )
    expect(commands.map((command) => command.name)).toEqual([
        "LoadMailSendRecipients",
    ])
    expect(commands[0]?.args).toMatchObject({ domain_id: workspace_id })
    expect(loading.send.loading_recipients).toBe(true)

    const [stale] = DesktopMail.update(
        loading,
        Mail.GotSendMessage({
            message: Send.SendRecipientsLoaded({
                domain_id: "another-workspace",
                recipients: [
                    { id: "wrong", name: "Wrong", email: "wrong@example.com" },
                ],
            }),
        }),
        workspace_id
    )
    expect(stale.send.recipients).toEqual([])

    const [loaded] = DesktopMail.update(
        stale,
        Mail.GotSendMessage({
            message: Send.SendRecipientsLoaded({
                domain_id: workspace_id,
                recipients: [
                    { id: "contact-id", name: "Ada", email: "ada@example.com" },
                ],
            }),
        }),
        workspace_id
    )
    expect(loaded.send.selectedContactId).toBe("contact-id")
    expect(loaded.send.recipients).toHaveLength(1)

    const [cleared, no_commands] = DesktopMail.request_send_recipients(
        loaded,
        ""
    )
    expect(cleared.send.recipients).toEqual([])
    expect(no_commands).toEqual([])
})

describe("desktop Mail members adapter", () => {
    test("preserves the manage route and reflects one reactive member snapshot", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/members/manage"),
            Option.some(domain_id)
        )
        const [loaded] = DesktopMail.update(
            scoped,
            DesktopMail.loaded_members([member])
        )

        expect(loaded.route._tag).toBe("MembersManage")
        expect(loaded.members.members).toEqual([
            {
                id: member._id,
                first: "Matthias",
                last: "Weston",
                twitter: "psynuzoid",
                avatar: "https://example.com/avatar.jpg",
                notes: "Owner",
                updated_at: 1,
            },
        ])
        expect(loaded.membersManage.members).toEqual(loaded.members.members)
    })

    test("clears both member views when the active domain changes", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/members"),
            Option.some(domain_id)
        )
        const [loaded] = DesktopMail.update(
            scoped,
            DesktopMail.loaded_members([member])
        )
        const switched = DesktopMail.with_domain(
            loaded,
            Option.some(second_domain_id)
        )

        expect(switched.members.members).toEqual([])
        expect(switched.membersManage.members).toEqual([])
        expect(switched.contacts.domain_id).toBe(second_domain_id)
    })
})

describe("desktop Mail subscriptions adapter", () => {
    test("preserves the subscriptions route and loads only stored records", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/subscriptions"),
            Option.some(domain_id)
        )
        const [loaded] = DesktopMail.update(
            scoped,
            DesktopMail.loaded_subscriptions([subscription_bundle])
        )

        expect(loaded.route._tag).toBe("Subscriptions")
        expect(loaded.subscriptions.subscriptions).toEqual([
            {
                contact_id,
                name: "Ada Lovelace",
                email: "ada@example.com",
                list_key: "newsletter",
                status: "subscribed",
                source: "admin",
                subscribed_at: 1,
            },
        ])
    })

    test("translates an explicit subscription to the scoped PostgreSQL mutation", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/subscriptions"),
            Option.some(domain_id)
        )
        const [selected] = DesktopMail.update(
            scoped,
            Mail.GotSubscriptionsMessage({
                message: Subscriptions.SelectedSubscriptionContactChanged({
                    value: contact_id,
                }),
            })
        )
        const [, commands] = DesktopMail.update(
            selected,
            Mail.GotSubscriptionsMessage({
                message: Subscriptions.SubmittedSubscriptionContact(),
            }),
            workspace_id
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SetMailSubscriptionStatus")
        expect(commands[0]?.args).toEqual({
            domain_id: workspace_id,
            contact_id,
            list_key: "newsletter",
            status: "subscribed",
        })
    })
})

describe("desktop Mail newsletter adapter", () => {
    test("opens transactional previews through the client adapter", () => {
        expect(DesktopMail.init("/mail/transactional").route).toEqual({
            _tag: "Transactional",
            template_id: null,
        })
        expect(
            DesktopMail.init("/mail/transactional/auth_password_reset").route
        ).toEqual({ _tag: "Transactional", template_id: "auth_password_reset" })
        expect(
            DesktopMail.init("/mail/transactional/newsletter_basic").route._tag
        ).toBe("NotFound")
    })
    test("opens canonical Content email locations in the existing draft model", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/newsletter"),
            Option.some(domain_id)
        )
        const [with_draft] = DesktopMail.update(
            scoped,
            DesktopMail.loaded_newsletter_drafts([newsletter_draft])
        )
        const editing = DesktopMail.sync_content_location(
            with_draft,
            `/content/email/${newsletter_draft._id}`,
            "?mode=edit"
        )
        const creating = DesktopMail.sync_content_location(
            editing,
            "/content/email/new",
            ""
        )

        expect(editing.route._tag).toBe("Newsletter")
        expect(editing.newsletter.selectedDraftId).toBe(newsletter_draft._id)
        expect(editing.newsletter.editing).toBe(true)
        expect(creating.newsletter.selectedDraftId).toBe("")
        expect(creating.newsletter.editing).toBe(true)
        expect(creating.newsletter.draft.list_key).toBe("newsletter")
    })

    test("seeds and preserves an unsaved built-in Email template", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/newsletter"),
            Option.some(domain_id)
        )
        const creating = DesktopMail.sync_content_location(
            scoped,
            "/content/email/new",
            "?template=email.sample.welcome"
        )
        const [changed] = DesktopMail.update(
            creating,
            Mail.GotNewsletterMessage({
                message: Newsletter.UpdatedNewsletterDraft({
                    field: "subject",
                    value: "A personal welcome",
                }),
            })
        )
        const synchronized_again = DesktopMail.sync_content_location(
            changed,
            "/content/email/new",
            "?template=email.sample.welcome"
        )
        const [, commands] = DesktopMail.update(
            synchronized_again,
            Mail.GotNewsletterMessage({
                message: Newsletter.SubmittedNewsletterDraft(),
            }),
            workspace_id
        )

        expect(creating.newsletter.creation_template_id).toBe(
            "email.sample.welcome"
        )
        expect(creating.newsletter.draft.name).toBe("Welcome email")
        expect(creating.newsletter.selectedDraftId).toBe("")
        expect(synchronized_again.newsletter.draft.subject).toBe(
            "A personal welcome"
        )
        expect(commands[0]?.args).toMatchObject({
            draft: {
                template_source: {
                    template_id: "email.sample.welcome",
                    template_version: 1,
                    provenance: "builtin",
                },
            },
        })
    })

    test("newsletter save adapters carry the originally loaded revision after reactive updates", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/newsletter"),
            Option.some(domain_id)
        )
        const [loaded] = DesktopMail.update(
            scoped,
            DesktopMail.loaded_newsletter_drafts([newsletter_draft])
        )
        const [changed] = DesktopMail.update(
            loaded,
            Mail.GotNewsletterMessage({
                message: Newsletter.UpdatedNewsletterDraft({
                    field: "subject",
                    value: "Local subject",
                }),
            })
        )
        const [remote] = DesktopMail.update(
            changed,
            DesktopMail.loaded_newsletter_drafts([
                {
                    ...newsletter_draft,
                    updated_at: 2,
                    subject: "Remote subject",
                },
            ])
        )
        const reopened = DesktopMail.sync_content_location(
            remote,
            `/content/email/${newsletter_draft._id}`,
            ""
        )
        const preserved = DesktopMail.sync_content_location(
            remote,
            `/content/email/${newsletter_draft._id}`,
            "?edit=true",
            true
        )
        expect(preserved.newsletter.editing).toBe(remote.newsletter.editing)
        expect(preserved.newsletter.draft.subject).toBe("Local subject")
        const [, commands] = DesktopMail.update(
            reopened,
            Mail.GotNewsletterMessage({
                message: Newsletter.SubmittedNewsletterDraft(),
            }),
            workspace_id
        )
        expect(commands[0]?.name).toBe("SaveMailNewsletterDraft")
        expect(commands[0]?.args).toMatchObject({
            domain_id: workspace_id,
            draft: {
                expected_updated_at: 1,
                subject: "Local subject",
                id: newsletter_draft._id,
            },
        })
    })

    test("loads draft and subscribed-recipient snapshots in preview mode", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/newsletter"),
            Option.some(domain_id)
        )
        const [with_draft] = DesktopMail.update(
            scoped,
            DesktopMail.loaded_newsletter_drafts([newsletter_draft])
        )
        const [loaded] = DesktopMail.update(
            with_draft,
            DesktopMail.loaded_newsletter_recipients([subscription_bundle])
        )

        expect(loaded.route._tag).toBe("Newsletter")
        expect(loaded.newsletter.editing).toBe(false)
        expect(loaded.newsletter.selectedDraftId).toBe(newsletter_draft._id)
        expect(loaded.newsletter.recipients).toEqual([
            {
                contact_id,
                name: "Ada Lovelace",
                email: "ada@example.com",
            },
        ])
    })

    test("translates newsletter template saves to the organization API", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/newsletter"),
            Option.some(domain_id)
        )
        const [with_draft] = DesktopMail.update(
            scoped,
            DesktopMail.loaded_newsletter_drafts([newsletter_draft])
        )
        const [named] = DesktopMail.update(
            with_draft,
            Mail.GotNewsletterMessage({
                message: Newsletter.ChangedNewsletterTemplateMetadata({
                    field: "name",
                    value: "Monthly update",
                }),
            })
        )
        const [, commands] = DesktopMail.update(
            named,
            Mail.GotNewsletterMessage({
                message: Newsletter.SubmittedNewsletterTemplate(),
            }),
            workspace_id
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SaveMailNewsletterTemplate")
        expect(commands[0]?.args).toMatchObject({
            domain_id: workspace_id,
            template: {
                expected_revision: 0,
                name: "Monthly update",
                description: "Reusable newsletter template.",
                subject: "URM update",
                headline: "Latest from URM",
                cta_url: null,
                cta_label: null,
            },
        })
    })

    test("translates saving a new draft to a domain-scoped mutation", () => {
        const scoped = DesktopMail.with_domain(
            DesktopMail.init("/mail/newsletter"),
            Option.some(domain_id)
        )
        const [creating] = DesktopMail.update(
            scoped,
            Mail.GotNewsletterMessage({
                message: Newsletter.ClickedNewNewsletterDraft(),
            })
        )
        const [named] = DesktopMail.update(
            creating,
            Mail.GotNewsletterMessage({
                message: Newsletter.UpdatedNewsletterDraft({
                    field: "name",
                    value: " June update ",
                }),
            })
        )
        const [, commands] = DesktopMail.update(
            named,
            Mail.GotNewsletterMessage({
                message: Newsletter.SubmittedNewsletterDraft(),
            }),
            workspace_id
        )

        expect(commands[0]?.name).toBe("SaveMailNewsletterDraft")
        expect(commands[0]?.args).toMatchObject({
            domain_id: workspace_id,
            draft: {
                expected_updated_at: 0,
                name: "June update",
                subject: "",
                headline: "",
                body_text:
                    '{"schema_version":2,"blocks":[{"block_id":"body","type":"rich_text","document":{"type":"doc","children":[{"type":"paragraph","children":[{"type":"text","text":""}]}]}}]}',
                cta_url: null,
                cta_label: null,
                list_key: "newsletter",
            },
        })
    })
})
