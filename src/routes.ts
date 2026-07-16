export const routePaths = {
  login: '/login',
  dashboard: '/dashboard',
  complaints: '/complaints',
  notices: '/notices',
  fees: '/fees',
  mypage: '/mypage',
  admin: '/admin',
} as const

export type AppRoute = keyof typeof routePaths

