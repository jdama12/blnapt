export const routePaths = {
  login: '/login',
  adminLogin: '/admin/login',
  adminResetPassword: '/admin/reset-password',
  dashboard: '/dashboard',
  complaints: '/complaints',
  notices: '/notices',
  fees: '/fees',
  mypage: '/mypage',
  admin: '/admin',
} as const

export type AppRoute = keyof typeof routePaths

