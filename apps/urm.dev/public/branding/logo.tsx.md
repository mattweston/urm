/\*\*

- App logo: home link with themed inline SVG.
-
- Renders a link to "/" with inline logo using Tailwind theme colors.
-
- TODO: render logo dependant on the domain of the user
-
- @packageDocumentation
  \*/

import { Link } from '@tanstack/solid-router'

/\*\*

- Logo component: link to home with themed inline SVG.
  \*/
  export function Logo() {
  return (
  <Link to="/" class="flex items-center justify-center">
  <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 100 100"
                                      width="32"
                                      height="32"
                                      class="w-12 h-12"
                                      aria-hidden
                                  >
  <defs>
  <linearGradient id="logo-bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color: var(--color-card)" />
  <stop offset="100%" style="stop-color: var(--color-muted)" />
  </linearGradient>
  <linearGradient id="logo-dotA" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color: var(--color-chart-5)" />
  <stop offset="100%" style="stop-color: var(--color-chart-5)" />
  </linearGradient>
  <linearGradient id="logo-dotB" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color: var(--color-chart-4)" />
  <stop offset="100%" style="stop-color: var(--color-chart-4)" />
  </linearGradient>
  </defs>
  <rect width="100" height="100" rx="12" class="fill-card" fill="url(#logo-bgGrad)" />
  <circle cx="50" cy="50" r="28" fill="none" class="stroke-foreground/80" stroke-width="2" />
  <circle cx="50" cy="50" r="18" fill="none" class="stroke-foreground/80" stroke-width="1.5" />
  <line x1="50" y1="22" x2="50" y2="42" class="stroke-foreground" stroke-width="2" />
  <line x1="50" y1="58" x2="50" y2="78" class="stroke-foreground" stroke-width="2" />
  <line x1="22" y1="50" x2="42" y2="50" class="stroke-foreground" stroke-width="2" />
  <line x1="58" y1="50" x2="78" y2="50" class="stroke-foreground" stroke-width="2" />
  <circle cx="50" cy="50" r="8" class="fill-foreground stroke-foreground" stroke-width="1.5" />
  <circle cx="50" cy="22" r="6" fill="url(#logo-dotA)" class="opacity-70" />
  <circle cx="78" cy="50" r="6" fill="url(#logo-dotB)" class="opacity-70" />
  <circle cx="50" cy="78" r="6" fill="url(#logo-dotA)" class="opacity-70" />
  <circle cx="22" cy="50" r="6" fill="url(#logo-dotB)" class="opacity-70" />
  </svg>
  </Link>
  )
  }

export default Logo
