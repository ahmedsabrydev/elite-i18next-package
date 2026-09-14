import { describe, expect, it } from 'vitest'
import { LruCache } from '../../cache/lru'

describe('LruCache', () => {
  it('stores and retrieves', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    expect(c.get('a')).toBe(1)
    expect(c.has('a')).toBe(true)
    expect(c.has('b')).toBe(false)
  })

  it('evicts the least recently used entry', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.get('a')
    c.set('c', 3)
    expect(c.has('a')).toBe(true)
    expect(c.has('b')).toBe(false)
    expect(c.has('c')).toBe(true)
  })

  it('evicts in insertion order when nothing is read', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.set('c', 3)
    expect(c.keys()).toEqual(['b', 'c'])
  })

  it('never exceeds capacity', () => {
    const c = new LruCache<string, number>(3)
    for (const k of ['a', 'b', 'c', 'd', 'e']) c.set(k, 1)
    expect(c.size()).toBe(3)
  })

  it('deletes and reports size', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.delete('a')
    expect(c.size()).toBe(0)
    expect(c.get('a')).toBeUndefined()
  })

  it('updating an existing key keeps one entry', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('a', 2)
    expect(c.size()).toBe(1)
    expect(c.get('a')).toBe(2)
  })

  it('evicts the first key when capacity is 1', () => {
    const c = new LruCache<string, number>(1)
    c.set('a', 1)
    c.set('b', 2)
    expect(c.size()).toBe(1)
    expect(c.has('a')).toBe(false)
    expect(c.has('b')).toBe(true)
    expect(c.get('b')).toBe(2)
  })

  it('reflects promotion order in keys() after a get', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.get('a')
    expect(c.keys()).toEqual(['b', 'a'])
  })

  it.each([0, -1, 1.5])('throws RangeError for invalid capacity %s', (capacity) => {
    expect(() => new LruCache<string, number>(capacity)).toThrow(RangeError)
  })
})
