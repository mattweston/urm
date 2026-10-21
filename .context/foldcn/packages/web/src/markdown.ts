import { Defuddle } from 'defuddle/node'
import { Effect } from 'effect'

/** Pull the `<main>…</main>` region out of a rendered page (falls back to the
 *  whole document if, for some reason, no `<main>` was emitted). */
export const extractMain = (html: string) => {
  const start = html.search(/<main[\s>]/i)
  if (start === -1) return html
  const end = html.indexOf('</main>', start)
  if (end === -1) return html
  return html.slice(start, end + '</main>'.length)
}

// node-html-markdown reads fence languages from a `language-*` class on the
// `<code>` element, but the registry code blocks carry the language on the
// wrapping `<pre data-language="ts">` with a bare `<code>` inside. Copy it
// across before translating. Defuddle's markdown handler already checks
// `data-language` on <pre> and <code>, but we keep this for fidelity and to
// handle any edge cases.
const annotateCodeLanguages = (html: string) =>
  html.replace(
    /(<pre[^>]*\bdata-language="([\w-]+)"[^>]*>\s*<code)>/g,
    (_match, open: string, language: string) => `${open} class="language-${language}">`,
  )

// Flex/grid layouts separate inline siblings with CSS `gap`, so the serialized
// HTML carries no whitespace between them and the converter would jam them
// into one word ("PreviewInteractive demo", "CtrlShift⌘K"). Inline elements
// closed immediately before another element get one space inserted. Void
// elements count as separators too ("<label>Email</label><input><span>…").
// Regions inside <pre> are skipped — highlighted tokens are adjacent spans
// whose spacing is significant source code.
const INLINE_SIBLINGS = 'span|code|kbd|a|strong|em|b|i|small|time|abbr|label|option'
const VOID_ELEMENTS = 'input|img|br|hr|select'
const JAMMED_SIBLINGS = new RegExp(
  `(</(?:${INLINE_SIBLINGS})>)\\s*(<(?:${INLINE_SIBLINGS}|${VOID_ELEMENTS})[\\s>/])`,
  'g',
)

const separateInlineSiblings = (html: string) =>
  html
    .split(/(<pre[\s\S]*?<\/pre>)/g)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(JAMMED_SIBLINGS, '$1 $2')))
    .join('')

/** Resolve root-relative Markdown links against the site origin so they keep
 *  working when the file is read outside the context of the page it came from
 *  (an agent fetching `/docs/button.md` has no base URL to resolve against).
 *  Applied to the translated Markdown rather than the source HTML so literal
 *  `href="…"` text inside code listings is never touched. Defuddle already
 *  absolutizes URLs when a `url` is provided, but we keep this as a safety
 *  net for any relative links that slip through. */
const absolutizeLinks = (markdown: string, origin: string) =>
  markdown.replace(/\]\((\/[^)\s]*)\)/g, (_match, path: string) => `](${origin}${path})`)

/** Convert a rendered page's HTML to clean Markdown using Defuddle.
 *
 * Defuddle extracts the main article content (via Readability-style heuristics
 * and content scoring), strips clutter (nav, aside, ads, etc.), and converts
 * the result to Markdown with turndown. We pre-process the HTML to preserve
 * code-block languages and inline spacing, and post-process to ensure links
 * are absolute.
 *
 * The `contentSelector` targets the article column (`.max-w-3xl` / `.max-w-2xl`)
 * which holds the actual docs content, excluding the sidebar. If the selector
 * is not found, Defuddle falls back to its auto-detection (which still finds
 * `<main>`).
 */
export const htmlToMarkdown = Effect.fn(function* (html: string, origin: string) {
  // Pre-process before Defuddle: preserve `data-language` on code blocks and
  // fix jammed inline siblings that CSS `gap` would otherwise collapse.
  const preprocessed = separateInlineSiblings(annotateCodeLanguages(html))

  const result = yield* Effect.tryPromise({
    try: () =>
      Defuddle(preprocessed, `${origin}/`, {
        markdown: true,
        contentSelector: '.max-w-3xl, .max-w-2xl',
      }),
    catch: (cause) => new Error(`Failed to convert HTML to Markdown: ${String(cause)}`, { cause }),
  })

  let markdown = result.content.replace(/\n{3,}/g, '\n\n').trim()
  // Defuddle's standardize converts h1 -> h2 for cleaner outlines. Restore
  // the first h2 back to h1 so the page title matches the original site
  // (e.g., "# Button" instead of "## Button") and the llms.txt hierarchy
  // stays consistent.
  markdown = markdown.replace(/^## /m, '# ')
  return `${absolutizeLinks(markdown, origin)}\n`
})
