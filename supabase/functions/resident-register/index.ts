import { createClient } from 'npm:@supabase/supabase-js@2.110.7'
import { corsHeaders, jsonResponse, normalizeRegistrationInput } from '../_shared/http.ts'
import { consumeRateLimit } from '../_shared/rate-limit.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ message: '허용되지 않은 요청입니다.' }, 405)

  try {
    const withinLimit = await consumeRateLimit(admin, request, serviceRoleKey, 'register', 10, 60)
    if (!withinLimit) return jsonResponse({ message: '가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429)

    const { building, unit, phone, phoneLast4, password } = normalizeRegistrationInput(await request.json())
    if (password.length < 8 || password.length > 72) {
      return jsonResponse({ message: '비밀번호는 8자 이상 72자 이하로 입력해 주세요.' }, 400)
    }

    const { data: household, error: householdError } = await admin
      .from('households')
      .select('id')
      .eq('building', building)
      .eq('unit', unit)
      .maybeSingle()

    if (householdError) throw householdError
    if (!household) return jsonResponse({ message: '아파트 세대 목록에 없는 동·호수입니다.' }, 400)

    const { count: matchingPendingCount, error: pendingError } = await admin
      .from('registration_requests')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', household.id)
      .eq('phone_last4', phoneLast4)
      .eq('status', 'pending')

    if (pendingError) throw pendingError
    if ((matchingPendingCount ?? 0) > 0) {
      return jsonResponse({ message: '이미 같은 정보로 접수된 가입 요청이 있습니다.' }, 409)
    }

    const { count: householdPendingCount, error: countError } = await admin
      .from('registration_requests')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', household.id)
      .eq('status', 'pending')

    if (countError) throw countError
    if ((householdPendingCount ?? 0) >= 3) {
      return jsonResponse({ message: '해당 세대의 가입 요청이 많습니다. 관리사무소에 문의해 주세요.' }, 429)
    }

    const internalEmail = `resident-${crypto.randomUUID()}@resident.blnapt.app`
    const { data, error } = await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        account_type: 'resident',
        building: String(building),
        unit: String(unit),
        phone,
        phone_last4: phoneLast4,
      },
    })

    if (error) throw error
    if (!data.user) throw new Error('가입 계정을 생성하지 못했습니다.')

    return jsonResponse({ ok: true }, 201)
  } catch (error) {
    console.error('resident-register failed', error)
    return jsonResponse({ message: '가입 요청을 처리하지 못했습니다.' }, 400)
  }
})
