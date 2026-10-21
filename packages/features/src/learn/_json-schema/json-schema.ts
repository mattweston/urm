import { JsonSchema, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Normalize"),
    S.Literal("Emit"),
    S.Literal("OpenAPI"),
    S.Literal("References"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Normalize",
    "Emit",
    "OpenAPI",
    "References",
]

export const NormalizeCase = S.Union([
    S.Literal("Draft07"),
    S.Literal("Draft2020"),
    S.Literal("OpenAPI30"),
    S.Literal("OpenAPI31"),
])
export type NormalizeCase = typeof NormalizeCase.Type

export const EmitCase = S.Union([
    S.Literal("Draft07"),
    S.Literal("Draft04"),
    S.Literal("Meta"),
])
export type EmitCase = typeof EmitCase.Type

export const OpenApiCase = S.Union([
    S.Literal("Components"),
    S.Literal("Collision"),
    S.Literal("MultipleRoots"),
])
export type OpenApiCase = typeof OpenApiCase.Type

export const ReferenceCase = S.Union([
    S.Literal("Definitions"),
    S.Literal("Relocation"),
    S.Literal("Models"),
])
export type ReferenceCase = typeof ReferenceCase.Type

export const Model = S.Struct({
    stage: Stage,
    normalizeCase: NormalizeCase,
    emitCase: EmitCase,
    openApiCase: OpenApiCase,
    referenceCase: ReferenceCase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Normalize: {
        eyebrow: "many inputs → one canonical dialect",
        title: "Normalize Draft-07 and OpenAPI schemas into Draft 2020-12 documents",
        description:
            'The fromSchema* functions accept raw schema objects and normalize them into Document<"draft-2020-12">. Definitions are separated from the root schema, references are relocated when structures move, and dialect-specific keywords are translated.',
        code: `const raw:
    JsonSchema.JsonSchema = {
        type: "array",
        items: [
            { type: "string" },
            { type: "number" }
        ],
        additionalItems: {
            type: "boolean"
        },
        definitions: {
            User: {
                type: "object"
            }
        }
    }

const document =
    JsonSchema
        .fromSchemaDraft07(
            raw
        )

// dialect: draft-2020-12
// prefixItems replaces tuple items
// definitions stored separately`,
        apis: [
            "JsonSchema.fromSchemaDraft07",
            "JsonSchema.fromSchemaDraft2020_12",
            "JsonSchema.fromSchemaOpenApi3_0",
            "JsonSchema.fromSchemaOpenApi3_1",
            "JsonSchema.Document",
            "JsonSchema.Definitions",
        ],
        notice: "The canonical internal document dialect is Draft 2020-12. Unknown custom keywords are generally copied opaquely, but conversions reject collisions that would become active keywords with different meaning.",
    },

    Emit: {
        eyebrow: "canonical document → legacy dialect",
        title: "Emit Draft-07 or Draft-04 from the canonical Draft 2020-12 form",
        description:
            "toDocumentDraft07 and toDocumentDraft04 translate modern structures into older dialect syntax. Tuple schemas move from prefixItems to items arrays, definitions become the legacy definitions keyword, and older dialect limitations can make conversion fail.",
        code: `const canonical =
    JsonSchema
        .fromSchemaDraft2020_12({
            type: "array",
            prefixItems: [
                { type: "string" },
                { type: "number" }
            ],
            items: {
                type: "boolean"
            }
        })

const draft07 =
    JsonSchema
        .toDocumentDraft07(
            canonical
        )

// items: [string, number]
// additionalItems: boolean schema`,
        apis: [
            "JsonSchema.toDocumentDraft07",
            "JsonSchema.toDocumentDraft04",
            "JsonSchema.META_SCHEMA_URI_DRAFT_04",
            "JsonSchema.META_SCHEMA_URI_DRAFT_07",
            "JsonSchema.META_SCHEMA_URI_DRAFT_2020_12",
        ],
        notice: "Conversions preserve what the target dialect can represent and throw for known semantics with no faithful target equivalent instead of silently dropping them.",
    },

    OpenAPI: {
        eyebrow: "shared definitions → components.schemas",
        title: "Emit OpenAPI 3.1 multi-documents with stable component keys",
        description:
            "toMultiDocumentOpenApi3_1 accepts multiple canonical root schemas sharing one definitions pool. It rewrites #/$defs references to #/components/schemas, sanitizes invalid component keys, and resolves sanitization collisions deterministically.",
        code: `const multi:
    JsonSchema.MultiDocument<
        "draft-2020-12"
    > = {
        dialect:
            "draft-2020-12",
        schemas: [
            {
                $ref:
                    "#/$defs/User Model"
            },
            {
                $ref:
                    "#/$defs/Order/Item"
            }
        ],
        definitions: {
            "User Model": {
                type: "string"
            },
            User_Model: {
                type: "number"
            },
            "Order/Item": {
                type: "object"
            }
        }
    }

const openapi =
    JsonSchema
        .toMultiDocumentOpenApi3_1(
            multi
        )`,
        apis: [
            "JsonSchema.toMultiDocumentOpenApi3_1",
            "JsonSchema.MultiDocument",
            "JsonSchema.Definitions",
        ],
        notice: "OpenAPI component keys must match ^[a-zA-Z0-9.\\-_]+$. Invalid definition names are sanitized; if two names would collide, numeric suffixes are allocated deterministically.",
    },

    References: {
        eyebrow: "definitions + reference relocation",
        title: "Documents detach definitions while converters keep local references coherent",
        description:
            "Document stores the root schema and definitions separately. Conversion APIs rewrite local reference prefixes to match the target dialect—$defs, definitions, or components.schemas—and relocate references when structural keywords move.",
        code: `const canonical =
    JsonSchema
        .fromSchemaDraft2020_12({
            type: "object",
            properties: {
                user: {
                    $ref:
                        "#/$defs/User"
                }
            },
            $defs: {
                User: {
                    type: "string"
                }
            }
        })

canonical.definitions.User
// { type: "string" }

JsonSchema
    .toDocumentDraft07(
        canonical
    )
    .schema
// ref becomes #/definitions/User`,
        apis: [
            "JsonSchema.JsonSchema",
            "JsonSchema.Dialect",
            "JsonSchema.Type",
            "JsonSchema.Definitions",
            "JsonSchema.Document",
            "JsonSchema.MultiDocument",
            "JsonSchema.fromSchemaDraft2020_12",
            "JsonSchema.toDocumentDraft07",
        ],
        notice: "A Document's schema field intentionally excludes the root definitions collection. Definitions live in a separate map and are reattached using the target dialect's reference convention during emission.",
    },
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const json_text = (value: unknown): string => JSON.stringify(value, null, 0)

const object_keys = (value: Record<string, unknown>): string =>
    Object.keys(value).sort().join(", ")

const error_text = (run: () => unknown): string => {
    try {
        run()
        return "no error"
    } catch (error: unknown) {
        return error instanceof Error ? error.message : String(error)
    }
}

// -----------------------------------------------------------------------------
// NORMALIZE SNAPSHOT
// -----------------------------------------------------------------------------

export type NormalizeSnapshot = Readonly<{
    mode: NormalizeCase
    inputDialect: string
    canonicalDialect: string
    rootSchema: string
    definitions: string
    keywordChange: string
    referenceChange: string
}>

export const normalize_snapshot = (model: Model): NormalizeSnapshot => {
    if (model.normalizeCase === "Draft2020") {
        const document = JsonSchema.fromSchemaDraft2020_12({
            type: "object",
            properties: {
                value: {
                    $ref: "#/$defs/Value",
                },
            },
            $defs: {
                Value: {
                    type: "string",
                },
            },
        })

        return {
            mode: model.normalizeCase,
            inputDialect: "draft-2020-12",
            canonicalDialect: document.dialect,
            rootSchema: json_text(document.schema),
            definitions: object_keys(document.definitions),
            keywordChange: "$defs detached from root",
            referenceChange: "#/$defs/Value unchanged",
        }
    }

    if (model.normalizeCase === "OpenAPI30") {
        const document = JsonSchema.fromSchemaOpenApi3_0({
            type: "string",
            nullable: true,
            example: "ok",
            properties: {
                user: {
                    $ref: "#/components/schemas/User",
                },
            },
        })

        return {
            mode: model.normalizeCase,
            inputDialect: "openapi-3.0",
            canonicalDialect: document.dialect,
            rootSchema: json_text(document.schema),
            definitions: object_keys(document.definitions),
            keywordChange:
                'nullable + type → type:["string","null"] · example → examples',
            referenceChange: "components.schemas refs → $defs refs",
        }
    }

    if (model.normalizeCase === "OpenAPI31") {
        const document = JsonSchema.fromSchemaOpenApi3_1({
            type: "object",
            example: {
                name: "Ada",
            },
            properties: {
                user: {
                    $ref: "#/components/schemas/User",
                },
            },
        })

        return {
            mode: model.normalizeCase,
            inputDialect: "openapi-3.1",
            canonicalDialect: document.dialect,
            rootSchema: json_text(document.schema),
            definitions: object_keys(document.definitions),
            keywordChange: "example → examples",
            referenceChange: "components.schemas refs → $defs refs",
        }
    }

    const document = JsonSchema.fromSchemaDraft07({
        type: "array",
        items: [
            {
                type: "string",
            },
            {
                type: "number",
            },
        ],
        additionalItems: {
            type: "boolean",
        },
        definitions: {
            User: {
                type: "object",
            },
        },
    })

    return {
        mode: model.normalizeCase,
        inputDialect: "draft-07",
        canonicalDialect: document.dialect,
        rootSchema: json_text(document.schema),
        definitions: object_keys(document.definitions),
        keywordChange: "items[] → prefixItems · additionalItems → items",
        referenceChange: "definitions detached into document.definitions",
    }
}

// -----------------------------------------------------------------------------
// EMIT SNAPSHOT
// -----------------------------------------------------------------------------

export type EmitSnapshot = Readonly<{
    mode: EmitCase
    targetDialect: string
    schema: string
    definitions: string
    tupleRule: string
    metaSchema: string
    unsupportedExample: string
}>

export const emit_snapshot = (model: Model): EmitSnapshot => {
    const canonical = JsonSchema.fromSchemaDraft2020_12({
        type: "array",
        prefixItems: [
            {
                type: "string",
            },
            {
                type: "number",
            },
        ],
        items: {
            type: "boolean",
        },
        $defs: {
            Value: {
                type: "integer",
                minimum: 1,
            },
        },
    })

    const unsupported = error_text(() =>
        JsonSchema.toDocumentDraft07(
            JsonSchema.fromSchemaDraft2020_12({
                type: "array",
                unevaluatedItems: false,
            })
        )
    )

    if (model.emitCase === "Draft04") {
        const document = JsonSchema.toDocumentDraft04(canonical)

        return {
            mode: model.emitCase,
            targetDialect: document.dialect,
            schema: json_text(document.schema),
            definitions: object_keys(document.definitions),
            tupleRule:
                "prefixItems → items[] · trailing items → additionalItems",
            metaSchema: JsonSchema.META_SCHEMA_URI_DRAFT_04,
            unsupportedExample: unsupported,
        }
    }

    if (model.emitCase === "Meta") {
        return {
            mode: model.emitCase,
            targetDialect: "constants",
            schema: "three stable meta-schema URIs",
            definitions: "—",
            tupleRule: "—",
            metaSchema: [
                JsonSchema.META_SCHEMA_URI_DRAFT_04,
                JsonSchema.META_SCHEMA_URI_DRAFT_07,
                JsonSchema.META_SCHEMA_URI_DRAFT_2020_12,
            ].join("\n"),
            unsupportedExample: unsupported,
        }
    }

    const document = JsonSchema.toDocumentDraft07(canonical)

    return {
        mode: model.emitCase,
        targetDialect: document.dialect,
        schema: json_text(document.schema),
        definitions: object_keys(document.definitions),
        tupleRule: "prefixItems → items[] · trailing items → additionalItems",
        metaSchema: JsonSchema.META_SCHEMA_URI_DRAFT_07,
        unsupportedExample: unsupported,
    }
}

// -----------------------------------------------------------------------------
// OPENAPI SNAPSHOT
// -----------------------------------------------------------------------------

const open_api_multi = (): JsonSchema.MultiDocument<"draft-2020-12"> => ({
    dialect: "draft-2020-12",
    schemas: [
        {
            type: "object",
            properties: {
                user: {
                    $ref: "#/$defs/User Model",
                },
                order: {
                    $ref: "#/$defs/Order/Item",
                },
            },
        },
        {
            $ref: "#/$defs/User_Model",
        },
    ],
    definitions: {
        "User Model": {
            type: "string",
        },
        User_Model: {
            type: "number",
        },
        "Order/Item": {
            type: "object",
            properties: {
                id: {
                    type: "integer",
                },
            },
        },
    },
})

export type OpenApiSnapshot = Readonly<{
    mode: OpenApiCase
    dialect: string
    rootCount: number
    definitionKeys: string
    firstRoot: string
    secondRoot: string
    collision: string
    componentReference: string
}>

export const open_api_snapshot = (model: Model): OpenApiSnapshot => {
    const converted = JsonSchema.toMultiDocumentOpenApi3_1(open_api_multi())

    const keys = Object.keys(converted.definitions).sort()

    const collisionKey =
        keys.find((key: string) => key.startsWith("User_Model_")) ?? "none"

    return {
        mode: model.openApiCase,
        dialect: converted.dialect,
        rootCount: converted.schemas.length,
        definitionKeys: keys.join(", "),
        firstRoot: json_text(converted.schemas[0]),
        secondRoot: json_text(converted.schemas[1]),
        collision: `"User Model" collides with valid "User_Model" → ${collisionKey}`,
        componentReference: "#/components/schemas/...",
    }
}

// -----------------------------------------------------------------------------
// REFERENCES / MODELS SNAPSHOT
// -----------------------------------------------------------------------------

export type ReferenceSnapshot = Readonly<{
    mode: ReferenceCase
    dialects: string
    primitiveTypes: string
    rootSchema: string
    definitions: string
    canonicalRef: string
    draft07Ref: string
    openApiRef: string
}>

export const reference_snapshot = (model: Model): ReferenceSnapshot => {
    const canonical = JsonSchema.fromSchemaDraft2020_12({
        type: "object",
        properties: {
            user: {
                $ref: "#/$defs/User",
            },
        },
        $defs: {
            User: {
                type: "string",
            },
        },
    })

    const draft07 = JsonSchema.toDocumentDraft07(canonical)

    const openApi = JsonSchema.toMultiDocumentOpenApi3_1({
        dialect: "draft-2020-12",
        schemas: [canonical.schema],
        definitions: canonical.definitions,
    })

    const rootProperties = canonical.schema["properties"] as
        | Record<string, unknown>
        | undefined

    const draftProperties = draft07.schema["properties"] as
        | Record<string, unknown>
        | undefined

    const openProperties = openApi.schemas[0]["properties"] as
        | Record<string, unknown>
        | undefined

    const get_ref = (
        properties: Record<string, unknown> | undefined
    ): string => {
        const user = properties?.["user"]

        if (typeof user !== "object" || user === null || Array.isArray(user)) {
            return "—"
        }

        const ref = (user as Record<string, unknown>)["$ref"]

        return typeof ref === "string" ? ref : "—"
    }

    return {
        mode: model.referenceCase,
        dialects:
            "draft-04 · draft-07 · draft-2020-12 · openapi-3.1 · openapi-3.0",
        primitiveTypes:
            "string · number · boolean · array · object · null · integer",
        rootSchema: json_text(canonical.schema),
        definitions: json_text(canonical.definitions),
        canonicalRef: get_ref(rootProperties),
        draft07Ref: get_ref(draftProperties),
        openApiRef: get_ref(openProperties),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedJsonSchemaStage: {
        stage: Stage,
    },
    SelectedJsonSchemaNormalizeCase: {
        normalizeCase: NormalizeCase,
    },
    SelectedJsonSchemaEmitCase: {
        emitCase: EmitCase,
    },
    SelectedJsonSchemaOpenApiCase: {
        openApiCase: OpenApiCase,
    },
    SelectedJsonSchemaReferenceCase: {
        referenceCase: ReferenceCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Normalize",
    normalizeCase: "Draft07",
    emitCase: "Draft07",
    openApiCase: "Components",
    referenceCase: "Definitions",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type NormalizeCasePayload = Readonly<{
    normalizeCase: NormalizeCase
}>

type EmitCasePayload = Readonly<{
    emitCase: EmitCase
}>

type OpenApiCasePayload = Readonly<{
    openApiCase: OpenApiCase
}>

type ReferenceCasePayload = Readonly<{
    referenceCase: ReferenceCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedJsonSchemaStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedJsonSchemaNormalizeCase: ({
            normalizeCase,
        }: NormalizeCasePayload) => ({
            model: modifyFields(model, {
                normalizeCase: () => normalizeCase,
            }),
        }),

        SelectedJsonSchemaEmitCase: ({ emitCase }: EmitCasePayload) => ({
            model: modifyFields(model, {
                emitCase: () => emitCase,
            }),
        }),

        SelectedJsonSchemaOpenApiCase: ({
            openApiCase,
        }: OpenApiCasePayload) => ({
            model: modifyFields(model, {
                openApiCase: () => openApiCase,
            }),
        }),

        SelectedJsonSchemaReferenceCase: ({
            referenceCase,
        }: ReferenceCasePayload) => ({
            model: modifyFields(model, {
                referenceCase: () => referenceCase,
            }),
        }),
    })
