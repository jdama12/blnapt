import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.110.7'

async function hmac(value: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function consumeRateLimit(
  admin: SupabaseClient,
  request: Request,
  secret: string,
  attemptType: 'register' | 'login' | 'qr-complaint',
  limit: number,
  windowMinutes: number,
) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientIp = request.headers.get('cf-connecting-ip') ?? forwarded ?? 'unknown'
  const ipHash = await hmac(clientIp, secret)
  const threshold = new Date(Date.now() - windowMinutes * 60_000).toISOString()

  const { count, error } = await admin
    .from('resident_auth_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('attempt_type', attemptType)
    .eq('ip_hash', ipHash)
    .gte('created_at', threshold)

  if (error) throw error
  if ((count ?? 0) >= limit) return false

  const { error: insertError } = await admin
    .from('resident_auth_attempts')
    .insert({ attempt_type: attemptType, ip_hash: ipHash })
  if (insertError) throw insertError

  if (Math.random() < 0.02) {
    const cleanupThreshold = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString()
    await admin.from('resident_auth_attempts').delete().lt('created_at', cleanupThreshold)
  }

  return true
}
