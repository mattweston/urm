/**
 * The shape the sidebar renders, independent of where the entries came from.
 *
 * Two unrelated navigations feed it: `docs-nav.ts` derives one from the Astro
 * content collections, and `foldkit-sidebar.ts` adapts the Foldkit
 * application's own routes into the same shape. Neither needs the other, so the
 * contract they share lives here rather than in either of them.
 */

export type DocsNavPage = Readonly<{
    href: string
    label: string
    tags: ReadonlyArray<string>
    /* The documents this page links to. Links are read in both directions, so
       a page's graph shows what it links to and what links back to it. */
    links: ReadonlyArray<string>
}>

/* A subject inside a section, rendered as a nested disclosure. Sections whose
   pages all sit at one level have no groups. */
export type DocsNavGroup = Readonly<{
    label: string
    pages: ReadonlyArray<DocsNavPage>
}>

export type DocsNavSection = Readonly<{
    label: string
    lead_pages?: ReadonlyArray<DocsNavPage>
    pages: ReadonlyArray<DocsNavPage>
    groups?: ReadonlyArray<DocsNavGroup>
}>

/* One sidebar component, more than one set of entries. A layout picks the tree
   its pages belong to, so a labs page is not offered the documentation index
   and the other way round. `label` names the nav landmark. */
export type DocsNavTree = Readonly<{
    label: string
    root_pages: ReadonlyArray<DocsNavPage>
    /* Sectionless pages, listed above the sections. A file at the root of a
       collection is one of these: it has no folder, so it belongs to no
       section and is not worth inventing one for. */
    pages: ReadonlyArray<DocsNavPage>
    sections: ReadonlyArray<DocsNavSection>
}>

export const section_pages = (
    section: DocsNavSection
): ReadonlyArray<DocsNavPage> => [
    ...(section.lead_pages ?? []),
    ...section.pages,
    ...(section.groups ?? []).flatMap((group) => group.pages),
]
