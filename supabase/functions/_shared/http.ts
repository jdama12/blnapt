export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function normalizeResidentInput(input: Record<string, unknown>) {
  const building = Number(String(input.building ?? '').trim())
  const unit = Number(String(input.unit ?? '').trim())
  const phoneLast4 = String(input.phoneLast4 ?? '').replace(/\D/g, '')
  const password = String(input.password ?? '')

  if (!Number.isInteger(building) || building < 101 || building > 107) {
    throw new Error('동을 정확히 입력해 주세요.')
  }
  if (!Number.isInteger(unit) || unit < 101 || unit > 9999) {
    throw new Error('호수를 정확히 입력해 주세요.')
  }
  if (!/^\d{4}$/.test(phoneLast4)) {
    throw new Error('전화번호 뒤 4자리를 입력해 주세요.')
  }

  return { building, unit, phoneLast4, password }
}

export function normalizeRegistrationInput(input: Record<string, unknown>) {
  const building = Number(String(input.building ?? '').trim())
  const unit = Number(String(input.unit ?? '').trim())
  const phone = String(input.phone ?? '').replace(/\D/g, '')
  const password = String(input.password ?? '')

  if (!Number.isInteger(building) || building < 101 || building > 107) {
    throw new Error('동을 정확히 입력해 주세요.')
  }
  if (!Number.isInteger(unit) || unit < 101 || unit > 9999) {
    throw new Error('호수를 정확히 입력해 주세요.')
  }
  if (!/^01[016789]\d{7,8}$/.test(phone)) {
    throw new Error('전화번호를 정확히 입력해 주세요.')
  }

  return { building, unit, phone, phoneLast4: phone.slice(-4), password }
}
