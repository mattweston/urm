import { Array } from "effect"

// Word-prefix search, not substring. The same split serves both sides of an
// index: it turns a contact into the tokens it is stored under, and a search box
// into the prefixes those tokens are looked up by.
export const searchTermsFor = (searchText: string): ReadonlyArray<string> =>
    Array.filter(
        searchText.toLowerCase().split(/[^a-z0-9]+/),
        (term) => term.length > 0
    )

// Indexing drops single characters: a one-letter token matches most of the
// dataset and is never worth a row. A one-letter search term is still fine,
// because it is a prefix of longer tokens.
export const searchTokensFor = (searchText: string): ReadonlyArray<string> =>
    Array.dedupe(
        Array.filter(searchTermsFor(searchText), (token) => token.length > 1)
    )

// Every term has to match some token, so adding a word narrows. Both the local
// index and the server have to apply this same rule: if they disagree, swapping
// the source changes the results.
export const matchesAllTerms = (
    tokens: ReadonlyArray<string>,
    terms: ReadonlyArray<string>
): boolean =>
    terms.every((term) => tokens.some((token) => token.startsWith(term)))
