import { createClient } from 'npm:@supabase/supabase-js@2.110.7'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { consumeRateLimit } from '../_shared/rate-limit.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const categories = new Set(['시설', '전기', '청소', '주차', '경비', '조경', '소음', '기타'])

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ message: '허용되지 않은 요청입니다.' }, 405)

  let uploadedPath: string | null = null
  let failureStage = '요청 확인'
  try {
    failureStage = '요청 제한 확인'
    const withinLimit = await consumeRateLimit(admin, request, serviceRoleKey, 'qr-complaint', 10, 30)
    if (!withinLimit) return jsonResponse({ message: '민원 접수 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429)

    failureStage = '입력 확인'
    const form = await request.formData()
    const qrCode = String(form.get('qrCode') ?? '').trim()
    const category = String(form.get('category') ?? '').trim()
    const title = String(form.get('title') ?? '').trim()
    const location = String(form.get('location') ?? '').trim()
    const content = String(form.get('content') ?? '').trim()
    if (!uuidPattern.test(qrCode)) return jsonResponse({ message: '유효하지 않은 세대 QR입니다.' }, 404)
    if (!categories.has(category) || !title || title.length > 200 || !location || location.length > 200 || !content || content.length > 3000) {
      return jsonResponse({ message: '민원 내용을 정확히 입력해 주세요.' }, 400)
    }

    failureStage = 'QR 확인'
    const { data: qr, error: qrError } = await admin.from('household_qr_codes').select('household_id').eq('qr_code', qrCode).maybeSingle()
    if (qrError) throw qrError
    if (!qr) return jsonResponse({ message: '만료되었거나 유효하지 않은 세대 QR입니다.' }, 404)

    failureStage = '세대 확인'
    const { data: household, error: householdError } = await admin.from('households').select('id, current_resident_id').eq('id', qr.household_id).maybeSingle()
    if (householdError) throw householdError
    if (!household) return jsonResponse({ message: '세대 정보를 찾을 수 없습니다.' }, 404)

    const image = form.get('image')
    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith('image/') || image.size > 10 * 1024 * 1024) {
        return jsonResponse({ message: '10MB 이하 이미지 파일만 첨부할 수 있습니다.' }, 400)
      }
      failureStage = '이미지 저장'
      const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      uploadedPath = `guest/${household.id}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await admin.storage.from('complaint-images').upload(uploadedPath, image, { contentType: image.type })
      if (uploadError) throw uploadError
    }

    failureStage = '민원 저장'
    const { data: complaint, error: insertError } = await admin.from('complaints').insert({
      author_id: household.current_resident_id,
      household_id: household.id,
      category,
      title,
      location,
      content,
      status: 'pending',
      priority: 'normal',
      source: 'qr',
      image_path: uploadedPath,
    }).select('id').single()
    if (insertError) throw insertError

    return jsonResponse({ id: complaint.id })
  } catch (error) {
    if (uploadedPath) await admin.storage.from('complaint-images').remove([uploadedPath])
    const errorCode = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : 'unknown'
    console.error('resident-qr-complaint failed', { failureStage, errorCode, error })
    return jsonResponse({
      message: `민원을 접수하지 못했습니다. (${failureStage})`,
      errorCode: `QR-${failureStage === '민원 저장' ? 'SAVE' : failureStage === '이미지 저장' ? 'IMAGE' : failureStage === '요청 제한 확인' ? 'LIMIT' : 'CHECK'}`,
    }, 500)
  }
})
