import { Array, Effect, Option, Schema as S, String } from "effect"
import { Command, Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import * as Ui from "@foldkit/ui"

export const Domain = S.Struct({
    id: S.String,
    name: S.String,
    slug: S.String,
    updated_at: S.Number,
})
export type Domain = typeof Domain.Type

export const Subdomain = S.Struct({
    id: S.String,
    domain_id: S.String,
    name: S.String,
    slug: S.String,
    kind: S.Literals(["prototype", "survey", "documentation"]),
    status: S.Literals(["draft", "live", "disabled"]),
    access: S.Literals(["public", "link", "password"]),
    expires_at: S.optional(S.Number),
    updated_at: S.Number,
})
export type Subdomain = typeof Subdomain.Type

export const SubdomainKind = S.Literals([
    "prototype",
    "survey",
    "documentation",
])
export type SubdomainKind = typeof SubdomainKind.Type
export const SubdomainStatus = S.Literals(["draft", "live", "disabled"])
export type SubdomainStatus = typeof SubdomainStatus.Type
export const SubdomainAccess = S.Literals(["public", "link", "password"])
export type SubdomainAccess = typeof SubdomainAccess.Type

export const Model = S.Struct({
    subdomains: S.Array(Subdomain),
    loading_subdomains: S.Boolean,
    new_domain_name: S.String,
    editing_domain_id: S.Option(S.String),
    editing_domain_name: S.String,
    pending_delete_domain_id: S.Option(S.String),
    new_subdomain_name: S.String,
    new_subdomain_slug: S.String,
    new_subdomain_kind: SubdomainKind,
    new_subdomain_status: SubdomainStatus,
    new_subdomain_access: SubdomainAccess,
    new_subdomain_expires_at: S.String,
    editing_subdomain_id: S.Option(S.String),
    editing_subdomain_name: S.String,
    editing_subdomain_slug: S.String,
    editing_subdomain_kind: SubdomainKind,
    editing_subdomain_status: SubdomainStatus,
    editing_subdomain_access: SubdomainAccess,
    editing_subdomain_expires_at: S.String,
    pending_delete_subdomain_id: S.Option(S.String),
    busy: S.Boolean,
    error: S.Option(S.String),
})

export type Model = typeof Model.Type

export const ChangedNewDomainName = taggedStruct("ChangedNewDomainName", {
    value: S.String,
})
export const SubmittedNewDomain = taggedStruct("SubmittedNewDomain")
export const StartedEditingDomain = taggedStruct("StartedEditingDomain", {
    domain_id: S.String,
    name: S.String,
})
export const ChangedEditingDomainName = taggedStruct(
    "ChangedEditingDomainName",
    {
        value: S.String,
    }
)
export const SubmittedDomainEdit = taggedStruct("SubmittedDomainEdit")
export const CancelledDomainEdit = taggedStruct("CancelledDomainEdit")
export const RequestedDeleteDomain = taggedStruct("RequestedDeleteDomain", {
    domain_id: S.String,
})
export const ConfirmedDeleteDomain = taggedStruct("ConfirmedDeleteDomain")
export const CancelledDeleteDomain = taggedStruct("CancelledDeleteDomain")
export const SucceededCreateDomain = taggedStruct("SucceededCreateDomain", {
    domain: Domain,
})
export const SucceededUpdateDomain = taggedStruct("SucceededUpdateDomain")
export const SucceededDeleteDomain = taggedStruct("SucceededDeleteDomain")
export const ChangedNewSubdomainName = taggedStruct("ChangedNewSubdomainName", {
    value: S.String,
})
export const ChangedNewSubdomainSlug = taggedStruct("ChangedNewSubdomainSlug", {
    value: S.String,
})
export const ChangedNewSubdomainKind = taggedStruct("ChangedNewSubdomainKind", {
    value: SubdomainKind,
})
export const ChangedNewSubdomainStatus = taggedStruct(
    "ChangedNewSubdomainStatus",
    {
        value: SubdomainStatus,
    }
)
export const ChangedNewSubdomainAccess = taggedStruct(
    "ChangedNewSubdomainAccess",
    {
        value: SubdomainAccess,
    }
)
export const ChangedNewSubdomainExpiry = taggedStruct(
    "ChangedNewSubdomainExpiry",
    {
        value: S.String,
    }
)
export const SubmittedNewSubdomain = taggedStruct("SubmittedNewSubdomain")
export const StartedEditingSubdomain = taggedStruct("StartedEditingSubdomain", {
    subdomain_id: S.String,
})
export const ChangedEditingSubdomainName = taggedStruct(
    "ChangedEditingSubdomainName",
    {
        value: S.String,
    }
)
export const ChangedEditingSubdomainSlug = taggedStruct(
    "ChangedEditingSubdomainSlug",
    {
        value: S.String,
    }
)
export const ChangedEditingSubdomainKind = taggedStruct(
    "ChangedEditingSubdomainKind",
    {
        value: SubdomainKind,
    }
)
export const ChangedEditingSubdomainStatus = taggedStruct(
    "ChangedEditingSubdomainStatus",
    {
        value: SubdomainStatus,
    }
)
export const ChangedEditingSubdomainAccess = taggedStruct(
    "ChangedEditingSubdomainAccess",
    {
        value: SubdomainAccess,
    }
)
export const ChangedEditingSubdomainExpiry = taggedStruct(
    "ChangedEditingSubdomainExpiry",
    {
        value: S.String,
    }
)
export const SubmittedSubdomainEdit = taggedStruct("SubmittedSubdomainEdit")
export const CancelledSubdomainEdit = taggedStruct("CancelledSubdomainEdit")
export const RequestedDeleteSubdomain = taggedStruct(
    "RequestedDeleteSubdomain",
    {
        subdomain_id: S.String,
    }
)
export const ConfirmedDeleteSubdomain = taggedStruct("ConfirmedDeleteSubdomain")
export const CancelledDeleteSubdomain = taggedStruct("CancelledDeleteSubdomain")
export const SucceededCreateSubdomain = taggedStruct("SucceededCreateSubdomain")
export const SucceededUpdateSubdomain = taggedStruct("SucceededUpdateSubdomain")
export const SucceededDeleteSubdomain = taggedStruct("SucceededDeleteSubdomain")
export const LoadedSubdomains = taggedStruct("LoadedSubdomains", {
    subdomains: S.Array(Subdomain),
})
export const FailedDomainAction = taggedStruct("FailedDomainAction", {
    error: S.String,
})

export const Message = S.Union([
    ChangedNewDomainName,
    SubmittedNewDomain,
    StartedEditingDomain,
    ChangedEditingDomainName,
    SubmittedDomainEdit,
    CancelledDomainEdit,
    RequestedDeleteDomain,
    ConfirmedDeleteDomain,
    CancelledDeleteDomain,
    SucceededCreateDomain,
    SucceededUpdateDomain,
    SucceededDeleteDomain,
    ChangedNewSubdomainName,
    ChangedNewSubdomainSlug,
    ChangedNewSubdomainKind,
    ChangedNewSubdomainStatus,
    ChangedNewSubdomainAccess,
    ChangedNewSubdomainExpiry,
    SubmittedNewSubdomain,
    StartedEditingSubdomain,
    ChangedEditingSubdomainName,
    ChangedEditingSubdomainSlug,
    ChangedEditingSubdomainKind,
    ChangedEditingSubdomainStatus,
    ChangedEditingSubdomainAccess,
    ChangedEditingSubdomainExpiry,
    SubmittedSubdomainEdit,
    CancelledSubdomainEdit,
    RequestedDeleteSubdomain,
    ConfirmedDeleteSubdomain,
    CancelledDeleteSubdomain,
    SucceededCreateSubdomain,
    SucceededUpdateSubdomain,
    SucceededDeleteSubdomain,
    LoadedSubdomains,
    FailedDomainAction,
])
export type Message = typeof Message.Type

type Commands = ReadonlyArray<Command.Command<Message>>
export type UpdateReturn = readonly [Model, Commands]

const missing_adapter = (operation: string) =>
    Effect.succeed(
        FailedDomainAction({
            error: `No domains persistence adapter installed for ${operation}`,
        })
    )

const CreateDomain = Command.define("CreateDomain", {
    args: { name: S.String, slug: S.String },
    messages: [SucceededCreateDomain, FailedDomainAction],
    execute: () => missing_adapter("creating a domain"),
})
const UpdateDomain = Command.define("UpdateDomain", {
    args: { domain_id: S.String, name: S.String, slug: S.String },
    messages: [SucceededUpdateDomain, FailedDomainAction],
    execute: () => missing_adapter("updating a domain"),
})
const DeleteDomain = Command.define("DeleteDomain", {
    args: { domain_id: S.String },
    messages: [SucceededDeleteDomain, FailedDomainAction],
    execute: () => missing_adapter("deleting a domain"),
})
const CreateSubdomain = Command.define("CreateSubdomain", {
    args: {
        domain_id: S.String,
        name: S.String,
        slug: S.String,
        kind: SubdomainKind,
        status: SubdomainStatus,
        access: SubdomainAccess,
        expires_at: S.NullOr(S.Number),
    },
    messages: [SucceededCreateSubdomain, FailedDomainAction],
    execute: () => missing_adapter("creating a subdomain"),
})
const UpdateSubdomain = Command.define("UpdateSubdomain", {
    args: {
        domain_id: S.String,
        subdomain_id: S.String,
        name: S.String,
        slug: S.String,
        kind: SubdomainKind,
        status: SubdomainStatus,
        access: SubdomainAccess,
        expires_at: S.NullOr(S.Number),
    },
    messages: [SucceededUpdateSubdomain, FailedDomainAction],
    execute: () => missing_adapter("updating a subdomain"),
})
const DeleteSubdomain = Command.define("DeleteSubdomain", {
    args: { domain_id: S.String, subdomain_id: S.String },
    messages: [SucceededDeleteSubdomain, FailedDomainAction],
    execute: () => missing_adapter("deleting a subdomain"),
})

const slugify = (value: string): string =>
    String.trim(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

const expiry_value = (value: string): number | null => {
    if (String.isEmpty(String.trim(value))) {
        return null
    }

    const expires_at = new Date(`${value}T23:59:59.999Z`).getTime()

    return globalThis.Number.isFinite(expires_at) ? expires_at : null
}

const expiry_input = (value: number | undefined): string =>
    value === undefined ? "" : new Date(value).toISOString().slice(0, 10)

export const init = (): Model => ({
    subdomains: [],
    loading_subdomains: true,
    new_domain_name: "",
    editing_domain_id: Option.none(),
    editing_domain_name: "",
    pending_delete_domain_id: Option.none(),
    new_subdomain_name: "",
    new_subdomain_slug: "",
    new_subdomain_kind: "prototype",
    new_subdomain_status: "draft",
    new_subdomain_access: "link",
    new_subdomain_expires_at: "",
    editing_subdomain_id: Option.none(),
    editing_subdomain_name: "",
    editing_subdomain_slug: "",
    editing_subdomain_kind: "prototype",
    editing_subdomain_status: "draft",
    editing_subdomain_access: "link",
    editing_subdomain_expires_at: "",
    pending_delete_subdomain_id: Option.none(),
    busy: false,
    error: Option.none(),
})

export const clear_subdomains = (model: Model): Model => ({
    ...model,
    subdomains: [],
    loading_subdomains: true,
    editing_subdomain_id: Option.none(),
    pending_delete_subdomain_id: Option.none(),
    error: Option.none(),
})

export const loaded_subdomains = (
    subdomains: ReadonlyArray<Subdomain>
): Message => LoadedSubdomains({ subdomains })

export const created_domain = (message: Message): Option.Option<Domain> =>
    message._tag === "SucceededCreateDomain"
        ? Option.some(message.domain)
        : Option.none()

export const update = (
    model: Model,
    message: Message,
    domains: ReadonlyArray<Domain>,
    active_domain_id: Option.Option<string>
): UpdateReturn => {
    switch (message._tag) {
        case "ChangedNewDomainName":
            return [{ ...model, new_domain_name: message.value }, []]
        case "SubmittedNewDomain": {
            const name = String.trim(model.new_domain_name)
            const slug = slugify(name)

            return name.length === 0 || slug.length === 0 || model.busy
                ? [model, []]
                : [
                      { ...model, busy: true, error: Option.none() },
                      [CreateDomain({ name, slug })],
                  ]
        }
        case "StartedEditingDomain":
            return [
                {
                    ...model,
                    editing_domain_id: Option.some(message.domain_id),
                    editing_domain_name: message.name,
                    error: Option.none(),
                },
                [],
            ]
        case "ChangedEditingDomainName":
            return [{ ...model, editing_domain_name: message.value }, []]
        case "SubmittedDomainEdit":
            return Option.match(model.editing_domain_id, {
                onNone: () => [model, []],
                onSome: (domain_id) => {
                    const name = String.trim(model.editing_domain_name)
                    const slug = slugify(name)

                    return name.length === 0 || slug.length === 0 || model.busy
                        ? [model, []]
                        : [
                              {
                                  ...model,
                                  busy: true,
                                  error: Option.none(),
                              },
                              [UpdateDomain({ domain_id, name, slug })],
                          ]
                },
            })
        case "CancelledDomainEdit":
            return [
                {
                    ...model,
                    editing_domain_id: Option.none(),
                    editing_domain_name: "",
                },
                [],
            ]
        case "RequestedDeleteDomain":
            return [
                {
                    ...model,
                    pending_delete_domain_id: Option.some(message.domain_id),
                },
                [],
            ]
        case "ConfirmedDeleteDomain":
            return Option.match(model.pending_delete_domain_id, {
                onNone: () => [model, []],
                onSome: (domain_id) =>
                    domains.length <= 1 ||
                    Option.contains(active_domain_id, domain_id) ||
                    model.busy
                        ? [
                              {
                                  ...model,
                                  error: Option.some(
                                      "Switch domains first. The active or final domain cannot be deleted."
                                  ),
                              },
                              [],
                          ]
                        : [
                              {
                                  ...model,
                                  busy: true,
                                  error: Option.none(),
                              },
                              [DeleteDomain({ domain_id })],
                          ],
            })
        case "CancelledDeleteDomain":
            return [{ ...model, pending_delete_domain_id: Option.none() }, []]
        case "SucceededCreateDomain":
            return [
                {
                    ...model,
                    new_domain_name: "",
                    busy: false,
                    error: Option.none(),
                },
                [],
            ]
        case "SucceededUpdateDomain":
            return [
                {
                    ...model,
                    editing_domain_id: Option.none(),
                    editing_domain_name: "",
                    busy: false,
                    error: Option.none(),
                },
                [],
            ]
        case "SucceededDeleteDomain":
            return [
                {
                    ...model,
                    pending_delete_domain_id: Option.none(),
                    busy: false,
                    error: Option.none(),
                },
                [],
            ]
        case "ChangedNewSubdomainName":
            return [
                {
                    ...model,
                    new_subdomain_name: message.value,
                    new_subdomain_slug: slugify(message.value),
                },
                [],
            ]
        case "ChangedNewSubdomainSlug":
            return [
                { ...model, new_subdomain_slug: slugify(message.value) },
                [],
            ]
        case "ChangedNewSubdomainKind":
            return [{ ...model, new_subdomain_kind: message.value }, []]
        case "ChangedNewSubdomainStatus":
            return [{ ...model, new_subdomain_status: message.value }, []]
        case "ChangedNewSubdomainAccess":
            return [{ ...model, new_subdomain_access: message.value }, []]
        case "ChangedNewSubdomainExpiry":
            return [{ ...model, new_subdomain_expires_at: message.value }, []]
        case "SubmittedNewSubdomain":
            return Option.match(active_domain_id, {
                onNone: () => [model, []],
                onSome: (domain_id) => {
                    const name = String.trim(model.new_subdomain_name)
                    const slug = slugify(model.new_subdomain_slug)

                    return name.length === 0 || slug.length === 0 || model.busy
                        ? [model, []]
                        : [
                              {
                                  ...model,
                                  busy: true,
                                  error: Option.none(),
                              },
                              [
                                  CreateSubdomain({
                                      domain_id,
                                      name,
                                      slug,
                                      kind: model.new_subdomain_kind,
                                      status: model.new_subdomain_status,
                                      access: model.new_subdomain_access,
                                      expires_at: expiry_value(
                                          model.new_subdomain_expires_at
                                      ),
                                  }),
                              ],
                          ]
                },
            })
        case "StartedEditingSubdomain": {
            const subdomain = model.subdomains.find(
                (candidate) => candidate.id === message.subdomain_id
            )

            return subdomain === undefined
                ? [model, []]
                : [
                      {
                          ...model,
                          editing_subdomain_id: Option.some(subdomain.id),
                          editing_subdomain_name: subdomain.name,
                          editing_subdomain_slug: subdomain.slug,
                          editing_subdomain_kind: subdomain.kind,
                          editing_subdomain_status: subdomain.status,
                          editing_subdomain_access: subdomain.access,
                          editing_subdomain_expires_at: expiry_input(
                              subdomain.expires_at
                          ),
                          error: Option.none(),
                      },
                      [],
                  ]
        }
        case "ChangedEditingSubdomainName":
            return [{ ...model, editing_subdomain_name: message.value }, []]
        case "ChangedEditingSubdomainSlug":
            return [
                { ...model, editing_subdomain_slug: slugify(message.value) },
                [],
            ]
        case "ChangedEditingSubdomainKind":
            return [{ ...model, editing_subdomain_kind: message.value }, []]
        case "ChangedEditingSubdomainStatus":
            return [{ ...model, editing_subdomain_status: message.value }, []]
        case "ChangedEditingSubdomainAccess":
            return [{ ...model, editing_subdomain_access: message.value }, []]
        case "ChangedEditingSubdomainExpiry":
            return [
                { ...model, editing_subdomain_expires_at: message.value },
                [],
            ]
        case "SubmittedSubdomainEdit":
            return Option.match(active_domain_id, {
                onNone: () => [model, []],
                onSome: (domain_id) =>
                    Option.match(model.editing_subdomain_id, {
                        onNone: () => [model, []],
                        onSome: (subdomain_id) => {
                            const name = String.trim(
                                model.editing_subdomain_name
                            )
                            const slug = slugify(model.editing_subdomain_slug)

                            return name.length === 0 ||
                                slug.length === 0 ||
                                model.busy
                                ? [model, []]
                                : [
                                      {
                                          ...model,
                                          busy: true,
                                          error: Option.none(),
                                      },
                                      [
                                          UpdateSubdomain({
                                              domain_id,
                                              subdomain_id,
                                              name,
                                              slug,
                                              kind: model.editing_subdomain_kind,
                                              status: model.editing_subdomain_status,
                                              access: model.editing_subdomain_access,
                                              expires_at: expiry_value(
                                                  model.editing_subdomain_expires_at
                                              ),
                                          }),
                                      ],
                                  ]
                        },
                    }),
            })
        case "CancelledSubdomainEdit":
            return [{ ...model, editing_subdomain_id: Option.none() }, []]
        case "RequestedDeleteSubdomain":
            return [
                {
                    ...model,
                    pending_delete_subdomain_id: Option.some(
                        message.subdomain_id
                    ),
                },
                [],
            ]
        case "ConfirmedDeleteSubdomain":
            return Option.match(active_domain_id, {
                onNone: () => [model, []],
                onSome: (domain_id) =>
                    Option.match(model.pending_delete_subdomain_id, {
                        onNone: () => [model, []],
                        onSome: (subdomain_id) => [
                            {
                                ...model,
                                busy: true,
                                error: Option.none(),
                            },
                            [DeleteSubdomain({ domain_id, subdomain_id })],
                        ],
                    }),
            })
        case "CancelledDeleteSubdomain":
            return [
                { ...model, pending_delete_subdomain_id: Option.none() },
                [],
            ]
        case "SucceededCreateSubdomain":
            return [
                {
                    ...model,
                    new_subdomain_name: "",
                    new_subdomain_slug: "",
                    new_subdomain_kind: "prototype",
                    new_subdomain_status: "draft",
                    new_subdomain_access: "link",
                    new_subdomain_expires_at: "",
                    busy: false,
                    error: Option.none(),
                },
                [],
            ]
        case "SucceededUpdateSubdomain":
            return [
                {
                    ...model,
                    editing_subdomain_id: Option.none(),
                    busy: false,
                    error: Option.none(),
                },
                [],
            ]
        case "SucceededDeleteSubdomain":
            return [
                {
                    ...model,
                    pending_delete_subdomain_id: Option.none(),
                    busy: false,
                    error: Option.none(),
                },
                [],
            ]
        case "LoadedSubdomains":
            return [
                {
                    ...model,
                    subdomains: message.subdomains,
                    loading_subdomains: false,
                },
                [],
            ]
        case "FailedDomainAction":
            return [
                {
                    ...model,
                    busy: false,
                    error: Option.some(message.error),
                },
                [],
            ]
    }
}

const field_class =
    "h-10 w-full rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
const card_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
const button_class =
    "inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)] disabled:opacity-50"

const select_view = <Value extends string>(
    id: string,
    label: string,
    value: Value,
    options: ReadonlyArray<Value>,
    on_change: (value: string) => Message,
    h: HtmlBuilder<Message>
): Html =>
    Ui.Select.view(
        {
            id,
            value,
            onChange: on_change,
            toView: (attributes) =>
                h.label(
                    [h.Class("space-y-1")],
                    [
                        h.span(
                            [
                                ...attributes.label,
                                h.Class("text-xs font-medium"),
                            ],
                            [label]
                        ),
                        h.select(
                            [
                                ...attributes.select,
                                h.Name(id),
                                h.Class(field_class),
                            ],
                            options.map((option) =>
                                h.option(
                                    [h.Value(option)],
                                    [option.replace(/_/g, " ")]
                                )
                            )
                        ),
                    ]
                ),
        },
        h
    )

const domain_card = (
    model: Model,
    domain: Domain,
    active_domain_id: Option.Option<string>,
    domain_count: number,
    h: HtmlBuilder<Message>
): Html => {
    const editing = Option.contains(model.editing_domain_id, domain.id)
    const confirming = Option.contains(
        model.pending_delete_domain_id,
        domain.id
    )
    const active = Option.contains(active_domain_id, domain.id)

    return h.keyed("article")(
        domain.id,
        [h.Class(card_class)],
        editing
            ? [
                  h.form(
                      [
                          h.Class("flex flex-col gap-3 sm:flex-row"),
                          h.OnSubmit(SubmittedDomainEdit()),
                      ],
                      [
                          h.input([
                              h.Name("domain_name"),
                              h.Required(true),
                              h.Value(model.editing_domain_name),
                              h.OnInput((value) =>
                                  ChangedEditingDomainName({ value })
                              ),
                              h.Class(field_class),
                          ]),
                          h.button(
                              [h.Type("submit"), h.Class(button_class)],
                              ["Save"]
                          ),
                          h.button(
                              [
                                  h.Type("button"),
                                  h.OnClick(CancelledDomainEdit()),
                                  h.Class(button_class),
                              ],
                              ["Cancel"]
                          ),
                      ]
                  ),
              ]
            : [
                  h.div(
                      [h.Class("flex items-start justify-between gap-4")],
                      [
                          h.div(
                              [h.Class("min-w-0")],
                              [
                                  h.div(
                                      [h.Class("flex items-center gap-2")],
                                      [
                                          h.h3(
                                              [h.Class("font-semibold")],
                                              [domain.name]
                                          ),
                                          active
                                              ? h.span(
                                                    [
                                                        h.Class(
                                                            "rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                                                        ),
                                                    ],
                                                    ["Active"]
                                                )
                                              : h.empty,
                                      ]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-1 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [`${domain.slug} · workspace scope`]
                                  ),
                              ]
                          ),
                          confirming
                              ? h.div(
                                    [h.Class("flex gap-2")],
                                    [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.OnClick(
                                                    ConfirmedDeleteDomain()
                                                ),
                                                h.Class(
                                                    `${button_class} text-destructive`
                                                ),
                                            ],
                                            ["Confirm"]
                                        ),
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.OnClick(
                                                    CancelledDeleteDomain()
                                                ),
                                                h.Class(button_class),
                                            ],
                                            ["Cancel"]
                                        ),
                                    ]
                                )
                              : h.div(
                                    [h.Class("flex gap-2")],
                                    [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.OnClick(
                                                    StartedEditingDomain({
                                                        domain_id: domain.id,
                                                        name: domain.name,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            ["Edit"]
                                        ),
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Disabled(
                                                    active || domain_count <= 1
                                                ),
                                                h.OnClick(
                                                    RequestedDeleteDomain({
                                                        domain_id: domain.id,
                                                    })
                                                ),
                                                h.Class(
                                                    `${button_class} text-destructive`
                                                ),
                                            ],
                                            ["Delete"]
                                        ),
                                    ]
                                ),
                      ]
                  ),
              ]
    )
}

const subdomain_fields = (
    prefix: "new" | "edit",
    model: Model,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => {
    const editing = prefix === "edit"
    const name = editing
        ? model.editing_subdomain_name
        : model.new_subdomain_name
    const slug = editing
        ? model.editing_subdomain_slug
        : model.new_subdomain_slug
    const kind = editing
        ? model.editing_subdomain_kind
        : model.new_subdomain_kind
    const status = editing
        ? model.editing_subdomain_status
        : model.new_subdomain_status
    const access = editing
        ? model.editing_subdomain_access
        : model.new_subdomain_access
    const expires_at = editing
        ? model.editing_subdomain_expires_at
        : model.new_subdomain_expires_at

    return [
        h.label(
            [h.Class("space-y-1")],
            [
                h.span([h.Class("text-xs font-medium")], ["Name"]),
                h.input([
                    h.Name(`${prefix}_subdomain_name`),
                    h.Required(true),
                    h.Value(name),
                    h.OnInput((value) =>
                        editing
                            ? ChangedEditingSubdomainName({ value })
                            : ChangedNewSubdomainName({ value })
                    ),
                    h.Class(field_class),
                ]),
            ]
        ),
        h.label(
            [h.Class("space-y-1")],
            [
                h.span([h.Class("text-xs font-medium")], ["Subdomain"]),
                h.input([
                    h.Name(`${prefix}_subdomain_slug`),
                    h.Required(true),
                    h.Pattern("[a-z0-9]+(?:-[a-z0-9]+)*"),
                    h.Value(slug),
                    h.OnInput((value) =>
                        editing
                            ? ChangedEditingSubdomainSlug({ value })
                            : ChangedNewSubdomainSlug({ value })
                    ),
                    h.Class(field_class),
                ]),
            ]
        ),
        select_view(
            `${prefix}-subdomain-kind`,
            "Kind",
            kind,
            SubdomainKind.literals,
            (value) =>
                Option.match(S.decodeUnknownOption(SubdomainKind)(value), {
                    onNone: () =>
                        editing
                            ? ChangedEditingSubdomainKind({ value: kind })
                            : ChangedNewSubdomainKind({ value: kind }),
                    onSome: (next) =>
                        editing
                            ? ChangedEditingSubdomainKind({ value: next })
                            : ChangedNewSubdomainKind({ value: next }),
                }),
            h
        ),
        select_view(
            `${prefix}-subdomain-status`,
            "Status",
            status,
            SubdomainStatus.literals,
            (value) =>
                Option.match(S.decodeUnknownOption(SubdomainStatus)(value), {
                    onNone: () =>
                        editing
                            ? ChangedEditingSubdomainStatus({ value: status })
                            : ChangedNewSubdomainStatus({ value: status }),
                    onSome: (next) =>
                        editing
                            ? ChangedEditingSubdomainStatus({ value: next })
                            : ChangedNewSubdomainStatus({ value: next }),
                }),
            h
        ),
        select_view(
            `${prefix}-subdomain-access`,
            "Access",
            access,
            SubdomainAccess.literals,
            (value) =>
                Option.match(S.decodeUnknownOption(SubdomainAccess)(value), {
                    onNone: () =>
                        editing
                            ? ChangedEditingSubdomainAccess({ value: access })
                            : ChangedNewSubdomainAccess({ value: access }),
                    onSome: (next) =>
                        editing
                            ? ChangedEditingSubdomainAccess({ value: next })
                            : ChangedNewSubdomainAccess({ value: next }),
                }),
            h
        ),
        h.label(
            [h.Class("space-y-1")],
            [
                h.span(
                    [h.Class("text-xs font-medium")],
                    ["Expires (optional)"]
                ),
                h.input([
                    h.Type("date"),
                    h.Name(`${prefix}_subdomain_expiry`),
                    h.Value(expires_at),
                    h.OnInput((value) =>
                        editing
                            ? ChangedEditingSubdomainExpiry({ value })
                            : ChangedNewSubdomainExpiry({ value })
                    ),
                    h.Class(field_class),
                ]),
            ]
        ),
    ]
}

const subdomain_card = (
    model: Model,
    subdomain: Subdomain,
    domain: Domain,
    pages_href: string,
    h: HtmlBuilder<Message>
): Html => {
    const editing = Option.contains(model.editing_subdomain_id, subdomain.id)
    const confirming = Option.contains(
        model.pending_delete_subdomain_id,
        subdomain.id
    )

    return h.keyed("article")(
        subdomain.id,
        [h.Class(card_class)],
        editing
            ? [
                  h.form(
                      [
                          h.Class("grid gap-3 md:grid-cols-2 xl:grid-cols-3"),
                          h.OnSubmit(SubmittedSubdomainEdit()),
                      ],
                      [
                          ...subdomain_fields("edit", model, h),
                          h.div(
                              [
                                  h.Class(
                                      "flex items-end justify-end gap-2 md:col-span-2 xl:col-span-3"
                                  ),
                              ],
                              [
                                  h.button(
                                      [h.Type("submit"), h.Class(button_class)],
                                      ["Save"]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(CancelledSubdomainEdit()),
                                          h.Class(button_class),
                                      ],
                                      ["Cancel"]
                                  ),
                              ]
                          ),
                      ]
                  ),
              ]
            : [
                  h.div(
                      [h.Class("flex items-start justify-between gap-4")],
                      [
                          h.div(
                              [h.Class("min-w-0")],
                              [
                                  h.h3(
                                      [h.Class("font-semibold")],
                                      [subdomain.name]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-1 font-mono text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [`${subdomain.slug}.${domain.slug}`]
                                  ),
                              ]
                          ),
                          h.div(
                              [h.Class("flex flex-wrap justify-end gap-2")],
                              [
                                  subdomain.kind,
                                  subdomain.status,
                                  subdomain.access,
                              ].map((label) =>
                                  h.span(
                                      [
                                          h.Class(
                                              "rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [label]
                                  )
                              )
                          ),
                      ]
                  ),
                  subdomain.expires_at === undefined
                      ? h.empty
                      : h.p(
                            [h.Class("mt-3 text-xs text-muted-foreground")],
                            [
                                `Expires ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(subdomain.expires_at))}`,
                            ]
                        ),
                  h.div(
                      [h.Class("mt-4 flex justify-end gap-2")],
                      confirming
                          ? [
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(ConfirmedDeleteSubdomain()),
                                        h.Class(
                                            `${button_class} text-destructive`
                                        ),
                                    ],
                                    ["Confirm"]
                                ),
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(CancelledDeleteSubdomain()),
                                        h.Class(button_class),
                                    ],
                                    ["Cancel"]
                                ),
                            ]
                          : [
                                h.a(
                                    [h.Href(pages_href), h.Class(button_class)],
                                    ["Pages"]
                                ),
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(
                                            StartedEditingSubdomain({
                                                subdomain_id: subdomain.id,
                                            })
                                        ),
                                        h.Class(button_class),
                                    ],
                                    ["Edit"]
                                ),
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(
                                            RequestedDeleteSubdomain({
                                                subdomain_id: subdomain.id,
                                            })
                                        ),
                                        h.Class(
                                            `${button_class} text-destructive`
                                        ),
                                    ],
                                    ["Delete"]
                                ),
                            ]
                  ),
              ]
    )
}

export type ViewInputs = {
    readonly domains: ReadonlyArray<Domain>
    readonly can_manage_subdomains?: boolean
    readonly active_domain_id: Option.Option<string>
    readonly pages_subdomain_href: (slug: string) => string
}

const content_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html => {
    const active_domain = Option.flatMap(inputs.active_domain_id, (domain_id) =>
        Array.findFirst(inputs.domains, (domain) => domain.id === domain_id)
    )

    return h.main(
        [
            h.Class(
                "mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h1(
                        [h.Class("text-3xl font-bold tracking-tight")],
                        ["Domains & publishing"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Manage workspace domains and the temporary or permanent subdomains published beneath them.",
                        ]
                    ),
                ]
            ),
            Option.match(model.error, {
                onNone: () => h.empty,
                onSome: (error) =>
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            ),
                        ],
                        [error]
                    ),
            }),
            h.section(
                [h.Class("space-y-4")],
                [
                    h.div(
                        [h.Class("flex items-end justify-between gap-4")],
                        [
                            h.div(
                                [],
                                [
                                    h.h2(
                                        [h.Class("text-xl font-semibold")],
                                        ["Workspace domains"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        ["The switcher uses these data scopes."]
                                    ),
                                ]
                            ),
                            h.span(
                                [h.Class("text-sm text-muted-foreground")],
                                [`${inputs.domains.length} total`]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-3 lg:grid-cols-2")],
                        [
                            ...inputs.domains.map((domain) =>
                                domain_card(
                                    model,
                                    domain,
                                    inputs.active_domain_id,
                                    inputs.domains.length,
                                    h
                                )
                            ),
                            h.form(
                                [
                                    h.Class(
                                        `${card_class} flex flex-col gap-3 border-dashed`
                                    ),
                                    h.OnSubmit(SubmittedNewDomain()),
                                ],
                                [
                                    h.h3(
                                        [h.Class("font-semibold")],
                                        ["Add domain"]
                                    ),
                                    h.input([
                                        h.Name("domain_name"),
                                        h.Required(true),
                                        h.Value(model.new_domain_name),
                                        h.Placeholder("Workspace name"),
                                        h.OnInput((value) =>
                                            ChangedNewDomainName({ value })
                                        ),
                                        h.Class(field_class),
                                    ]),
                                    h.button(
                                        [
                                            h.Type("submit"),
                                            h.Disabled(model.busy),
                                            h.Class(button_class),
                                        ],
                                        ["Create domain"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            Option.match(active_domain, {
                onNone: () =>
                    h.section(
                        [h.Class(card_class)],
                        [
                            "Create or select a domain to manage published subdomains.",
                        ]
                    ),
                onSome: (domain) =>
                    h.fieldset(
                        [
                            h.Class("space-y-4"),
                            h.Disabled(inputs.can_manage_subdomains === false),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.h2(
                                        [h.Class("text-xl font-semibold")],
                                        ["Independent subdomains"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            `Publish a prototype, survey, or documentation site beneath ${domain.slug}.`,
                                        ]
                                    ),
                                ]
                            ),
                            model.loading_subdomains
                                ? h.div(
                                      [h.Class(card_class)],
                                      ["Loading subdomains..."]
                                  )
                                : h.div(
                                      [h.Class("grid gap-3 lg:grid-cols-2")],
                                      model.subdomains.map((subdomain) =>
                                          subdomain_card(
                                              model,
                                              subdomain,
                                              domain,
                                              inputs.pages_subdomain_href(
                                                  subdomain.slug
                                              ),
                                              h
                                          )
                                      )
                                  ),
                            h.form(
                                [
                                    h.Class(
                                        `${card_class} grid gap-3 border-dashed md:grid-cols-2 xl:grid-cols-3`
                                    ),
                                    h.OnSubmit(SubmittedNewSubdomain()),
                                ],
                                [
                                    h.h3(
                                        [
                                            h.Class(
                                                "font-semibold md:col-span-2 xl:col-span-3"
                                            ),
                                        ],
                                        ["Add subdomain"]
                                    ),
                                    ...subdomain_fields("new", model, h),
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-end justify-end md:col-span-2 xl:col-span-3"
                                            ),
                                        ],
                                        [
                                            h.button(
                                                [
                                                    h.Type("submit"),
                                                    h.Disabled(model.busy),
                                                    h.Class(button_class),
                                                ],
                                                ["Create subdomain"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
            }),
        ]
    )
}

export const view = Submodel.defineView<Model, Message, ViewInputs>(
    content_view
)
