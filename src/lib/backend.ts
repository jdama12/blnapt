import { isSupabaseConfigured, supabase } from './supabase'

type CommentRow = { id: number; user_id: string; body: string; created_at: string }
type HistoryRow = { status: string; note: string; created_at: string }
type MonthlyItemRow = { name: string; current_amount: number | string; previous_amount: number | string; sort_order: number }

const client = () => {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return supabase
}

const formatDateTime = (value: string) => new Date(value).toLocaleString('sv-SE', { hour12: false }).slice(0, 16)

export async function getSessionUser() {
  const { data, error } = await client().auth.getSession()
  if (error) throw error
  return data.session?.user ?? null
}

type ResidentCredentials = {
  building: string
  unit: string
  phoneLast4: string
  password: string
}

type ResidentRegistration = {
  building: string
  unit: string
  phone: string
  password: string
}

async function invokeResidentFunction<T>(name: string, body: ResidentCredentials | ResidentRegistration) {
  const { data, error } = await client().functions.invoke(name, { body })
  if (error) {
    let message = error.message
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const errorBody = await context.json() as { message?: string }
        if (errorBody.message) message = errorBody.message
      } catch {
        // Keep the SDK error when the function did not return JSON.
      }
    }
    throw new Error(message)
  }
  return data as T
}

export async function signIn(input: ResidentCredentials) {
  const session = await invokeResidentFunction<{ accessToken: string; refreshToken: string }>('resident-login', input)
  const { data, error } = await client().auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  })
  if (error) throw error
  if (!data.user) throw new Error('로그인 세션을 만들지 못했습니다.')

  const { data: profile, error: profileError } = await client().from('profiles').select('*').eq('id', data.user.id).single()
  if (profileError) throw profileError
  if (!profile.approved || profile.membership_status !== 'active') {
    await client().auth.signOut()
    throw new Error('현재 입주민으로 승인된 계정이 아닙니다.')
  }
  return profile
}

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await client().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw error
  if (!data.user) throw new Error('관리자 로그인 세션을 만들지 못했습니다.')

  const { data: admin, error: adminError } = await client()
    .from('admin_accounts')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()
  if (adminError) throw adminError
  if (!admin?.active) {
    await client().auth.signOut()
    throw new Error('사용 가능한 관리자 계정이 아닙니다.')
  }
  return admin
}

export async function signUp(input: ResidentRegistration) {
  await invokeResidentFunction<{ ok: true }>('resident-register', input)
}

export async function signOut() {
  const { error } = await client().auth.signOut()
  if (error) throw error
}

export async function fetchAppState() {
  const user = await getSessionUser()
  if (!user) return { currentUserId: null, users: [], households: [], registrationRequests: [], complaints: [], notices: [], fees: [], income: [] }

  const [adminResult, profileResult] = await Promise.all([
    client().from('admin_accounts').select('*').eq('id', user.id).maybeSingle(),
    client().from('profiles').select('*').eq('id', user.id).maybeSingle(),
  ])
  if (adminResult.error) throw adminResult.error
  if (profileResult.error) throw profileResult.error

  const adminAccount = adminResult.data
  const ownProfile = profileResult.data
  const isAdminAccount = Boolean(adminAccount?.active)
  const isActiveResident = Boolean(
    ownProfile?.role === 'resident'
      && ownProfile.approved
      && ownProfile.membership_status === 'active',
  )
  if (!isAdminAccount && !isActiveResident) {
    await client().auth.signOut()
    return { currentUserId: null, users: [], households: [], registrationRequests: [], complaints: [], notices: [], fees: [], income: [] }
  }

  const profilesQuery = isAdminAccount
    ? client().from('profiles').select('*').order('created_at')
    : client().from('profile_directory').select('*').order('created_at')

  const registrationRequestsPromise = isAdminAccount
    ? client().from('registration_requests').select('*').eq('status', 'pending').order('created_at')
    : Promise.resolve({ data: [], error: null })
  const householdsPromise = isAdminAccount
    ? client().from('households').select('*').order('building').order('unit')
    : Promise.resolve({ data: [], error: null })

  const [profilesResult, householdsResult, registrationsResult, complaintsResult, noticesResult, recordsResult] = await Promise.all([
    profilesQuery,
    householdsPromise,
    registrationRequestsPromise,
    client().from('complaints').select('*, complaint_comments(*), complaint_history(*)').order('created_at', { ascending: false }),
    client().from('notices').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false }),
    client().from('monthly_records').select('*, monthly_items(*)').order('month', { ascending: false }),
  ])
  for (const result of [profilesResult, householdsResult, registrationsResult, complaintsResult, noticesResult, recordsResult]) if (result.error) throw result.error

  const paths = (complaintsResult.data ?? []).map((row) => row.image_path).filter(Boolean)
  const signedUrls = new Map<string, string>()
  await Promise.all(paths.map(async (path) => {
    const { data } = await client().storage.from('complaint-images').createSignedUrl(path, 3600)
    if (data?.signedUrl) signedUrls.set(path, data.signedUrl)
  }))

  const users = (profilesResult.data ?? []).filter((row) => row.role !== 'admin').map((row) => ({
    id: row.id, role: row.role, name: row.name,
    phone: isAdminAccount || row.id === user.id ? row.phone ?? '' : '',
    phoneLast4: row.phone_last4 ?? row.phone?.slice(-4) ?? '', building: row.building,
    unit: row.unit, approved: row.approved, householdId: row.household_id, membershipStatus: row.membership_status,
  }))
  if (isAdminAccount) {
    users.push({
      id: user.id,
      role: 'admin',
      name: adminAccount.name,
      phone: adminAccount.phone ?? '',
      phoneLast4: '',
      building: '관리',
      unit: '사무소',
      approved: true,
      householdId: null,
      membershipStatus: 'active',
    })
  }
  const registrationRequests = (registrationsResult.data ?? []).map((row) => {
    const applicant = users.find((profile) => profile.id === row.applicant_id)
    return {
      id: row.id,
      applicantId: row.applicant_id,
      householdId: row.household_id,
      building: applicant?.building ?? '',
      unit: applicant?.unit ?? '',
      phone: row.phone,
      phoneLast4: row.phone_last4,
      requestType: row.request_type,
      previousResidentId: row.previous_resident_id,
      createdAt: formatDateTime(row.created_at),
    }
  })
  const households = (householdsResult.data ?? []).map((row) => ({
    id: row.id,
    building: String(row.building),
    unit: String(row.unit),
    area: Number(row.area_sqm),
    currentResidentId: row.current_resident_id,
  }))
  const complaints = (complaintsResult.data ?? []).map((row) => {
    const comments = (row.complaint_comments ?? []) as CommentRow[]
    const history = (row.complaint_history ?? []) as HistoryRow[]
    return {
      id: row.id, authorId: row.author_id, title: row.title, category: row.category, location: row.location,
      content: row.content, status: row.status, priority: row.priority, createdAt: formatDateTime(row.created_at),
      updatedAt: formatDateTime(row.updated_at), image: row.image_path ? signedUrls.get(row.image_path) ?? '' : '',
      comments: comments.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((item) => ({ id: item.id, userId: item.user_id, text: item.body, createdAt: formatDateTime(item.created_at) })),
      history: history.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((item) => ({ status: item.status, date: formatDateTime(item.created_at), note: item.note })),
    }
  })
  const notices = (noticesResult.data ?? []).map((row) => ({ id: row.id, category: row.category, title: row.title, date: row.published_at, pinned: row.pinned, body: row.body }))
  const mappedRecords = (recordsResult.data ?? []).map((row) => {
    const items = (row.monthly_items ?? []) as MonthlyItemRow[]
    return { kind: row.kind, month: row.month.slice(0, 7), total: Number(row.total), previous: Number(row.previous), items: items.sort((a, b) => a.sort_order - b.sort_order).map((item) => [item.name, Number(item.current_amount), Number(item.previous_amount)]) }
  })
  return { currentUserId: user.id, users, households, registrationRequests, complaints, notices, fees: mappedRecords.filter((row) => row.kind === 'fee'), income: mappedRecords.filter((row) => row.kind === 'income') }
}

export async function approveUser(requestId: number) {
  const { data, error } = await client().rpc('approve_registration', { request_id: requestId })
  if (error) throw error
  return data?.[0] as { approved_household_id: number; resident_replaced: boolean } | undefined
}

export async function rejectRegistration(requestId: number) {
  const { error } = await client().rpc('reject_registration', { request_id: requestId })
  if (error) throw error
}

export async function createComplaint(input: { authorId: string; title: string; category: string; location: string; content: string; status: string; file?: File }) {
  let imagePath: string | null = null
  if (input.file) {
    imagePath = `${input.authorId}/${crypto.randomUUID()}-${input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await client().storage.from('complaint-images').upload(imagePath, input.file)
    if (error) throw error
  }
  const { error } = await client().from('complaints').insert({ author_id: input.authorId, title: input.title, category: input.category, location: input.location, content: input.content, status: input.status, image_path: imagePath })
  if (error) throw error
}

export async function addComplaintComment(complaintId: number, userId: string, body: string) {
  const { error } = await client().from('complaint_comments').insert({ complaint_id: complaintId, user_id: userId, body })
  if (error) throw error
}

export async function updateComplaintStatus(id: number, status: string) {
  const { error } = await client().from('complaints').update({ status }).eq('id', id)
  if (error) throw error
}

export async function createNotice(input: { category: string; title: string; body: string; pinned: boolean }) {
  const user = await getSessionUser()
  if (!user) throw new Error('로그인이 필요합니다.')
  const { error } = await client().from('notices').insert({ ...input, author_id: user.id })
  if (error) throw error
}

export async function updateProfile(input: { password?: string }) {
  if (input.password) {
    const { error: passwordError } = await client().auth.updateUser({ password: input.password })
    if (passwordError) throw passwordError
  }
}
