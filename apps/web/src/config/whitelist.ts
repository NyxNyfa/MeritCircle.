// QA whitelist — wallet yang auto-register (bypass layar "Create Identity")
// Saat terhubung, backend langsung membuat profil QA_Tester dengan meritScore 100 (Tier 5).
// BUG SEBELUMNYA: array berisi alamat checksummed (mixed-case) tapi input di-lowercase,
// sehingga .includes() tidak pernah cocok. Sekarang array di-lowercase saat init.
export const QA_WHITELIST = [
  '0x59250f719772EE841a1a5eC6AC4B1e32ec3F1d7F',
  '0xB4a86B0C67b9676F7805720d0F2b12B12F598cbF',
  '0xad4190970D0247F67A97186789f4D7c7dB3785B1',
  '0xB58B93698f09e3eFde98230d63b694b5bDE1246e',
  '0x26dc1a85f5f2C58Ec434b741aE3d9CA891D25806',
].map((address) => address.toLowerCase())

export const QA_USERNAME = 'QA_Tester'

export const isWhitelisted = (address?: string | null) =>
  !!address && QA_WHITELIST.includes(address.toLowerCase())

export const qaUsernameFor = (address: string) => `${QA_USERNAME}_${address.slice(-4)}`
