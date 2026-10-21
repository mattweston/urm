import { Array } from "effect"
import { makeRules, Rule } from "foldkit/fieldValidation"

const profanity_words = [
    "damn",
    "hell",
    "crap",
    "shit",
    "fuck",
    "bitch",
    "asshole",
]

const containsHtmlTags = (value: string): boolean =>
    value.includes("<") && value.includes(">")

const containsMaliciousContent = (value: string): boolean =>
    /script|javascript:|on\w+\s*=/i.test(value)

const containsProfanity = (value: string): boolean => {
    const lower_value = value.toLowerCase()
    return Array.some(profanity_words, (word) =>
        new RegExp(`\\b${word}\\b`).test(lower_value)
    )
}

const safeTextRules: ReadonlyArray<Rule.Rule<string>> = [
    [(value: string) => !containsHtmlTags(value), "HTML tags are not allowed"],
    [
        (value: string) => !containsMaliciousContent(value),
        "Potentially malicious content detected",
    ],
    [
        (value: string) => !containsProfanity(value),
        "Please keep your language appropriate",
    ],
]

export const authorRules = makeRules({
    required: "Author is required",
    rules: safeTextRules,
    isEmpty: (value) => value.trim() === "",
})

export const contentRules = makeRules({
    required: "Comment is required",
    rules: safeTextRules,
    isEmpty: (value) => value.trim() === "",
})

export const sanitizeCommentText = (value: string): string =>
    value.replace(/<[^>]*>/g, "").trim()
