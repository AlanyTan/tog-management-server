import express from 'express'
import request from 'supertest'
import { FlagClient } from 'tog-client'

const redisUrl = process.env.REDIS_URL ?? ""
const testToken = process.env.TESTTOKEN ?? ""


import router from './flags'
const app = express().use(router)

const client = new FlagClient(redisUrl)


afterAll(async () => {await client.redis.quit(); })
//afterAll(router.delete)
afterEach(() => client.redis.flushdb())

describe('flags api', () => {
  describe('list flags', () => {
    test('returns list of flags', async () => {
      const flags = [
        { name: 'one', rollout: [{ value: true }] },
        { name: 'two', rollout: [{ percentage: 30, value: true }] }
      ]
        .map(f => ({ namespace: 'test_ns', ...f }))

      await Promise.all(flags.map(flag => client.saveFlag(flag)))

      return request(app)
        .get('/test_ns')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)
        .then((res:any) => expect(res.body).toMatchObject(flags))
    })

    test('returns empty', () => {
      return request(app)
        .get('/test_ns')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)
        .then((res:any) => expect(res.body).toEqual([]))
    })
  })

  describe('get flag', () => {
    test('returns flag by name', async () => {
      await client.saveFlag({
        namespace: 'test_ns',
        name: 'one',
        rollout: [{ value: true }]
      })

      return request(app)
        .get('/test_ns/one')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)
        .then((res:any) => expect(res.body).toMatchObject({
          namespace: 'test_ns',
          name: 'one',
          rollout: [{ value: true }]
        }))
    })

    test('returns flag not found', async () => {
      return request(app)
        .get('/test_ns/one')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404)
        .then((res:any) => expect(res.body).toEqual({
          message: 'flag not found'
        }))
    })
  })

  describe('put flag', () => {
    test('updates existing flag', async () => {
      await client.saveFlag({
        namespace: 'test_ns',
        name: 'one',
        rollout: [{ value: true }]
      })

      const res = await request(app)
        .put('/test_ns/one')
        .send({ rollout: [{ value: false }] })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(res.body).toEqual({
        namespace: 'test_ns',
        name: 'one',
        rollout: [{ value: false }]
      })

      const flag = await client.getFlag('test_ns', 'one')
      expect(flag).toMatchObject(res.body)
    })

    test('creates inexistent flag', async () => {
      const res = await request(app)
        .put('/test_ns/one')
        .send({ rollout: [{ value: false }] })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(res.body).toEqual({
        namespace: 'test_ns',
        name: 'one',
        rollout: [{ value: false }]
      })

      const flag = await client.getFlag('test_ns', 'one')
      expect(flag).toMatchObject(res.body)
    })

    test('returns 422 for invalid payload', async () => {
      await request(app)
        .put('/test_ns/one')
        .send({ rollout: 'THIS IS INVALID' })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(422)
    })
  })

  describe('delete flag', () => {
    test('returns 204 for existing flag', async () => {
      await client.saveFlag({
        namespace: 'test_ns',
        name: 'one',
        rollout: [{ value: true }]
      })

      return request(app)
        .delete('/test_ns/one')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(204)
    })

    test('returns 404 for inexistent flag', async () => {
      return request(app)
        .delete('/test_ns/one')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404)
    })
  })
})
