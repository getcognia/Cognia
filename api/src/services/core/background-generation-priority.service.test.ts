import test from 'node:test'
import assert from 'node:assert/strict'

import { backgroundGenerationPriorityService } from './background-generation-priority.service'
import * as redisLib from '../../lib/redis.lib'

type MutableRedisLib = {
  getRedisClient: typeof redisLib.getRedisClient
  scanKeys: typeof redisLib.scanKeys
}

const redisModule = redisLib as unknown as MutableRedisLib

const runWithRedisMocks = async (
  client: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string, mode: string, ttlSeconds: number) => Promise<string>
    del: (key: string) => Promise<number>
  },
  scanKeysMock: typeof redisLib.scanKeys
) => {
  const originalGetRedisClient = redisModule.getRedisClient
  const originalScanKeys = redisModule.scanKeys

  redisModule.getRedisClient = () => client as never
  redisModule.scanKeys = scanKeysMock

  try {
    return await backgroundGenerationPriorityService.isSearchPriorityLeaseActive()
  } finally {
    redisModule.getRedisClient = originalGetRedisClient
    redisModule.scanKeys = originalScanKeys
  }
}

test('search priority gate is active when a lease key exists', async () => {
  const result = await runWithRedisMocks(
    {
      get: async (key: string) => {
        if (key === 'background_generation_priority:search') {
          return 'lease-token'
        }
        return null
      },
      set: async () => 'OK',
      del: async () => 1,
    },
    (async () => []) as typeof redisLib.scanKeys
  )

  assert.equal(result, true)
})

test('search priority gate is active while a search job is pending', async () => {
  const result = await runWithRedisMocks(
    {
      get: async (key: string) => {
        if (key === 'search_job:job-1') {
          return JSON.stringify({
            id: 'job-1',
            status: 'pending',
          })
        }
        return null
      },
      set: async () => 'OK',
      del: async () => 1,
    },
    (async () => ['search_job:job-1']) as typeof redisLib.scanKeys
  )

  assert.equal(result, true)
})

test('search priority gate is inactive when only completed search jobs remain', async () => {
  const result = await runWithRedisMocks(
    {
      get: async (key: string) => {
        if (key === 'search_job:job-1') {
          return JSON.stringify({
            id: 'job-1',
            status: 'completed',
          })
        }
        return null
      },
      set: async () => 'OK',
      del: async () => 1,
    },
    (async () => ['search_job:job-1']) as typeof redisLib.scanKeys
  )

  assert.equal(result, false)
})
