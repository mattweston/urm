# Documentation

Foldkit documentation pages shared by application entry points. Markdown is
compiled by `@foldkit/markdown` in the consuming Vite application and decoded
at the feature boundary.

## Porting parity checklist

Before treating a legacy component as migrated, compare its markup, styles,
and client module for:

- Pointer, keyboard, focus, wrapping, and disabled-state behavior.
- ARIA roles, labels, live regions, and current/selected state.
- Initial rendering, hydration or mount behavior, and focus movement.
- Reduced-motion, unavailable-browser-API, and malformed-input fallbacks.
- Responsive layout, theme tokens, icons, transitions, and reserved sizing.
- Build-time processing, supported options, defaults, and nested content.
