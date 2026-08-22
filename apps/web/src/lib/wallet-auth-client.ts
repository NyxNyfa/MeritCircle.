'use client'

// Util klien untuk challenge-response verifikasi wallet (dipakai endpoint mutasi).
import { buildAuthMessage } from '@/lib/auth-message'

type SignFn = (args: { message: string }) => Promise<`0x${string}`>

/**
 * Menghasilkan nilai header X-MP-Auth: minta nonce, minta tanda tangan wallet,
 * lalu kemas sebagai JSON {address, signature}.
 */
export async function createWalletAuthHeader(
  address: string,
  signMessageAsync: SignFn,
): Promise<string> {
  const normalized = address.toLowerCase()
  const res = await fetch('/api/auth/nonce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: normalized }),
  })
  if (!res.ok) throw new Error('Gagal memuat nonce verifikasi')
  const { nonce } = (await res.json()) as { nonce: string }
  const signature = await signMessageAsync({ message: buildAuthMessage(normalized, nonce) })
  return JSON.stringify({ address: normalized, signature })
}

const sessionKey = (address: string) => `mp_session_${address.toLowerCase()}`

function cachedSession(address: string): string | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(sessionKey(address))
    if (!raw) return null
    // cek kedaluwarsa lokal tanpa mem-parsing signature
    const payload = raw.split('.')[0]
    const parsed = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    if (!parsed.exp || Date.now() > parsed.exp) {
      window.localStorage.removeItem(sessionKey(address))
      return null
    }
    return raw
  } catch {
    return null
  }
}

/** Header Authorization Bearer — pakai session cache, minta challenge hanya bila perlu. */
export async function getSessionAuthHeaders(
  address: string,
  signMessageAsync: SignFn,
): Promise<Record<string, string>> {
  let token = cachedSession(address)
  if (!token) {
    const authHeader = await createWalletAuthHeader(address, signMessageAsync)
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-mp-auth': authHeader },
    })
    if (!res.ok) throw new Error('Gagal membuat sesi')
    const data = (await res.json()) as { token: string }
    token = data.token
    try {
      window.localStorage.setItem(sessionKey(address), token)
    } catch {
      // storage penuh/blocked — token tetap dipakai di memori panggilan ini
    }
  }
  return { Authorization: `Bearer ${token}` }
}
