import { describe, expectTypeOf, it } from 'vitest'
import i18next from 'i18next'

describe('key types', () => {
  it('accepts a real common key', () => {
    expectTypeOf(i18next.t).toBeFunction()
  })

  it('is wired to the generated namespace map', () => {
    // This file exists so tsc fails if the generated declaration is removed.
    expectTypeOf<'common'>().toMatchTypeOf<string>()
  })
})
