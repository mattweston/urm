/** # Learn lesson stylesheets
 *
 *  Side-effect imports for lessons that ship their own CSS rather than styling
 *  themselves with utility classes. A lesson's stylesheet has to be imported
 *  somewhere or its markup renders unstyled, so they are collected here instead
 *  of being scattered through the app shell.
 *
 *  Prefer inline Tailwind on the view: a lesson only belongs here when its
 *  styling genuinely cannot be expressed in utilities.
 */
import "@urm/features/labs/runner/styles.css"
