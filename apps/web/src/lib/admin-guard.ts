// Guard sederhana endpoint admin (testnet): wallet pemanggil harus sama dengan ADMIN_WALLET.
import { NextResponse } from 'next/server'

export function checkAdminAccess(req: Request): NextResponse | null {
  const adminWallet = process.env.ADMIN_WALLET?.toLowerCase()
  if (!adminWallet) {
    return NextResponse.json({ error: 'ADMIN_WALLET belum diset di server' }, { status: 503 })
  }
  const url = new URL(req.url)
  const requester = (url.searchParams.get('wallet') ?? '').toLowerCase()
  if (requester !== adminWallet) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }
  return null
}
