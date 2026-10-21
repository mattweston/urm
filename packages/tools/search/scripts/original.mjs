#!/usr/bin/env node
/**
 * Sync documentation content to Mixedbread vector store
 * Run this after building: pnpm build && node scripts/sync-mixedbread.mjs
 */

import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import matter from "gray-matter"

// Load environment variables from .env.local
import { config } from "dotenv"
config({ path: ".env.local" })

// Configuration
const MXBAI_API_KEY = process.env.MXBAI_API_KEY
const MXBAI_VECTOR_STORE_ID = process.env.MXBAI_VECTOR_STORE_ID

// Content paths to index
const CONTENT_PATHS = [
    "src/routes/**/*.{md,mdx}",
    // API docs from examples
    "../examples/**/*.{md,ts,tsx}",
]

if (!MXBAI_API_KEY || !MXBAI_VECTOR_STORE_ID) {
    console.error("❌ Missing required environment variables:")
    console.error("  MXBAI_API_KEY")
    console.error("  MXBAI_VECTOR_STORE_ID")
    process.exit(1)
}

/**
 * Extract clean text content from markdown
 */
function extractContent(content) {
    // Remove frontmatter
    const { content: body } = matter(content)

    return (
        body
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, "")
            // Remove inline code
            .replace(/`[^`]*`/g, "")
            // Remove HTML tags
            .replace(/<[^>]*>/g, "")
            // Remove markdown links
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            // Remove images
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
            // Clean up whitespace
            .replace(/\n+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
    )
}

/**
 * Process a single file for indexing
 */
async function processFile(filePath) {
    try {
        const content = readFileSync(filePath, "utf-8")
        const { data: frontmatter } = matter(content)

        // Skip files with search: false
        if (frontmatter.search === false) {
            return null
        }

        const cleanContent = extractContent(content)

        // Skip empty files
        if (!cleanContent || cleanContent.length < 50) {
            return null
        }

        return {
            id: filePath,
            text: cleanContent,
            metadata: {
                file_path: filePath,
                file_type: "text/markdown",
                title: frontmatter.title || "Untitled",
                description: frontmatter.description || "",
                tags: frontmatter.tags || [],
            },
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message)
        return null
    }
}

/**
 * Index documents to Mixedbread in batches
 */
async function indexDocuments(documents) {
    console.log(`\n📤 Indexing ${documents.length} documents to Mixedbread...`)

    // Mixedbread has limits, so we batch
    const BATCH_SIZE = 100
    let indexed = 0

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE)

        try {
            const response = await fetch(
                `https://api.mixedbread.com/v1/stores/${MXBAI_VECTOR_STORE_ID}/index`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${MXBAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        documents: batch,
                    }),
                }
            )

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`API error: ${error}`)
            }

            indexed += batch.length
            console.log(
                `   Indexed ${indexed}/${documents.length} documents...`
            )
        } catch (error) {
            console.error("❌ Indexing failed:", error.message)
            process.exit(1)
        }
    }

    console.log("✅ Indexing complete!")
}

/**
 * Main sync function
 */
async function sync() {
    console.log("🚀 Starting Mixedbread sync...\n")

    const documents = []

    for (const pattern of CONTENT_PATHS) {
        try {
            const files = []
            for await (const file of glob(pattern, { cwd: process.cwd() })) {
                files.push(file)
            }
            console.log(`📁 Found ${files.length} files matching ${pattern}`)

            for (const file of files) {
                const doc = await processFile(file)
                if (doc) {
                    documents.push(doc)
                }
            }
        } catch (error) {
            console.warn(`⚠️  Pattern ${pattern} failed:`, error.message)
        }
    }

    if (documents.length === 0) {
        console.error("❌ No documents found to index")
        process.exit(1)
    }

    console.log(`\n📊 Prepared ${documents.length} documents for indexing`)
    await indexDocuments(documents)
}

sync().catch((error) => {
    console.error("❌ Sync failed:", error)
    process.exit(1)
})
