import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import { AppState, I18nManager } from 'react-native'
import type {
  AppStatePort,
  NativeLocalization,
  NativeRtl,
  NativeStorage,
} from '@faang/i18n/native'

export const storage: NativeStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
}

export const localization: NativeLocalization = {
  getLocales: () =>
    Localization.getLocales().map((entry) => ({
      languageTag: entry.languageTag,
      languageCode: entry.languageCode ?? undefined,
    })),
}

export const rtl: NativeRtl = {
  allowRTL: (allow) => I18nManager.allowRTL(allow),
  forceRTL: (force) => I18nManager.forceRTL(force),
}

export const appState: AppStatePort = {
  addEventListener: (_type, listener) => {
    const sub = AppState.addEventListener('change', listener)
    return { remove: () => sub.remove() }
  },
}
