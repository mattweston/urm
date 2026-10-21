import * as Schema from "effect/Schema"

const RELATIVE_HREF = /^(?:[#?]|\/(?!\/)|\.{1,2}\/)/
const ALLOWED_HREF_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"])

const hasControlCharacter = (value: string): boolean => {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index)
        if (code < 0x20 || code === 0x7f) return true
    }
    return false
}

/**
 * A link destination safe to render in tenant-authored content: https, http,
 * mailto or tel, or a relative path beginning with /, ./, ../, # or ?. Every
 * other scheme is rejected, javascript: and data: among them — those need no
 * markup at all to execute, so leaving the scheme to a renderer left the
 * hazard open. Protocol-relative //host is rejected too: it reads as a path
 * and navigates off-site.
 *
 * Surrounding whitespace is rejected rather than trimmed, as are embedded
 * credentials and any control character — a browser strips tab, CR and LF from
 * an href, so `java\nscript:` would otherwise become a scheme after storage.
 *
 * The empty string is accepted. A destination that must be present adds
 * Schema.isMinLength(1); an editor that creates a link before its destination
 * is typed needs the empty case.
 */
export const SafeHref = Schema.Trimmed.check(
    Schema.isMaxLength(2_048),
    Schema.makeFilter(
        (value) => {
            if (value.length === 0) return true
            if (hasControlCharacter(value)) return false
            if (RELATIVE_HREF.test(value)) return true
            try {
                const url = new URL(value)
                return (
                    ALLOWED_HREF_PROTOCOLS.has(url.protocol) &&
                    url.username === "" &&
                    url.password === ""
                )
            } catch {
                return false
            }
        },
        {
            message:
                "Enter an https, http, mailto or tel URL, or a relative path.",
        }
    )
)
export type SafeHref = typeof SafeHref.Type

/**
 * SafeHref where a destination is required, for a control that is dead without
 * one. Rich-text link marks use SafeHref itself instead.
 */
export const RequiredSafeHref = SafeHref.check(Schema.isMinLength(1))
export type RequiredSafeHref = typeof RequiredSafeHref.Type

const ALLOWED_IMAGE_PROTOCOLS = new Set(["https:", "http:"])

/**
 * An image source safe to render in tenant-authored content: https or http, or
 * a relative path beginning with / or ./ or ../ — and nothing else.
 *
 * Narrower than SafeHref in two ways, both deliberate. `mailto:` and `tel:`
 * are destinations, not pictures, so an `<img src="mailto:…">` is a broken
 * image at best and a guess about intent at worst. And `#` and `?` are
 * rejected: a fragment or a bare query names the current document, which is
 * never an image.
 *
 * This exists because `RichTextImageNode` says in its own comment that it does
 * not validate its `src`, which leaves the policy to whoever renders it — and
 * a policy owned by every renderer separately is a policy that disagrees with
 * itself. `crates/publish/src/url.rs` already drew this exact line for the
 * Rust renderer, down to excluding `mailto:` and `tel:` from an image; this is
 * the TypeScript half of the same rule, and the two are worth keeping in step
 * by hand until something checks them.
 *
 * The browser's own `img-src 'self' data:` CSP is the backstop rather than the
 * control: it would stop a remote fetch this accepted, but it says nothing
 * about a `data:` payload, which this rejects and the CSP permits.
 */
export const SafeImageSrc = Schema.Trimmed.check(
    Schema.isMaxLength(2_048),
    Schema.makeFilter(
        (value) => {
            if (value.length === 0) return true
            if (hasControlCharacter(value)) return false
            if (/^\/(?!\/)|^\.{1,2}\//.test(value)) return true
            try {
                const url = new URL(value)
                return (
                    ALLOWED_IMAGE_PROTOCOLS.has(url.protocol) &&
                    url.username === "" &&
                    url.password === ""
                )
            } catch {
                return false
            }
        },
        { message: "Enter an https or http URL, or a relative path." }
    )
)
export type SafeImageSrc = typeof SafeImageSrc.Type

/** Whether an image source is safe to render. The predicate behind
 *  {@link SafeImageSrc}, for a renderer that holds an already-stored string
 *  and must decide whether to draw it rather than reject the whole document:
 *  one bad `src` should cost its own image, not the page. */
export const isSafeImageSrc = (value: string): boolean =>
    Schema.is(SafeImageSrc)(value)

/** Whether a link destination is safe to render. The sibling of
 *  {@link isSafeImageSrc}, for the same kind of caller and the same reason: an
 *  event row's `venue_url` and `tickets_url` were stored as plain
 *  length-capped strings, so a renderer holding one has to decide whether to
 *  draw the link rather than refuse the whole event.
 *
 *  Note that this accepts `""`, as `SafeHref` does — the empty case is a
 *  destination nobody typed. A caller drawing a control needs a destination
 *  *and* safety, so it tests the string for emptiness itself; conflating the
 *  two here would make this disagree with the schema it is the predicate
 *  for. */
export const isSafeHref = (value: string): boolean => Schema.is(SafeHref)(value)
