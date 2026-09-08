import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

/** Feed notifikasi user (terbaru 20) + jumlah belum dibaca. */
export async function GET(req: Request) {
  try {
    const wallet = await authenticateRequest(req);
    if (!wallet) {
      return NextResponse.json({ error: 'Verifikasi wallet dibutuhkan' }, { status: 401 });
    }

    // Generate reminder otomatis jika user memiliki kewajiban iuran aktif
    const obligations = await prisma.obligation.findMany({
      where: { userWallet: wallet, status: 'ACTIVE' },
    });
    for (const obl of obligations) {
      const pool = await prisma.pool.findUnique({ where: { poolIdOnChain: obl.poolIdOnChain } });
      if (pool) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userWallet: wallet,
            type: 'CYCLE_DUE',
            body: { contains: pool.name },
          },
        });
        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              userWallet: wallet,
              type: 'CYCLE_DUE',
              title: `🔔 Tagihan Iuran Bulanan: ${pool.name}`,
              body: `Siklus ${obl.contributedCycles}/${obl.totalCycles} untuk ${pool.name} sedang berjalan. Segera bayar iuran sebesar ${pool.contributionAmount} MC.`,
            },
          });
        }
      }
    }

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userWallet: wallet },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.notification.count({ where: { userWallet: wallet, read: false } }),
    ]);

    return NextResponse.json({ items, unreadCount }, { status: 200 });
  } catch (error) {
    console.error('Notifications API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** Tandai notifikasi sudah dibaca: {ids: string[]} atau {all: true}. */
export async function POST(req: Request) {
  try {
    const wallet = await authenticateRequest(req);
    if (!wallet) {
      return NextResponse.json({ error: 'Verifikasi wallet dibutuhkan' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const where =
      body.all === true
        ? { userWallet: wallet, read: false }
        : {
            userWallet: wallet,
            id: { in: Array.isArray(body.ids) ? body.ids.slice(0, 100) : [] },
          };

    const result = await prisma.notification.updateMany({ where, data: { read: true } });
    return NextResponse.json({ updated: result.count }, { status: 200 });
  } catch (error) {
    console.error('Notification read API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
