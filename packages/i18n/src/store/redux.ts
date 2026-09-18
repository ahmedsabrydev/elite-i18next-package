import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { dirFor } from '../core/locale'

export type LocaleState = {
  lng: string
  dir: 'ltr' | 'rtl'
  isRtl: boolean
  status: 'hydrated' | 'switching' | 'loading-ns'
}

const initialState: LocaleState = { lng: 'en', dir: 'ltr', isRtl: false, status: 'hydrated' }

export const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    localeChanged(state, action: PayloadAction<string>) {
      state.lng = action.payload
      state.dir = dirFor(action.payload)
      state.isRtl = state.dir === 'rtl'
    },
    localeStatusChanged(state, action: PayloadAction<LocaleState['status']>) {
      state.status = action.payload
    },
  },
})

export const { localeChanged, localeStatusChanged } = localeSlice.actions
export const selectLocale = (state: { locale: LocaleState }) => state.locale
export const selectDir = (state: { locale: LocaleState }) => state.locale.dir
