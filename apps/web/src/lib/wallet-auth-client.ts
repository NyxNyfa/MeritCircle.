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
