// apps/web/src/lib/prisma.ts
//
// SINGLETON PrismaClient — satu koneksi pool untuk seluruh app.
// Sebelumnya setiap route handler membuat `new PrismaClient()` sendiri,
// sehingga di dev (hot-reload) dan production pool terkuras sampai
// "max clients reached" -> GET /api/users mengembalikan 500 -> UI salah
// menyangka wallet "belum terdaftar" padahal sudah ada di database.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}