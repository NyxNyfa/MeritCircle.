// Helper notifikasi in-app (feed Notification).
import { prisma } from '@/lib/prisma'

export type NotifyType =
  | 'contribution_due'
  | 'payment_success'
  | 'auction_open'
  | 'auction_result'
  | 'default_warning'
  | 'default_recorded'
  | 'merit_change'
  | 'payout'
  | 'pool_completed'

export async function notify(
  wallet: string,
  type: NotifyType,
  title: string,
  body: string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userWallet: wallet.toLowerCase(), type, title, body },
    })
  } catch {
    // notifikasi tidak boleh mematikan alur utama
  }
}

/** Notifikasi dengan dedupe per-window (mencegah spam dari cron berulang). */
export async function notifyOncePerWindow(
  wallet: string,
  type: NotifyType,
  title: string,
  body: string,
  windowMs = 6 * 60 * 60 * 1000,
): Promise<boolean> {
  const normalized = wallet.toLowerCase()
  const existing = await prisma.notification.findFirst({
    where: {
      userWallet: normalized,
      type,
      createdAt: { gte: new Date(Date.now() - windowMs) },
    },
    select: { id: true },
  })
  if (existing) return false
  await notify(normalized, type, title, body)
  return true
}
