import { describe, expect, it } from 'vitest'
import { MemoryStore } from '../../loader/memory'

describe('MemoryStore', () => {
  it('stores and retrieves by lng and ns', () => {
    const store = new MemoryStore()
    store.set('ar', 'common', { save: 'حفظ' })
    expect(store.get('ar', 'common')).toEqual({ save: 'حفظ' })
    expect(store.has('ar', 'common')).toBe(true)
    expect(store.get('en', 'common')).toBeUndefined()
  })

  it('builds a stable key', () => {
    const store = new MemoryStore()
    expect(store.key('en', 'common')).toBe('en:common')
  })

  it('does not collide across namespaces', () => {
    const store = new MemoryStore()
    store.set('en', 'auth', { a: 1 })
    store.set('en', 'errors', { a: 2 })
    expect(store.get('en', 'auth')).toEqual({ a: 1 })
    expect(store.get('en', 'errors')).toEqual({ a: 2 })
  })

  it('counts entries', () => {
    const store = new MemoryStore()
    store.set('en', 'a', {})
    store.set('en', 'b', {})
    expect(store.entries()).toBe(2)
  })
})
