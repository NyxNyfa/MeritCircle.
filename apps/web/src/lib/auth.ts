// Wallet-signature challenge-response (SIWE-lite) + session token untuk endpoint mutasi/polling.
// Alur challenge: klien minta nonce -> wallet menandatangani pesan -> server verifikasi & rotate nonce.
// Alur session: satu challenge -> server menerbitkan HMAC session token (24 jam) untuk polling tanpa popup.
import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { recoverMessageAddress } from 'viem'
import { buildAuthMessage } from '@/lib/auth-message'

function hmacSecret(): string {
  const raw = process.env.BACKEND_PRIVATE_KEY ?? 'merit-pool-dev-secret'
  return crypto.createHash('sha256').update(`mp-session:${raw}`).digest('hex')
}

/** Terbitkan session token ber-HMAC untuk wallet (default 24 jam). */
export function createSessionToken(wallet: string, ttlMs = 24 * 60 * 60 * 1000): string {
  const payload = Buffer.from(
    JSON.stringify({ w: wallet.toLowerCase(), exp: Date.now() + ttlMs }),
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', hmacSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/** Verifikasi session token; return wallet bila valid, null selainnya. */
export function verifySessionToken(token: string): string | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', hmacSecret()).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      w?: string
      exp?: number
    }
    if (!parsed.w || !parsed.exp || Date.now() > parsed.exp) return null
    return parsed.w
  } catch {
    return null
  }
}

type NonceRecord = {
  nonce: string
  expiresAt: number
}

const globalForAuth = globalThis as unknown as {
  activeNonces?: Map<string, NonceRecord[]>
}

const activeNonces = globalForAuth.activeNonces ?? new Map<string, NonceRecord[]>()
if (process.env.NODE_ENV !== 'production') {
  globalForAuth.activeNonces = activeNonces
}

export async function issueNonce(address: string): Promise<string> {
  const normalized = address.toLowerCase().trim()
  const nonce = crypto.randomUUID()
  const now = Date.now()
  const ttlMs = 10 * 60 * 1000 // 10 menit masa berlaku nonce

  // Simpan di in-memory cache (menyimpan hingga 5 nonce aktif yang belum expired)
  const existing = (activeNonces.get(normalized) ?? []).filter((item) => item.expiresAt > now)
  existing.push({ nonce, expiresAt: now + ttlMs })
  if (existing.length > 5) existing.shift()
  activeNonces.set(normalized, existing)

  // Sinkronkan ke database secara aman (tidak crash jika koneksi DB lambat/down)
  try {
    await prisma.authChallenge.upsert({
      where: { address: normalized },
      update: { nonce },
      create: { address: normalized, nonce },
    })
  } catch (dbErr) {
    console.warn('[auth] DB challenge sync warning (fallback in-memory tetap aktif):', dbErr)
  }

  return nonce
}

export type AuthProof = {
  address: string
  signature: string
  nonce?: string
}

/**
 * Verifikasi bukti kepemilikan wallet. Mengembalikan alamat ternormalisasi
 * bila valid, atau null bila gagal (nonce habis dipakai / salah / signature palsu).
 */
export async function verifyWalletOwnership(proof: AuthProof): Promise<string | null> {
  if (!proof?.address || !proof?.signature) return null

  const normalized = proof.address.toLowerCase().trim()
  const now = Date.now()

  // Kumpulkan calon nonce yang sah
  const memList = (activeNonces.get(normalized) ?? []).filter((item) => item.expiresAt > now)
  const candidateNonces: string[] = []

  // 1. Jika proof membawa nonce spesifik yang ditandatangani klien
  if (proof.nonce && typeof proof.nonce === 'string') {
    candidateNonces.push(proof.nonce.trim())
  }

  // 2. Tambahkan nonce dari in-memory cache (terbaru dahulu)
  for (let i = memList.length - 1; i >= 0; i--) {
    if (!candidateNonces.includes(memList[i].nonce)) {
      candidateNonces.push(memList[i].nonce)
    }
  }

  // 3. Tambahkan nonce dari database jika ada
  try {
    const challenge = await prisma.authChallenge.findUnique({ where: { address: normalized } })
    if (challenge?.nonce && !candidateNonces.includes(challenge.nonce)) {
      candidateNonces.push(challenge.nonce)
    }
  } catch (dbErr) {
    console.warn('[auth] DB challenge lookup warning:', dbErr)
  }

  if (candidateNonces.length === 0) return null

  let matchedNonce: string | null = null

  // Uji verifikasi tanda tangan terhadap calon-calon nonce yang valid
  for (const candidate of candidateNonces) {
    try {
      const recovered = await recoverMessageAddress({
        message: buildAuthMessage(normalized, candidate),
        signature: proof.signature as `0x${string}`,
      })
      if (recovered.toLowerCase() === normalized) {
        matchedNonce = candidate
        break
      }
    } catch {
      // coba calon berikutnya
    }
  }

  if (!matchedNonce) return null

  // Nonce single-use: hapus nonce yang telah dipakai dari in-memory cache
  const remaining = (activeNonces.get(normalized) ?? []).filter(
    (item) => item.nonce !== matchedNonce && item.expiresAt > now,
  )
  if (remaining.length > 0) {
    activeNonces.set(normalized, remaining)
  } else {
    activeNonces.delete(normalized)
  }

  // Rotate nonce di database mencegah replay
  try {
    await prisma.authChallenge.upsert({
      where: { address: normalized },
      update: { nonce: crypto.randomUUID() },
      create: { address: normalized, nonce: crypto.randomUUID() },
    })
  } catch {
    // abaikan jika DB sedang sibuk
  }

  return normalized
}

/**
 * Autentikasi request: prioritas Bearer session token, fallback ke challenge header.
 * Return alamat ternormalisasi atau null.
 */
export async function authenticateRequest(req: Request): Promise<string | null> {
  const bearer = req.headers.get('authorization')
  if (bearer?.startsWith('Bearer ')) {
    const wallet = verifySessionToken(bearer.slice(7).trim())
    if (wallet) return wallet
  }

  const raw = req.headers.get('x-mp-auth')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthProof
    return await verifyWalletOwnership(parsed)
  } catch {
    return null
  }
}
