// Pesan challenge auth — file pure (tanpa dependency server) agar bisa
// di-import oleh kode client dan server sekaligus.
export const AUTH_MESSAGE_PREFIX = 'Merit Pool — Verifikasi kepemilikan wallet'

export function buildAuthMessage(address: string, nonce: string): string {
  return `${AUTH_MESSAGE_PREFIX}\nAddress: ${address.toLowerCase()}\nNonce: ${nonce}`
}
