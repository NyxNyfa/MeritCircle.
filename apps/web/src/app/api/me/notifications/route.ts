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
