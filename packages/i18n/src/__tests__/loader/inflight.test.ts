import { describe, expect, it, vi } from 'vitest'
import { InflightLoader } from '../../loader/inflight'
import { emit } from '../../obs/events'

describe('emit', () => {
  it('calls the listener', () => {
    const spy = vi.fn()
    emit(spy, { type: 'locale.switch', from: 'en', to: 'ar' })
    expect(spy).toHaveBeenCalledOnce()
  })

  it('swallows listener errors', () => {
    const spy = vi.fn(() => {
      throw new Error('boom')
    })
    expect(() => emit(spy, { type: 'locale.switch', from: 'en', to: 'ar' })).not.toThrow()
  })

  it('is a no-op without a listener', () => {
    expect(() => emit(undefined, { type: 'locale.switch', from: 'en', to: 'ar' })).not.toThrow()
  })
})

describe('InflightLoader', () => {
  it('dedups concurrent calls for the same key', async () => {
    const loader = new InflightLoader({ timeoutMs: 1000 })
    const task = vi.fn(async () => 'value')
    const [a, b] = await Promise.all([loader.run('en:common', task), loader.run('en:common', task)])
    expect(a).toBe('value')
    expect(b).toBe('value')
    expect(task).toHaveBeenCalledOnce()
  })

  it('runs different keys independently', async () => {
    const loader = new InflightLoader({ timeoutMs: 1000 })
    const task = vi.fn(async () => 'v')
    await Promise.all([loader.run('a', task), loader.run('b', task)])
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('clears the entry after completion', async () => {
    const loader = new InflightLoader({ timeoutMs: 1000 })
    const task = vi.fn(async () => 'v')
    await loader.run('a', task)
    await loader.run('a', task)
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('retries once on failure then resolves', async () => {
    const loader = new InflightLoader({ timeoutMs: 1000, retries: 1, retryDelayMs: 1 })
    const task = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok')
    await expect(loader.run('a', task)).resolves.toBe('ok')
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('rejects after exhausting retries', async () => {
    const loader = new InflightLoader({ timeoutMs: 1000, retries: 1, retryDelayMs: 1 })
    const task = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(loader.run('a', task)).rejects.toThrow('fail')
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('times out slow tasks', async () => {
    const loader = new InflightLoader({ timeoutMs: 10, retries: 0 })
    const task = () => new Promise<string>((res) => setTimeout(() => res('late'), 200))
    await expect(loader.run('a', task)).rejects.toThrow(/timeout/i)
  })

  it('carries structured lng, ns and ms on timeout', async () => {
    const loader = new InflightLoader({ timeoutMs: 10, retries: 0 })
    const task = () => new Promise<string>((res) => setTimeout(() => res('late'), 200))
    await expect(
      loader.run('en:common', task, { lng: 'en', ns: 'common' }),
    ).rejects.toMatchObject({ name: 'TimeoutError', key: 'en:common', lng: 'en', ns: 'common', ms: 10 })
  })

  it('rejects immediately when timeout is exhausted', async () => {
    const loader = new InflightLoader({ timeoutMs: 5200, retries: 0, retryDelayMs: 0 })
    const task = vi.fn().mockRejectedValue(new Error('nope'))
    await expect(loader.run('a', task)).rejects.toThrow('nope')
  })
})
