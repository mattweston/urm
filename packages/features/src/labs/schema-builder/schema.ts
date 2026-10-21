import { Schema as S, SchemaIssue } from "effect"

export const FieldKind = S.Literals(["text", "number", "boolean", "choice"])
export const Field = S.Struct({
    id: S.Number,
    name: S.String,
    kind: FieldKind,
    optional: S.Boolean,
    minimum: S.String,
    choices: S.String,
    value: S.String,
    included: S.Boolean,
})
export type Field = typeof Field.Type
export const choices = (field: Field) =>
    field.choices
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)

export const definition_errors = (
    fields: ReadonlyArray<Field>
): ReadonlyArray<string> =>
    fields.flatMap((field) => {
        const errors: string[] = []
        if (
            !/^[a-z][a-z0-9_]*$/.test(field.name) ||
            ["constructor", "prototype"].includes(field.name)
        )
            errors.push(
                `Field ${field.id}: use a lowercase snake_case name, starting with a letter; reserved names are not allowed.`
            )
        if (fields.filter((other) => other.name === field.name).length > 1)
            errors.push(`Duplicate field name: ${field.name}`)
        if (
            field.kind === "choice" &&
            (choices(field).length === 0 ||
                new Set(choices(field)).size !== choices(field).length)
        )
            errors.push(
                `${field.name}: provide unique, comma-separated choices.`
            )
        if (
            (field.kind === "text" || field.kind === "number") &&
            field.minimum !== ""
        ) {
            const minimum = Number(field.minimum)
            if (
                field.minimum.trim() === "" ||
                !Number.isFinite(minimum) ||
                (field.kind === "text" &&
                    (!Number.isInteger(minimum) || minimum < 0))
            )
                errors.push(
                    `${field.name}: minimum must be ${field.kind === "text" ? "a non-negative integer" : "a finite number"}.`
                )
        }
        return errors
    })

const field_schema = (field: Field) => {
    const base =
        field.kind === "text"
            ? field.minimum === ""
                ? S.String
                : S.String.check(S.isMinLength(Number(field.minimum)))
            : field.kind === "number"
              ? field.minimum === ""
                  ? S.NumberFromString
                  : S.NumberFromString.check(
                        S.isGreaterThanOrEqualTo(Number(field.minimum))
                    )
              : field.kind === "boolean"
                ? S.Boolean
                : S.Literals(choices(field))
    return field.optional ? S.optionalKey(base) : base
}

const field_source = (field: Field): string => {
    const base =
        field.kind === "text"
            ? `S.String${field.minimum === "" ? "" : `.check(S.isMinLength(${Number(field.minimum)}))`}`
            : field.kind === "number"
              ? `S.NumberFromString${field.minimum === "" ? "" : `.check(S.isGreaterThanOrEqualTo(${Number(field.minimum)}))`}`
              : field.kind === "boolean"
                ? "S.Boolean"
                : `S.Literals(${JSON.stringify(choices(field))})`
    return field.optional ? `S.optionalKey(${base})` : base
}

const formatter = SchemaIssue.makeFormatterStandardSchemaV1()
export const inspect = (fields: ReadonlyArray<Field>) => {
    const errors = definition_errors(fields)
    const draft = Object.fromEntries(
        fields
            .filter((field) => !field.optional || field.included)
            .map((field) => [
                field.name,
                field.kind === "boolean" && field.value === "true"
                    ? true
                    : field.kind === "boolean" && field.value === "false"
                      ? false
                      : field.value,
            ])
    )
    if (errors.length > 0)
        return { errors, draft, source: "", value: null, issues: [] }
    const schema = S.Struct(
        Object.fromEntries(
            fields.map((field) => [field.name, field_schema(field)])
        )
    )
    const result = S.decodeUnknownResult(schema, { errors: "all" })(draft)
    return {
        errors,
        draft,
        source: `import { Schema as S } from "effect"\n\nexport const Form = S.Struct({\n${fields.map((field) => `    ${JSON.stringify(field.name)}: ${field_source(field)},`).join("\n")}\n})\nexport type Form = typeof Form.Type`,
        value: result._tag === "Success" ? result.success : null,
        issues:
            result._tag === "Failure"
                ? formatter(result.failure.issue).issues.map((issue) => ({
                      path: (issue.path ?? [])
                          .map((part) =>
                              String(typeof part === "object" ? part.key : part)
                          )
                          .join("."),
                      message: issue.message,
                  }))
                : [],
    }
}

export const initial_fields: ReadonlyArray<Field> = [
    {
        id: 1,
        name: "title",
        kind: "text",
        optional: false,
        minimum: "1",
        choices: "",
        value: "Review release",
        included: true,
    },
    {
        id: 2,
        name: "estimate",
        kind: "number",
        optional: true,
        minimum: "0",
        choices: "",
        value: "3",
        included: true,
    },
    {
        id: 3,
        name: "status",
        kind: "choice",
        optional: false,
        minimum: "",
        choices: "open, in_progress, done",
        value: "open",
        included: true,
    },
    {
        id: 4,
        name: "completed",
        kind: "boolean",
        optional: false,
        minimum: "",
        choices: "",
        value: "false",
        included: true,
    },
]
