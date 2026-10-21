import { Schema } from "effect"

/**
 * Form-builder title. Trim before decoding; blank or untrimmed input is rejected.
 */
export const FormTitle = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(200)
)
export type FormTitle = typeof FormTitle.Type

/**
 * Form URL slug using lowercase ASCII letters or digits, separated
 * by single hyphens. Rejects surrounding whitespace, leading/trailing hyphens
 * and repeated hyphens.
 */
export const FormSlug = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(120),
    Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
)
export type FormSlug = typeof FormSlug.Type

export const FormStatus = Schema.Literals(["draft", "published"])
export type FormStatus = typeof FormStatus.Type

/**
 * Form-builder element kinds, including display-only headings and paragraphs
 * alongside answer inputs. An email, number or URL kind labels the element;
 * this literal schema does not validate a respondent's answer.
 */
const FormNonLinkKind = Schema.Literals([
    "heading",
    "paragraph",
    "text",
    "email",
    "number",
    "tel",
    "url",
    "date",
    "textarea",
    "checkbox",
    "select",
    "radio",
])
export const FormFieldKind = Schema.Literals([
    ...FormNonLinkKind.literals,
    "link",
])
export type FormFieldKind = typeof FormFieldKind.Type

export const FormLinkUrl = Schema.Trimmed.check(
    Schema.isMaxLength(2_048),
    Schema.makeFilter(
        (value) => {
            try {
                const url = new URL(value)
                return (
                    (url.protocol === "https:" || url.protocol === "http:") &&
                    url.username === "" &&
                    url.password === ""
                )
            } catch {
                return false
            }
        },
        { message: "Enter an HTTP or HTTPS URL without embedded credentials." }
    )
)
export type FormLinkUrl = typeof FormLinkUrl.Type

/**
 * Form choice separating the displayed label from the submitted value.
 * Both may be empty; option IDs and values are not checked for uniqueness.
 */
export const FormFieldOption = Schema.Struct({
    id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
    label: Schema.String.check(Schema.isMaxLength(500)),
    value: Schema.String.check(Schema.isMaxLength(500)),
})
export type FormFieldOption = typeof FormFieldOption.Type

export const FormFieldOptions = Schema.Array(FormFieldOption).check(
    Schema.isMaxLength(50)
)
export type FormFieldOptions = typeof FormFieldOptions.Type

/**
 * Shared fields for form elements. Display links alone carry a destination.
 * Draft fields allow incomplete URLs while typing; FormDefinition validates
 * destinations before persistence. required describes answer requirements.
 *
 * This validates the editable structure, not submitted answers.
 */
const common_fields = {
    id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
    name: Schema.String.check(Schema.isMaxLength(200)),
    label: Schema.String.check(Schema.isMaxLength(500)),
    description: Schema.String.check(Schema.isMaxLength(2_000)),
    placeholder: Schema.String.check(Schema.isMaxLength(500)),
    required: Schema.Boolean,
    options: FormFieldOptions,
}
export const FormFieldDefinition = Schema.Union([
    Schema.Struct({ ...common_fields, kind: FormNonLinkKind }),
    Schema.Struct({
        ...common_fields,
        kind: Schema.Literal("link"),
        href: Schema.String.check(Schema.isMaxLength(2_048)),
    }),
])
export type FormFieldDefinition = typeof FormFieldDefinition.Type

/**
 * Ordered form-builder elements. Empty forms are valid; each element is checked
 * independently, so unique field IDs and names require separate validation.
 */
export const FormDefinition = Schema.Array(FormFieldDefinition).check(
    Schema.isMaxLength(100),
    Schema.makeFilter(
        (fields) =>
            fields.every(
                (field) =>
                    field.kind !== "link" ||
                    (Schema.is(FormLinkUrl)(field.href) &&
                        field.label.trim() !== "" &&
                        !field.required)
            ),
        {
            message:
                "Each link needs a label and a valid HTTP or HTTPS URL, and must not require an answer.",
        }
    )
)
export type FormDefinition = typeof FormDefinition.Type
