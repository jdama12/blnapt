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

export async function requestAdminPasswordReset(email: string, redirectTo: string) {
  const { error } = await client().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  })
  if (error) throw error
}

export async function updateAdminPassword(password: string) {
  const user = await getSessionUser()
  if (!user) throw new Error('비밀번호 재설정 링크가 만료되었거나 올바르지 않습니다.')

  const { data: admin, error: adminError } = await client()
    .from('admin_accounts')
    .select('id, active')
    .eq('id', user.id)
    .maybeSingle()
  if (adminError) throw adminError
  if (!admin?.active) {
    await client().auth.signOut()
    throw new Error('관리자 계정만 비밀번호를 재설정할 수 있습니다.')
  }

  const { error } = await client().auth.updateUser({ password })
  if (error) throw error
  await client().auth.signOut()
}

export async function updateAdminEmail(email: string) {
  const user = await getSessionUser()
  if (!user) throw new Error('관리자 로그인이 필요합니다.')

  const { data: admin, error: adminError } = await client()
    .from('admin_accounts')
    .select('id, email, active')
    .eq('id', user.id)
    .maybeSingle()
  if (adminError) throw adminError
  if (!admin?.active) throw new Error('활성 관리자 계정만 이메일을 변경할 수 있습니다.')

  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === admin.email.toLowerCase()) return false

  const { error } = await client().auth.updateUser({ email: normalizedEmail })
  if (error) throw error
  return true
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
  if (!user) return { currentUserId: null, users: [], households: [], registrationRequests: [], residentCards: [], complaints: [], notices: [], fees: [], income: [] }

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
    return { currentUserId: null, users: [], households: [], registrationRequests: [], residentCards: [], complaints: [], notices: [], fees: [], income: [] }
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
  const residentCardsPromise = isAdminAccount
    ? client().from('resident_cards').select('*, resident_card_fields(*)')
    : Promise.resolve({ data: [], error: null })

  const [profilesResult, householdsResult, registrationsResult, residentCardsResult, complaintsResult, noticesResult, recordsResult] = await Promise.all([
    profilesQuery,
    householdsPromise,
    registrationRequestsPromise,
    residentCardsPromise,
    client().from('complaints').select('*, complaint_comments(*), complaint_history(*)').order('created_at', { ascending: false }),
    client().from('notices').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false }),
    client().from('monthly_records').select('*, monthly_items(*)').order('month', { ascending: false }),
  ])
  for (const result of [profilesResult, householdsResult, registrationsResult, residentCardsResult, complaintsResult, noticesResult, recordsResult]) if (result.error) throw result.error

  const complaintPaths = (complaintsResult.data ?? []).map((row) => row.image_path).filter(Boolean)
  const complaintSignedUrls = new Map<string, string>()
  const noticePaths = (noticesResult.data ?? []).map((row) => row.image_path).filter(Boolean)
  const noticeSignedUrls = new Map<string, string>()
  await Promise.all(complaintPaths.map(async (path) => {
    const { data } = await client().storage.from('complaint-images').createSignedUrl(path, 3600)
    if (data?.signedUrl) complaintSignedUrls.set(path, data.signedUrl)
  }))
  await Promise.all(noticePaths.map(async (path) => {
    const { data } = await client().storage.from('notice-images').createSignedUrl(path, 3600)
    if (data?.signedUrl) noticeSignedUrls.set(path, data.signedUrl)
  }))

  const users = (profilesResult.data ?? []).filter((row) => row.role !== 'admin').map((row) => ({
    id: row.id, role: row.role, name: row.name,
    email: '',
    phone: isAdminAccount || row.id === user.id ? row.phone ?? '' : '',
    phoneLast4: row.phone_last4 ?? row.phone?.slice(-4) ?? '', building: row.building,
    unit: row.unit, approved: row.approved, householdId: row.household_id, membershipStatus: row.membership_status,
  }))
  if (isAdminAccount) {
    users.push({
      id: user.id,
      role: 'admin',
      name: adminAccount.name,
      email: adminAccount.email,
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
  const residentCards = (residentCardsResult.data ?? []).map((row) => ({
    residentId: row.resident_id,
    moveInDate: row.move_in_date ?? '',
    memo: row.memo ?? '',
    updatedAt: formatDateTime(row.updated_at),
    fields: (row.resident_card_fields ?? [])
      .sort((a: { sort_order: number; id: number }, b: { sort_order: number; id: number }) => a.sort_order - b.sort_order || a.id - b.id)
      .map((field: { id: number; label: string; value: string; sort_order: number }) => ({
        id: field.id,
        label: field.label,
        value: field.value,
        sortOrder: field.sort_order,
      })),
  }))
  const complaints = (complaintsResult.data ?? []).map((row) => {
    const comments = (row.complaint_comments ?? []) as CommentRow[]
    const history = (row.complaint_history ?? []) as HistoryRow[]
    return {
      id: row.id, authorId: row.author_id, title: row.title, category: row.category, location: row.location,
      content: row.content, status: row.status, priority: row.priority, createdAt: formatDateTime(row.created_at),
      updatedAt: formatDateTime(row.updated_at), image: row.image_path ? complaintSignedUrls.get(row.image_path) ?? '' : '',
      comments: comments.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((item) => ({ id: item.id, userId: item.user_id, text: item.body, createdAt: formatDateTime(item.created_at) })),
      history: history.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((item) => ({ status: item.status, date: formatDateTime(item.created_at), note: item.note })),
    }
  })
  const notices = (noticesResult.data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    date: row.published_at,
    pinned: row.pinned,
    body: row.body,
    image: row.image_path ? noticeSignedUrls.get(row.image_path) ?? '' : '',
    imagePath: row.image_path ?? '',
  }))
  const mappedRecords = (recordsResult.data ?? []).map((row) => {
    const items = (row.monthly_items ?? []) as MonthlyItemRow[]
    return { kind: row.kind, month: row.month.slice(0, 7), total: Number(row.total), previous: Number(row.previous), items: items.sort((a, b) => a.sort_order - b.sort_order).map((item) => [item.name, Number(item.current_amount), Number(item.previous_amount)]) }
  })
  return { currentUserId: user.id, users, households, registrationRequests, residentCards, complaints, notices, fees: mappedRecords.filter((row) => row.kind === 'fee'), income: mappedRecords.filter((row) => row.kind === 'income') }
}

export async function saveResidentCard(residentId: string, input: { moveInDate: string | null; memo: string }) {
  const { error } = await client().from('resident_cards').upsert({
    resident_id: residentId,
    move_in_date: input.moveInDate,
    memo: input.memo,
  }, { onConflict: 'resident_id' })
  if (error) throw error
}

export async function addResidentCardField(residentId: string, label: string, value: string) {
  const { error } = await client().from('resident_card_fields').insert({
    resident_id: residentId,
    label,
    value,
  })
  if (error) throw error
}

export async function updateResidentCardField(id: number, label: string, value: string) {
  const { error } = await client().from('resident_card_fields').update({ label, value }).eq('id', id)
  if (error) throw error
}

export async function deleteResidentCardField(id: number) {
  const { error } = await client().from('resident_card_fields').delete().eq('id', id)
  if (error) throw error
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

export async function deactivateResident(residentId: string) {
  const { data, error } = await client().rpc('deactivate_resident', { target_resident_id: residentId })
  if (error) throw error
  return data as number
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

export async function createNotice(input: { category: string; title: string; body: string; pinned: boolean; file?: File }) {
  const user = await getSessionUser()
  if (!user) throw new Error('로그인이 필요합니다.')
  let imagePath: string | null = null
  if (input.file) {
    imagePath = `${user.id}/${crypto.randomUUID()}-${input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await client().storage.from('notice-images').upload(imagePath, input.file)
    if (uploadError) throw uploadError
  }

  const { error } = await client().from('notices').insert({
    category: input.category,
    title: input.title,
    body: input.body,
    pinned: input.pinned,
    author_id: user.id,
    image_path: imagePath,
  })
  if (error) {
    if (imagePath) await client().storage.from('notice-images').remove([imagePath])
    throw error
  }
}

export async function updateNotice(input: { id: number; category: string; title: string; body: string; pinned: boolean; existingImagePath?: string; removeImage?: boolean; file?: File }) {
  const user = await getSessionUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  let nextImagePath = input.removeImage ? null : input.existingImagePath || null
  let uploadedImagePath: string | null = null
  if (input.file) {
    uploadedImagePath = `${user.id}/${crypto.randomUUID()}-${input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await client().storage.from('notice-images').upload(uploadedImagePath, input.file)
    if (uploadError) throw uploadError
    nextImagePath = uploadedImagePath
  }

  const { error } = await client().from('notices').update({
    category: input.category,
    title: input.title,
    body: input.body,
    pinned: input.pinned,
    image_path: nextImagePath,
  }).eq('id', input.id)

  if (error) {
    if (uploadedImagePath) await client().storage.from('notice-images').remove([uploadedImagePath])
    throw error
  }

  if (input.existingImagePath && input.existingImagePath !== nextImagePath) {
    await client().storage.from('notice-images').remove([input.existingImagePath])
  }
}

export async function updateProfile(input: { password?: string }) {
  if (input.password) {
    const { error: passwordError } = await client().auth.updateUser({ password: input.password })
    if (passwordError) throw passwordError
  }
}
