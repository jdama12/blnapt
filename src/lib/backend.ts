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

export async function signIn(email: string, password: string) {
  const { data, error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw error
  const { data: profile, error: profileError } = await client().from('profiles').select('*').eq('id', data.user.id).single()
  if (profileError) throw profileError
  if (!profile.approved) {
    await client().auth.signOut()
    throw new Error('관리자 승인 대기 중인 계정입니다.')
  }
  return profile
}

export async function requestPasswordReset(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function resetPassword(password: string) {
  const { data: sessionData, error: sessionError } = await client().auth.getSession()
  if (sessionError) throw sessionError
  if (!sessionData.session) throw new Error('비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.')

  const { error } = await client().auth.updateUser({ password })
  if (error) throw error

  await client().auth.signOut()
}

export async function signUp(input: { email: string; password: string; name: string; phone: string; building: string; unit: string }) {
  const { data, error } = await client().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: { name: input.name, phone: input.phone, building: input.building, unit: input.unit },
    },
  })
  if (error) throw error
  if (data.session) await client().auth.signOut()
}

export async function signOut() {
  const { error } = await client().auth.signOut()
  if (error) throw error
}

export async function fetchAppState() {
  const user = await getSessionUser()
  if (!user) return { currentUserId: null, users: [], complaints: [], notices: [], fees: [], income: [] }

  const { data: ownProfile, error: ownProfileError } = await client().from('profiles').select('*').eq('id', user.id).single()
  if (ownProfileError) throw ownProfileError
  if (!ownProfile.approved) {
    await client().auth.signOut()
    return { currentUserId: null, users: [], complaints: [], notices: [], fees: [], income: [] }
  }
  const profilesQuery = ownProfile.role === 'admin'
    ? client().from('profiles').select('*').order('created_at')
    : client().from('profile_directory').select('*').order('created_at')

  const [profilesResult, complaintsResult, noticesResult, recordsResult] = await Promise.all([
    profilesQuery,
    client().from('complaints').select('*, complaint_comments(*), complaint_history(*)').order('created_at', { ascending: false }),
    client().from('notices').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false }),
    client().from('monthly_records').select('*, monthly_items(*)').order('month', { ascending: false }),
  ])
  for (const result of [profilesResult, complaintsResult, noticesResult, recordsResult]) if (result.error) throw result.error

  const paths = (complaintsResult.data ?? []).map((row) => row.image_path).filter(Boolean)
  const signedUrls = new Map<string, string>()
  await Promise.all(paths.map(async (path) => {
    const { data } = await client().storage.from('complaint-images').createSignedUrl(path, 3600)
    if (data?.signedUrl) signedUrls.set(path, data.signedUrl)
  }))

  const users = (profilesResult.data ?? []).map((row) => ({
    id: row.id, role: row.role, name: row.name, phone: row.id === user.id ? ownProfile.phone : row.phone ?? '', building: row.building,
    unit: row.unit, approved: row.approved, email: row.id === user.id ? ownProfile.email : row.email ?? '',
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
  return { currentUserId: user.id, users, complaints, notices, fees: mappedRecords.filter((row) => row.kind === 'fee'), income: mappedRecords.filter((row) => row.kind === 'income') }
}

export async function approveUser(id: string) {
  const { error } = await client().from('profiles').update({ approved: true }).eq('id', id)
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

export async function updateProfile(id: string, input: { name: string; phone: string; password?: string }) {
  const { error } = await client().from('profiles').update({ name: input.name, phone: input.phone }).eq('id', id)
  if (error) throw error
  if (input.password) {
    const { error: passwordError } = await client().auth.updateUser({ password: input.password })
    if (passwordError) throw passwordError
  }
}
