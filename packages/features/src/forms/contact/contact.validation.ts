import { allValid, makeRules, Rule, validate } from "foldkit/fieldValidation"
import type { Model } from "./contact.model.ts"

export const name_rules = makeRules({
    required: "Name is required",
    rules: [Rule.minLength(2, "Name must be at least 2 characters")],
})

export const email_rules = makeRules({
    required: "Email is required",
    rules: [Rule.email("Enter a valid email address")],
})

export const message_rules = makeRules({
    required: "Message is required",
    rules: [Rule.minLength(10, "Message must be at least 10 characters")],
})

export const validate_name = validate(name_rules)
export const validate_email = validate(email_rules)
export const validate_message = validate(message_rules)

export const is_contact_form_valid = (model: Model): boolean =>
    allValid([
        [model.name, name_rules],
        [model.email, email_rules],
        [model.message, message_rules],
    ])
