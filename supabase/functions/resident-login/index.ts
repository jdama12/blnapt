import { createClient } from 'npm:@supabase/supabase-js@2.110.7'
import { corsHeaders, jsonResponse, normalizeResidentInput } from '../_shared/http.ts'
import { consumeRateLimit } from '../_shared/rate-limit.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ message: '허용되지 않은 요청입니다.' }, 405)

  try {
    const withinLimit = await consumeRateLimit(admin, request, serviceRoleKey, 'login', 30, 10)
    if (!withinLimit) return jsonResponse({ message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429)

    const { building, unit, phoneLast4, password } = normalizeResidentInput(await request.json())
    if (!password) return jsonResponse({ message: '비밀번호를 입력해 주세요.' }, 400)

    const { data: household, error: householdError } = await admin
      .from('households')
      .select('id, current_resident_id')
      .eq('building', building)
      .eq('unit', unit)
      .maybeSingle()

    if (householdError) throw householdError
    if (!household) return jsonResponse({ message: '로그인 정보가 일치하지 않습니다.' }, 401)

    if (!household.current_resident_id) {
      const { count } = await admin
        .from('registration_requests')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', household.id)
        .eq('phone_last4', phoneLast4)
        .eq('status', 'pending')

      if ((count ?? 0) > 0) return jsonResponse({ message: '관리자 승인 대기 중인 계정입니다.' }, 403)
      return jsonResponse({ message: '로그인 정보가 일치하지 않습니다.' }, 401)
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('email, phone_last4, approved, membership_status')
      .eq('id', household.current_resident_id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile || !profile.approved || profile.membership_status !== 'active' || profile.phone_last4 !== phoneLast4) {
      return jsonResponse({ message: '로그인 정보가 일치하지 않습니다.' }, 401)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await authClient.auth.signInWithPassword({
      email: profile.email,
      password,
    })

    if (error || !data.session) return jsonResponse({ message: '로그인 정보가 일치하지 않습니다.' }, 401)

    return jsonResponse({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    })
  } catch (error) {
    console.error('resident-login failed', error)
    return jsonResponse({ message: '로그인을 처리하지 못했습니다.' }, 500)
  }
})
