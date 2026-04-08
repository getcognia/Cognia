import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const importModule = (specifier: string) =>
  Function('modulePath', 'return import(modulePath)')(specifier) as Promise<unknown>

test('organization search open url carries a highlight payload for external sources', async () => {
  const modulePath = pathToFileURL(
    '/Users/art3mis/Developer/CogniaHQ/Cognia/client/src/components/organization/organization-search-opening.js'
  ).href
  const { buildOrganizationSearchOpenUrl } = (await importModule(modulePath)) as {
    buildOrganizationSearchOpenUrl: (input: {
      url: string
      query: string
      result: {
        content?: string
        contentPreview?: string
        documentName?: string
        title?: string
        pageNumber?: number
      }
    }) => string
  }

  const openedUrl = buildOrganizationSearchOpenUrl({
    url: 'https://docs.google.com/document/d/demo-doc/edit?usp=sharing',
    query: 'What is the breach notification timeline?',
    result: {
      documentName: 'Security Questionnaire',
      pageNumber: 8,
      content:
        'Aperture Cloud will notify Northstar Bank without undue delay and no later than twenty-four hours after confirmation of a security incident affecting customer data.',
      contentPreview: 'Security incident response and breach notification timeline.',
    },
  })

  const parsed = new URL(openedUrl)

  assert.equal(parsed.origin, 'https://docs.google.com')
  assert.equal(parsed.pathname, '/document/d/demo-doc/edit')
  assert.equal(parsed.searchParams.get('usp'), 'sharing')
  assert.match(
    parsed.searchParams.get('cognia_hl') || '',
    /twenty-four hours after confirmation of a security incident/i
  )
  assert.equal(parsed.searchParams.get('cognia_q'), 'What is the breach notification timeline?')
  assert.equal(parsed.searchParams.get('cognia_p'), '8')
  assert.equal(parsed.searchParams.get('cognia_t'), 'Security Questionnaire')
})
