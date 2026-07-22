import { createClient } from 'npm:@supabase/supabase-js@2.110.7'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { consumeRateLimit } from '../_shared/rate-limit.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ message: '허용되지 않은 요청입니다.' }, 405)

  try {
    const body = await request.json() as Record<string, unknown>
    const action = String(body.action ?? '')
    const qrCode = String(body.qrCode ?? '').trim()
    if (!uuidPattern.test(qrCode)) return jsonResponse({ message: '유효하지 않은 세대 QR입니다.' }, 404)

    const { data: qr, error: qrError } = await admin
      .from('household_qr_codes')
      .select('household_id')
      .eq('qr_code', qrCode)
      .maybeSingle()
    if (qrError) throw qrError
    if (!qr) return jsonResponse({ message: '만료되었거나 유효하지 않은 세대 QR입니다.' }, 404)

    const { data: household, error: householdError } = await admin
      .from('households')
      .select('id, building, unit, current_resident_id')
      .eq('id', qr.household_id)
      .maybeSingle()
    if (householdError) throw householdError
    if (!household) return jsonResponse({ message: '세대 정보를 찾을 수 없습니다.' }, 404)

    if (action === 'resolve') {
      return jsonResponse({ building: household.building, unit: household.unit })
    }
    if (action !== 'login') return jsonResponse({ message: '허용되지 않은 요청입니다.' }, 400)

    const withinLimit = await consumeRateLimit(admin, request, serviceRoleKey, 'login', 30, 10)
    if (!withinLimit) return jsonResponse({ message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429)

    const password = String(body.password ?? '')
    if (!password || !household.current_resident_id) {
      return jsonResponse({ message: '비밀번호가 일치하지 않거나 현재 등록된 입주민이 없습니다.' }, 401)
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, household_id, approved, membership_status, role')
      .eq('id', household.current_resident_id)
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile || profile.role !== 'resident' || !profile.approved || profile.membership_status !== 'active' || profile.household_id !== household.id) {
      return jsonResponse({ message: '비밀번호가 일치하지 않거나 현재 등록된 입주민이 없습니다.' }, 401)
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await authClient.auth.signInWithPassword({ email: profile.email, password })
    if (error || !data.session) return jsonResponse({ message: '비밀번호가 일치하지 않습니다.' }, 401)

    return jsonResponse({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      residentId: profile.id,
      householdId: household.id,
      building: household.building,
      unit: household.unit,
    })
  } catch (error) {
    console.error('resident-qr-login failed', error)
    return jsonResponse({ message: 'QR 로그인을 처리하지 못했습니다.' }, 500)
  }
})

