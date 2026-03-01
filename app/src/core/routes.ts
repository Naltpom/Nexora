/**
 * Public paths that do not require authentication.
 * Single source of truth — used by the Axios 401 redirect guard and the router.
 */
export const PUBLIC_PATHS = [
  '/login',
  '/logout',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/invitation',
  '/sso/callback',
] as const
