import { describe, expect, it } from 'vitest'
import { PersistentStore } from '../../loader/persistent'

describe('PersistentStore without indexedDB', () => {
  it('get resolves undefined', async () => {
    const store = new PersistentStore()
    await expect(store.get('en', 'common')).resolves.toBeUndefined()
  })

  it('set resolves without throwing', async () => {
    const store = new PersistentStore()
    await expect(store.set('en', 'common', { save: 'Save' })).resolves.toBeUndefined()
  })

  it('clear resolves without throwing', async () => {
    const store = new PersistentStore()
    await expect(store.clear()).resolves.toBeUndefined()
  })
})
