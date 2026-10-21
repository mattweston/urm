import { shadcnUrlFor } from './upstream'

const BASE = 'https://github.com/elianiva/foldcn/issues/new'

export const incompatibilityIssueUrl = (
  itemName: string,
  gaps: ReadonlyArray<string>,
  parityStatus: string,
): string => {
  const title = `[Bug]: ${itemName} - `
  const shadcnUrl = shadcnUrlFor(itemName)
  const gapsSection = gaps.length > 0 ? gaps.map((g) => `- ${g}`).join('\n') : null
  const additional = [
    `Component: ${itemName}`,
    `Parity: ${parityStatus}`,
    gapsSection ? `Known gaps:\n${gapsSection}` : null,
    `Docs: https://foldcn.elianiva.com/docs/${itemName}`,
    shadcnUrl ? `Upstream: ${shadcnUrl}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    title,
    component: itemName,
    additional,
  })
  return `${BASE}?${params.toString()}`
}

export const requestComponentUrl = (): string => requestComponentUrlForCategory()

export const requestComponentUrlForCategory = (category?: string): string => {
  const title = category ? `[Request]: ${category} - ` : '[Request]: '
  const params = new URLSearchParams({
    template: 'component_request.yml',
    title,
  })
  if (category) params.set('details', `Category: ${category}`)
  return `${BASE}?${params.toString()}`
}
