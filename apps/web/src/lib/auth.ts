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

export async function issueNonce(address: string): Promise<string> {
  const normalized = address.toLowerCase()
  const nonce = crypto.randomUUID()
  await prisma.authChallenge.upsert({
    where: { address: normalized },
    update: { nonce },
    create: { address: normalized, nonce },
  })
  return nonce
}

export type AuthProof = {
  address: string
  signature: string
}

/**
 * Verifikasi bukti kepemilikan wallet. Mengembalikan alamat ternormalisasi
 * bila valid, atau null bila gagal (nonce habis dipakai / salah / signature palsu).
 */
export async function verifyWalletOwnership(proof: AuthProof): Promise<string | null> {
  if (!proof?.address || !proof?.signature) return null

  const normalized = proof.address.toLowerCase()
  const challenge = await prisma.authChallenge.findUnique({ where: { address: normalized } })
  if (!challenge) return null

  let valid = false
  try {
    // recoverMessageAddress mengembalikan ALAMAT penandatangan (async di viem 2.x) —
    // bandingkan dengan address yang diklaim.
    const recovered = await recoverMessageAddress({
      message: buildAuthMessage(normalized, challenge.nonce),
      signature: proof.signature as `0x${string}`,
    })
    valid = recovered.toLowerCase() === normalized
  } catch {
    valid = false
  }

  // Nonce single-use: rotate setelah diverifikasi (valid maupun tidak) mencegah replay.
  await prisma.authChallenge.update({
    where: { address: normalized },
    data: { nonce: crypto.randomUUID() },
  })

  return valid ? normalized : null
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
