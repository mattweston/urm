/** # Lesson and lab stylesheets
 *
 *  Side-effect imports for lessons and labs that ship their own CSS rather than
 *  styling themselves with utility classes. Such a stylesheet has to be
 *  imported somewhere or its markup renders unstyled, so they are collected
 *  here instead of being scattered through the app shell.
 *
 *  Prefer inline Tailwind on the view: a lesson only belongs here when its
 *  styling genuinely cannot be expressed in utilities.
 */
import "@urm/features/labs/runner/styles.css"
import "@urm/features/labs/dev/grep/styles.css"
import "@urm/features/labs/dev/terminal/styles.css"
// The grid builder is driven entirely by quantity and size container
// queries, so without this it renders as one column.
import "@urm/features/labs/design/grid-builder/styles.css"
import "@urm/features/labs/design/urmcss/styles.css"
