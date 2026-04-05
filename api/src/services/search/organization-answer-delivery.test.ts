import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

test('organization answer delivery prefers streaming when EventSource is available', () => {
  const modulePath = path.resolve(
    __dirname,
    '../../../../client/src/components/organization/organization-answer-delivery.js'
  )
  const moduleUrl = pathToFileURL(modulePath).href
  const output = execFileSync(
    'node',
    [
      '--input-type=module',
      '--eval',
      `import(${JSON.stringify(moduleUrl)}).then(({ getOrganizationAnswerDeliveryMode }) => {
        const value = getOrganizationAnswerDeliveryMode({ supportsStreaming: true })
        process.stdout.write(JSON.stringify(value))
      })`,
    ],
    { encoding: 'utf8' }
  )

  assert.deepEqual(JSON.parse(output), {
    mode: 'stream',
    shouldPoll: false,
  })
})

test('organization answer delivery falls back to polling when streaming is unavailable', () => {
  const modulePath = path.resolve(
    __dirname,
    '../../../../client/src/components/organization/organization-answer-delivery.js'
  )
  const moduleUrl = pathToFileURL(modulePath).href
  const output = execFileSync(
    'node',
    [
      '--input-type=module',
      '--eval',
      `import(${JSON.stringify(moduleUrl)}).then(({ getOrganizationAnswerDeliveryMode }) => {
        const value = getOrganizationAnswerDeliveryMode({ supportsStreaming: false })
        process.stdout.write(JSON.stringify(value))
      })`,
    ],
    { encoding: 'utf8' }
  )

  assert.deepEqual(JSON.parse(output), {
    mode: 'poll',
    shouldPoll: true,
  })
})
