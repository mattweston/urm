import { highlight } from '@tanstack/highlight'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'
import { copyButton } from '@/lib/copy-button'

// Styled class constants — override these to re-skin the code block.

export const codeBlockWrapperClass = 'overflow-hidden rounded-lg border border-border'

export const codeBlockHeaderClass =
  'flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2'

export const codeBlockFilePathClass = 'truncate font-mono text-xs text-muted-foreground'

export const codeBlockMetaClass = 'flex items-center gap-2'

export const codeBlockLineCountClass = 'text-xs text-muted-foreground'

// codeBlockCopyButtonClass is no longer needed — use copyButton from '@/lib/copy-button' instead.
// Kept for backwards compatibility if imported elsewhere.
export const codeBlockCopyButtonClass =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer'

// Code block view — provides syntax highlighting, file header, and copy.

export type CodeBlockConfig<M> = Readonly<{
  /** File path shown in the header (e.g. "registry/default/ui/button.ts"). */
  path: string
  /** Source code to highlight. */
  code: string
  /** Language for syntax highlighting (default: inferred from path extension). */
  lang?: string
  /** Message dispatched when the user clicks the copy button. */
  onCopy?: M
  /** Whether the copy button should show a checkmark (copied state). */
  isCopied?: boolean
  /** Additional class names for the outer wrapper. */
  className?: string
  /** When true, the code body collapses to a short preview with a fade + Show/Hide toggle. */
  isCollapsible?: boolean
  /** Whether the collapsible body is expanded. Ignored when isCollapsible is false. */
  isExpanded?: boolean
  /** Message dispatched when the user toggles collapsed/expanded. */
  onToggle?: M
  /** Minimum lines before the collapse affordance appears (default: 8). */
  collapseThreshold?: number
  /** Max height when collapsed (default: "max-h-36" ≈ 144px). */
  collapsedHeightClass?: string
}>

const LANG_BY_EXT = {
  ts: 'ts',
  tsx: 'tsx',
  js: 'js',
  jsx: 'jsx',
  css: 'css',
  html: 'html',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  markdown: 'markdown',
  sh: 'shell',
  shell: 'shell',
  bash: 'shell',
  zsh: 'shell',
  py: 'python',
  python: 'python',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  sql: 'sql',
  xml: 'html',
  svelte: 'svelte',
  vue: 'vue',
  ejs: 'ejs',
  env: 'env',
  dotenv: 'env',
  diff: 'diff',
  patch: 'diff',
  nginx: 'nginx',
  http: 'http',
  scheme: 'scheme',
  scm: 'scheme',
  racket: 'scheme',
  mermaid: 'mermaid',
} as const

const isLangExt = (ext: string): ext is keyof typeof LANG_BY_EXT => ext in LANG_BY_EXT

const inferLang = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return isLangExt(ext) ? LANG_BY_EXT[ext] : 'plaintext'
}

/** Render a highlighted code block with file header and copy button. */
export const codeBlock = <M>(config: CodeBlockConfig<M>, h: HtmlBuilder<M>): Html => {
  const lang = config.lang ?? inferLang(config.path)
  const result = highlight(config.code, { lang })
  const lineCount = config.code.split('\n').length
  const isCollapsible = config.isCollapsible === true
  const isExpanded = config.isExpanded === true
  const threshold = config.collapseThreshold ?? 8
  const shouldCollapse = isCollapsible && lineCount > threshold
  const isCollapsed = shouldCollapse && !isExpanded
  const collapsedHeightClass = config.collapsedHeightClass ?? 'max-h-36'

  // TanStack Highlight emits <pre class="th-code th-code--{lang}" data-language="{lang}">
  // with inner <span class="th-token th-{token}"> for each tokenized range.
  // The theme CSS (createThemeCss) maps th-* classes to CSS custom properties.
  const codeBody = shouldCollapse
    ? // Collapsible: wrap the highlighted <pre> in a relative container so we
      // can clip it and overlay a gradient + toggle when collapsed.
      h.div(
        [h.Class(cn('relative', isCollapsed && `overflow-hidden ${collapsedHeightClass}`))],
        [
          h.div([h.InnerHTML(result.html)]),
          // Fade overlay — only when collapsed. Uses the code background token
          // so it blends in both light and dark themes.
          ...(isCollapsed
            ? [
                h.div(
                  [
                    h.Class(
                      'pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--th-background)] to-transparent',
                    ),
                  ],
                  [],
                ),
                h.div(
                  [h.Class('absolute inset-x-0 bottom-3 flex justify-center')],
                  [
                    h.button(
                      [
                        h.Class(
                          'rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer',
                        ),
                        h.AriaLabel('Show full code'),
                        ...(config.onToggle !== undefined ? [h.OnClick(config.onToggle)] : []),
                      ],
                      ['Show code'],
                    ),
                  ],
                ),
              ]
            : [
                h.div(
                  [h.Class('absolute inset-x-0 bottom-3 flex justify-center')],
                  [
                    h.button(
                      [
                        h.Class(
                          'rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer',
                        ),
                        h.AriaLabel('Hide code'),
                        ...(config.onToggle !== undefined ? [h.OnClick(config.onToggle)] : []),
                      ],
                      ['Hide code'],
                    ),
                  ],
                ),
              ]),
        ],
      )
    : h.div([h.InnerHTML(result.html)])

  return h.div(
    [h.Class(cn(codeBlockWrapperClass, config.className))],
    [
      // Header bar: file path + line count + copy button
      h.div(
        [h.Class(codeBlockHeaderClass)],
        [
          h.code([h.Class(codeBlockFilePathClass)], [config.path]),
          h.span(
            [h.Class(codeBlockMetaClass)],
            [
              h.span([h.Class(codeBlockLineCountClass)], [`${lineCount} lines`]),
              copyButton(
                {
                  value: config.code,
                  onCopy: config.onCopy,
                  isCopied: config.isCopied,
                  ariaLabel: 'Copy source code',
                },
                h,
              ),
            ],
          ),
        ],
      ),
      codeBody,
    ],
  )
}
