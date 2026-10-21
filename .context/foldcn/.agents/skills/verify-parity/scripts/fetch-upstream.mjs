#!/usr/bin/env node
/**
 * fetch-upstream.mjs — fetch upstream component list from https://ui.shadcn.com
 *
 * Fetches https://ui.shadcn.com/docs/components and extracts component names,
 * writing .tmp/upstream.json for verify-parity.mjs to consume when no local
 * shadcn-ui checkout is available.
 *
 * Usage: node .agents/skills/verify-parity/scripts/fetch-upstream.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const OUT_PATH = join(REPO_DIR, '.tmp/upstream.json')
const DOCS_URL = 'https://ui.shadcn.com/docs/components'

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'foldcn-verify-parity/1.0' } })
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status} ${res.statusText}`)
  return res.text()
}

function extractComponentNames(html) {
  // shadcn docs component list appears as links to /docs/components/<name>
  const names = new Set()
  const re = /href="\/docs\/components\/([a-z0-9-]+)"/g
  let m
  while ((m = re.exec(html)) !== null) {
    const name = m[1]
    if (name !== 'components' && !name.startsWith('installation')) names.add(name)
  }
  return [...names].sort()
}

async function main() {
  console.log(`fetching ${DOCS_URL} ...`)
  const html = await fetchText(DOCS_URL)
  const names = extractComponentNames(html)

  if (names.length === 0) {
    console.error('no component names extracted — page layout may have changed')
    console.error('fallback: set $SHADCN_UI_DIR to a local shadcn-ui checkout')
    process.exit(1)
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ source: DOCS_URL, fetchedAt: new Date().toISOString(), names }, null, 2) +
      '\n',
  )
  console.log(`wrote ${names.length} names to ${OUT_PATH}`)
  console.log(names.join(', '))
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
