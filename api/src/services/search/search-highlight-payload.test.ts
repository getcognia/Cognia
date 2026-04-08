import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const importModule = (specifier: string) =>
  Function('modulePath', 'return import(modulePath)')(specifier) as Promise<unknown>

test('search highlight payload parser strips Cognia params and yields highlight candidates', async () => {
  const modulePath = pathToFileURL(
    '/Users/art3mis/Developer/CogniaHQ/Cognia/extension/src/content/highlighting/search-highlight-payload.js'
  ).href
  const { parseSearchHighlightRequest, buildSearchHighlightCandidates } = (await importModule(
    modulePath
  )) as {
    parseSearchHighlightRequest: (url: string) => {
      cleanUrl: string
      snippet?: string
      query?: string
      pageNumber?: number
      title?: string
    } | null
    buildSearchHighlightCandidates: (input: {
      snippet?: string
      query?: string
      pageNumber?: number
      title?: string
    }) => string[]
  }

  const request = parseSearchHighlightRequest(
    'https://docs.google.com/document/d/demo-doc/edit?usp=sharing&cognia_hl=twenty-four%20hours%20after%20confirmation%20of%20a%20security%20incident&cognia_q=What%20is%20the%20breach%20notification%20timeline%3F&cognia_p=8&cognia_t=Security%20Questionnaire'
  )

  assert.ok(request)
  assert.equal(request?.cleanUrl, 'https://docs.google.com/document/d/demo-doc/edit?usp=sharing')
  assert.equal(request?.snippet, 'twenty-four hours after confirmation of a security incident')
  assert.equal(request?.pageNumber, 8)

  const candidates = buildSearchHighlightCandidates(request || {})

  assert.deepEqual(candidates.slice(0, 3), [
    'twenty-four hours after confirmation of a security incident',
    'What is the breach notification timeline?',
    'breach notification timeline',
  ])
})
