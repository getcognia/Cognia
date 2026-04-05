import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldRetryGenerationError } from './generation-provider.service'

test('generation provider does not retry unrecoverable OpenAI rate limit errors', () => {
  assert.equal(
    shouldRetryGenerationError({
      status: 429,
      message:
        '429 Rate limit reached for gpt-4o-mini on requests per day (RPD): Limit 200, Used 200, Requested 1.',
    }),
    false
  )

  assert.equal(
    shouldRetryGenerationError({
      status: 429,
      message:
        '429 Request too large for gpt-4o-mini on tokens per min (TPM): Limit 60000, Requested 111714.',
    }),
    false
  )

  assert.equal(
    shouldRetryGenerationError({
      status: 429,
      message:
        '429 Rate limit reached for gpt-4o-mini on requests per min (RPM): Limit 3, Used 3, Requested 1.',
    }),
    true
  )
})
