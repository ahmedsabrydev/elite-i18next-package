export const SHARED_NAMESPACES = ['common', 'errors', 'auth', 'validation', 'datetime'] as const
export const SHELL_NAMESPACES = ['common', 'errors'] as const
export type SharedNamespace = (typeof SHARED_NAMESPACES)[number]
