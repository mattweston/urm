/**
 * # Sanitisation Utils
 *
 * Input validation and cleanup for user-generated comments: HTML stripping,
 * malicious-pattern detection, profanity filtering, length and character limits.
 */

// TODO : Use this
// import DOMPurify from 'dompurify';
// export function sanitizeHtmlNew(text: string): string {
//     return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
// }

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// No /g. These are shared module-level objects used with `.test()`, and a global
// regex carries `lastIndex` across calls — with /g the same input alternated
// true, false, true on successive calls.
const dangerousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onload, onerror, etc.
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /<link[^>]*>/i,
    /<meta[^>]*>/i,
    /data:text\/html/i,
    /vbscript:/i,
    /<svg[^>]*>/i,
]

// Whitelist. Rejects all non-ASCII, so any name with an accent fails validation.
const allowedCharsPattern = /^[a-zA-Z0-9\s.,!?_'"@#$%&():;-]*$/

const profanityWords = [
    "crap",
    "shit",
    "fuck",
    "bitch",
    "asshole",
    "cunt",
    "nigger",
    "arsehole",
    "tits",
    "cum",
    "retard",
    "bastard",
    "fucked",
    "fuckd",
    "fucker",
    "cunting",
    "shithead",
    "fuckoff",
    "piss",
    "pissoff",
]

export function containsMaliciousContent(text: string): boolean {
    for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) {
            return true
        }
    }

    // Any angle-bracket pair counts, so "a < b > c" is rejected too. Deliberate:
    // this is a reject-list for untrusted comment text, not an HTML parser.
    if (text.includes("<") && text.includes(">")) {
        return true
    }

    return false
}

export function containsProfanity(text: string): boolean {
    const lowerText = text.toLowerCase()

    for (const word of profanityWords) {
        // Word boundaries, so "classic" does not match "ass".
        const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "i")
        if (pattern.test(lowerText)) {
            return true
        }
    }

    return false
}

export function censorProfanity(text: string): string {
    let result = text

    for (const word of profanityWords) {
        const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi")
        const replacement = "*".repeat(word.length)
        result = result.replace(pattern, replacement)
    }

    return result
}

// Decode first, then strip. The reverse order turns encoded markup back into
// live markup: "&lt;script&gt;" survives tag-stripping as text, then decodes to
// "<script>" in the output. `&amp;` is decoded last so "&amp;lt;" yields the
// literal "&lt;" rather than a second decode round into "<".
export function sanitizeHtml(text: string): string {
    return text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/<[^>]*>/g, "")
        .trim()
}

export function sanitizeComment(content: string): string {
    content = sanitizeHtml(content)
    content = content.trim()
    return content
}

export function sanitizeAuthor(author: string): string {
    author = sanitizeHtml(author)
    author = author.trim()
    return author
}

// Collects every failure rather than short-circuiting, so a form can show all of
// them at once.
export function validateCommentInput(
    author: string,
    content: string
): string[] {
    const errors: string[] = []

    if (author.length < 1 || author.length > 100) {
        errors.push("Author name must be 1-100 characters")
    }

    if (content.length < 1 || content.length > 1000) {
        errors.push("Comment must be 1-1000 characters")
    }

    if (containsMaliciousContent(author)) {
        errors.push(
            "Author name contains invalid characters or potentially malicious content"
        )
    }

    if (containsMaliciousContent(content)) {
        errors.push(
            "Comment contains invalid characters or potentially malicious content"
        )
    }

    if (containsProfanity(author)) {
        errors.push("Author name contains inappropriate language")
    }

    if (containsProfanity(content)) {
        errors.push("Comment contains inappropriate language")
    }

    if (!allowedCharsPattern.test(author)) {
        errors.push("Author name contains disallowed characters")
    }

    if (!allowedCharsPattern.test(content)) {
        errors.push("Comment contains disallowed characters")
    }

    return errors
}

export function isValidEmail(email: string): boolean {
    return emailRegex.test(email)
}

// Interpolating an unescaped word into `new RegExp` would let a profanity-list
// entry act as a pattern.
function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Sanitises first, then validates the *sanitised* values, so `errors` describes
// what would be stored rather than what was submitted. A consequence: tag-shaped
// input is silently stripped and never reported, and only payloads sanitizeHtml
// leaves intact (javascript:, on…=, vbscript:) reach the reject-list. Validate
// the raw input with validateCommentInput if a submission needs to be refused
// rather than cleaned.
export function processComment(
    author: string,
    content: string
): {
    sanitizedAuthor: string
    sanitizedContent: string
    errors: string[]
} {
    const sanitizedAuthor = sanitizeAuthor(author)
    const sanitizedContent = sanitizeComment(content)

    const errors = validateCommentInput(sanitizedAuthor, sanitizedContent)

    return {
        sanitizedAuthor,
        sanitizedContent,
        errors,
    }
}
