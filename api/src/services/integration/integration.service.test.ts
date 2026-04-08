/* eslint-disable @typescript-eslint/no-require-imports */
import test from 'node:test'
import assert from 'node:assert/strict'
import type { ResourceContent } from '@cogniahq/integrations'

import { integrationService } from './integration.service'
import { prisma } from '../../lib/prisma.lib'
import { memoryIngestionService } from '../memory/memory-ingestion.service'
type QueueLibHandle = {
  addContentJob: typeof import('../../lib/queue.lib').addContentJob
  contentQueue: {
    close(): Promise<void>
  }
  contentQueueEvents: {
    close(): Promise<void>
  }
}

const queueLib = require('../../lib/queue.lib') as QueueLibHandle

function createResourceContent(overrides: Partial<ResourceContent> = {}): ResourceContent {
  return {
    id: 'resource-1',
    externalId: 'drive-file-1',
    type: 'file',
    title: 'Quarterly Security Review.pdf',
    content: 'Quarterly security review findings',
    contentHash: 'content-hash-1',
    mimeType: 'application/pdf',
    url: 'https://drive.google.com/file/d/drive-file-1/view',
    metadata: {},
    author: {
      id: 'alice-example',
      name: 'Alice Example',
      email: 'alice@example.com',
    },
    createdAt: new Date('2026-04-05T14:00:00.000Z'),
    updatedAt: new Date('2026-04-05T14:00:00.000Z'),
    ...overrides,
  }
}

test('integration queue jobs preserve sync linkage and skip inline profile updates', async () => {
  const originalAddContentJob = queueLib.addContentJob
  const originalCanonicalizeContent = memoryIngestionService.canonicalizeContent
  const originalFindDuplicateMemory = memoryIngestionService.findDuplicateMemory

  let queuedJob: Parameters<typeof queueLib.addContentJob>[0] | null = null

  queueLib.addContentJob = (async data => {
    queuedJob = data
    return { id: 'job-1' }
  }) as typeof queueLib.addContentJob

  memoryIngestionService.canonicalizeContent = ((content: string) => ({
    canonicalText: content,
    canonicalHash: 'canonical-hash-1',
  })) as typeof memoryIngestionService.canonicalizeContent

  memoryIngestionService.findDuplicateMemory = (async () =>
    null) as typeof memoryIngestionService.findDuplicateMemory

  try {
    await (
      integrationService as unknown as {
        createMemoryFromContent: (
          content: ResourceContent,
          context: {
            userId: string
            organizationId?: string | null
            integrationId: string
            integrationType: 'user' | 'organization'
            provider: string
            syncedResourceId: string
          }
        ) => Promise<void>
      }
    ).createMemoryFromContent(createResourceContent(), {
      userId: 'user-1',
      organizationId: 'org-1',
      integrationId: 'integration-1',
      integrationType: 'user',
      provider: 'google_drive',
      syncedResourceId: 'sync-1',
    })

    assert.ok(queuedJob)
    assert.equal(queuedJob?.user_id, 'user-1')
    assert.equal(queuedJob?.raw_text, 'Quarterly security review findings')
    assert.equal(queuedJob?.metadata?.source, 'google_drive')
    assert.equal(queuedJob?.metadata?.source_type, 'INTEGRATION')
    assert.equal(queuedJob?.metadata?.organization_id, 'org-1')
    assert.equal(queuedJob?.metadata?.integration_id, 'integration-1')
    assert.equal(queuedJob?.metadata?.integration_type, 'user')
    assert.equal(queuedJob?.metadata?.external_id, 'drive-file-1')
    assert.equal(queuedJob?.metadata?.synced_resource_id, 'sync-1')
    assert.equal(queuedJob?.metadata?.skip_profile_update, true)
    assert.deepEqual(queuedJob?.metadata?.page_metadata, {
      integration_provider: 'google_drive',
      external_id: 'drive-file-1',
      mime_type: 'application/pdf',
      author: {
        id: 'alice-example',
        name: 'Alice Example',
        email: 'alice@example.com',
      },
    })
  } finally {
    queueLib.addContentJob = originalAddContentJob
    memoryIngestionService.canonicalizeContent = originalCanonicalizeContent
    memoryIngestionService.findDuplicateMemory = originalFindDuplicateMemory
    await Promise.allSettled([
      queueLib.contentQueue.close(),
      queueLib.contentQueueEvents.close(),
      prisma.$disconnect(),
    ])
  }
})

test('integration resync repairs unchanged resources when they are not linked yet', async () => {
  const shouldSkipUnchangedResource = (
    integrationService as unknown as {
      shouldSkipUnchangedResource: (
        existingSynced: { last_synced_at: Date; memory_id: string | null } | null,
        modifiedAt: Date
      ) => boolean
    }
  ).shouldSkipUnchangedResource

  assert.equal(
    shouldSkipUnchangedResource(
      {
        last_synced_at: new Date('2026-04-05T14:00:00.000Z'),
        memory_id: null,
      },
      new Date('2026-04-05T13:59:00.000Z')
    ),
    false
  )

  assert.equal(
    shouldSkipUnchangedResource(
      {
        last_synced_at: new Date('2026-04-05T14:00:00.000Z'),
        memory_id: 'memory-1',
      },
      new Date('2026-04-05T13:59:00.000Z')
    ),
    true
  )
})
