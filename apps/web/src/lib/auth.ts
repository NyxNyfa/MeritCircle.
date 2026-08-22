// Wallet-signature challenge-response (SIWE-lite) untuk endpoint mutasi.
// Alur: klien minta nonce -> wallet menandatangani pesan challenge -> server verifikasi
// dan memutar (rotate) nonce agar satu signature hanya bisa dipakai sekali.
import { prisma } from '@/lib/prisma'
import { verifyMessage } from 'viem'
import { buildAuthMessage } from '@/lib/auth-message'

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
    const recovered = await verifyMessage({
      address: proof.address as `0x${string}`,
      message: buildAuthMessage(normalized, challenge.nonce),
      signature: proof.signature as `0x${string}`,
    })
    valid = String(recovered).toLowerCase() === normalized
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

/** Ekstrak & verifikasi header X-MP-Auth (JSON {address, signature}) dari sebuah request. */
export async function authenticateRequest(req: Request): Promise<string | null> {
  const raw = req.headers.get('x-mp-auth')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthProof
    return await verifyWalletOwnership(parsed)
  } catch {
    return null
  }
}
