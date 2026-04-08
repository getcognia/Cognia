const HIGHLIGHT_SNIPPET_PARAM = 'cognia_hl'
const HIGHLIGHT_QUERY_PARAM = 'cognia_q'
const HIGHLIGHT_PAGE_PARAM = 'cognia_p'
const HIGHLIGHT_TITLE_PARAM = 'cognia_t'

const QUERY_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'do',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'show',
  'that',
  'the',
  'this',
  'to',
  'what',
  'where',
  'which',
  'who',
  'why',
  'with',
])

function normalizeCompactText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function tokenizeQuery(query) {
  return Array.from(
    new Set(
      normalizeCompactText(query)
        .toLowerCase()
        .match(/[a-z0-9-]+/g)
        ?.filter(token => token.length >= 3 && !QUERY_STOP_WORDS.has(token)) || []
    )
  )
}

function splitIntoSentences(text) {
  return normalizeCompactText(text)
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean)
}

function removeHighlightParams(parsedUrl) {
  parsedUrl.searchParams.delete(HIGHLIGHT_SNIPPET_PARAM)
  parsedUrl.searchParams.delete(HIGHLIGHT_QUERY_PARAM)
  parsedUrl.searchParams.delete(HIGHLIGHT_PAGE_PARAM)
  parsedUrl.searchParams.delete(HIGHLIGHT_TITLE_PARAM)
}

export function parseSearchHighlightRequest(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl)
    const snippet = normalizeCompactText(parsedUrl.searchParams.get(HIGHLIGHT_SNIPPET_PARAM))
    const query = normalizeCompactText(parsedUrl.searchParams.get(HIGHLIGHT_QUERY_PARAM))
    const title = normalizeCompactText(parsedUrl.searchParams.get(HIGHLIGHT_TITLE_PARAM))
    const pageNumber = Number(parsedUrl.searchParams.get(HIGHLIGHT_PAGE_PARAM))

    if (!snippet && !query) {
      return null
    }

    removeHighlightParams(parsedUrl)

    return {
      cleanUrl: parsedUrl.toString(),
      snippet: snippet || undefined,
      query: query || undefined,
      title: title || undefined,
      pageNumber:
        Number.isFinite(pageNumber) && pageNumber > 0 ? Math.floor(pageNumber) : undefined,
    }
  } catch {
    return null
  }
}

export function buildSearchHighlightCandidates(input) {
  const candidates = []
  const seen = new Set()

  const pushCandidate = value => {
    const normalizedValue = normalizeCompactText(value)
    if (!normalizedValue) {
      return
    }

    const dedupeKey = normalizedValue.toLowerCase()
    if (seen.has(dedupeKey)) {
      return
    }

    seen.add(dedupeKey)
    candidates.push(normalizedValue)
  }

  pushCandidate(input?.snippet)
  pushCandidate(input?.query)

  const firstSentence = splitIntoSentences(input?.snippet || '')[0]
  if (firstSentence) {
    pushCandidate(firstSentence)
  }

  const queryTokens = tokenizeQuery(input?.query)
  if (queryTokens.length >= 3) {
    pushCandidate(queryTokens.slice(0, 3).join(' '))
  }

  queryTokens.forEach(token => pushCandidate(token))

  return candidates
}
