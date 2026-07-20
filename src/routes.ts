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
  adminResidents: '/admin/residents',
  adminResidentDetail: '/admin/residents',
} as const

export type AppRoute = keyof typeof routePaths

