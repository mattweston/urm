# URM integration

URMCSS is an adoption target, not an active replacement for Tailwind yet.
The Button comparison at `/design/urmcss/button` is scoped to
`.urmcss-preview` and imports its CSS through the administration client.

## Administration client

The Vite/Foldkit client currently imports Tailwind and the shared theme files.
Its theme runtime applies the selected theme to `data-theme` on the document
root. URMCSS components can consume the existing semantic custom properties,
so the theme runtime and palette catalog do not need to change during an
incremental migration.

Component rules must consume values such as `--primary`, `--radius-control`,
and `--shadow-control`. They must not contain selectors for named themes such as
`[data-theme="brutalism"]`.

## Generated public sites

Generated sites are immutable Foldkit renderings with a dedicated stylesheet.
They do not share the administration client bundle. Continue to keep the public
selector surface separate from administration components while sharing the
validated theme vocabulary.

The static-site writer currently reads one CSS file directly, appends resolved
theme declarations, and hashes the result. It does not process package imports.
Before public-site CSS is split into colocated files, add a build-time assembly
step that produces one stylesheet before hashing. Do not emit package-specifier
`@import` rules to deployed sites.

Published theme snapshots currently include colors, fonts, charts, and one
radius. Add validated structural tokens before public components depend on
control radii, border widths, shadows, or component typography.

The script that extracts publishable theme values currently parses flat CSS
blocks with regular expressions. Keep palette declarations flat and outside
nested rules until that script uses a CSS parser.

## Adoption sequence

1. Establish the layer order and document the selector vocabulary.
2. Add Stylelint rules for ownership, specificity, nesting depth, and forbidden
   `!important` declarations.
3. Convert one `@urm/ui` Foldkit component into one concept stylesheet,
   colocating its variants, states, responsive rules, `:has()` relationships,
   and supported reverse-context adaptations; remove external patches to it.
4. Verify that component across every administration theme and supported
   context.
5. Introduce a CSS assembly step for generated public sites.
6. Expand and validate the published structural theme token contract.
7. Convert public-site concepts independently from administration components.
8. Remove Tailwind only after remaining usage and exceptional utilities are
   measured and migrated.
