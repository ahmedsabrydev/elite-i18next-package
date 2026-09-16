import type { I18nEvent } from '../core/types'

export function emit(
  onEvent: ((event: I18nEvent) => void) | undefined,
  event: I18nEvent,
): void {
  if (!onEvent) return
  try {
    onEvent(event)
  } catch {
    // Observability must never break rendering or loading.
  }
}
