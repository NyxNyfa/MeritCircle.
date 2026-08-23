// Bukti E2E alur auth: daftar (1x challenge) → session token → semua aksi pakai Bearer tanpa sign lagi.
import { privateKeyToAccount } from 'viem/accounts'
import { buildAuthMessage } from '../src/lib/auth-message'

const BASE = 'http://localhost:3000'
// anvil #4 — akun baru yang belum terdaftar
const KEY = '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba'
const account = privateKeyToAccount(KEY as `0x${string}`)
const wallet = account.address.toLowerCase()

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init)
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    /* html */
  }
  return { status: res.status, body }
}

async function challengeHeaders(): Promise<Record<string, string>> {
  const { nonce } = (await (await api('/api/auth/nonce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet }),
  })).body) as { nonce: string }
  const signature = await account.signMessage({ message: buildAuthMessage(wallet, nonce) })
  return { 'Content-Type': 'application/json', 'x-mp-auth': JSON.stringify({ address: wallet, signature }) }
}

async function main() {
  // 1. REGISTER — butuh TEPAT satu challenge-signature
  const reg = await api('/api/users/register', {
    method: 'POST',
    headers: await challengeHeaders(),
    body: JSON.stringify({ username: `proof_${wallet.slice(-4)}` }),
  })
  console.log('register:', reg.status, (reg.body as { username?: string; error?: string }).username ?? (reg.body as { error?: string }).error)

  // 2. SESSION — satu challenge lagi, lalu token di-cache klien selama 24 jam
  const sess = await api('/api/auth/session', {
    method: 'POST',
    headers: await challengeHeaders(),
  })
  const { token } = sess.body as { token: string }
  console.log('session:', sess.status, token ? 'token diterima' : 'GAGAL')
  const bearer = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // 3. Semua aksi berikutnya TANPA tanda tangan sama sekali:
  const notif = await api('/api/me/notifications', { headers: bearer })
  console.log('notifications (Bearer):', notif.status)

  const patch = await api(`/api/users/${wallet}`, {
    method: 'PATCH',
    headers: bearer,
    body: JSON.stringify({ bio: 'diubah via session tanpa popup' }),
  })
  console.log('patch profil (Bearer):', patch.status)

  const act = await api('/api/me/activity', { headers: bearer })
  console.log('activity (Bearer):', act.status)

  // 4. Buktikan Bearer TANPA token ditolak (auth tetap berlaku)
  const anon = await api('/api/me/notifications', { headers: { 'Content-Type': 'application/json' } })
  console.log('notifications (tanpa auth, harus 401):', anon.status)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
