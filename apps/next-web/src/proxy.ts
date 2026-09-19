import { NextResponse, type NextRequest } from 'next/server'
import { i18nMiddleware } from '@faang/i18n/next'
import { runtime } from './i18n'

const middleware = i18nMiddleware(runtime)
const COOKIE = 'i18n_lng'

export function proxy(request: NextRequest) {
  const result = middleware({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    acceptLanguage: request.headers.get('accept-language') ?? undefined,
    cookie: request.cookies.get(COOKIE)?.value,
  })
  if (!result) return NextResponse.next()

  const url = request.nextUrl.clone()
  const [pathname, search] = result.redirectTo.split('?')
  url.pathname = pathname ?? '/'
  url.search = search ? `?${search}` : ''
  const response = NextResponse.redirect(url, 307)
  if (result.setCookie) {
    response.cookies.set(COOKIE, result.locale, { path: '/', sameSite: 'lax', httpOnly: false })
  }
  return response
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
