import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isWhitelisted, qaUsernameFor } from '@/config/whitelist';
import { calculateTier } from '@/lib/tier';

/**
 * GET /api/users
 * Mendukung pencarian user via query param ?address=...
 * atau verifikasi VIP Whitelist QA otomatis sesuai spesifikasi README §5.E.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) {
      // Jika tanpa parameter address, kembalikan daftar user terdaftar (limit 50)
      const users = await prisma.user.findMany({
        take: 50,
        orderBy: { meritScore: 'desc' },
        select: {
          walletAddress: true,
          username: true,
          meritScore: true,
          tier: true,
          avatarUrl: true,
          isVerified: true,
        },
      });
      return NextResponse.json(users, { status: 200 });
    }

    // QA bypass: wallet whitelist langsung di-upsert jadi profil QA_Tester (Tier 5)
    if (isWhitelisted(address)) {
      const qa = await prisma.user.upsert({
        where: { walletAddress: address },
        update: {
          username: qaUsernameFor(address),
          meritScore: 100,
          tier: calculateTier(100),
          isVerified: true,
        },
        create: {
          walletAddress: address,
          username: qaUsernameFor(address),
          meritScore: 100,
          tier: calculateTier(100),
          isVerified: true,
        },
        include: { memberships: { select: { poolId: true } } },
      });
      return NextResponse.json(
        { ...qa, tier: qa.tier, memberPoolIds: qa.memberships?.map((m) => m.poolId) ?? [] },
        { status: 200 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      include: { memberships: { select: { poolId: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const tier = calculateTier(user.meritScore);
    const { memberships, ...userData } = user;

    return NextResponse.json(
      { ...userData, tier, memberPoolIds: memberships.map((m) => m.poolId) },
      { status: 200 },
    );
  } catch (error) {
    console.error('API Users GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Mendukung registrasi/check wallet via payload { walletAddress }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const address = (body.walletAddress || body.address)?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: 'walletAddress wajib diisi' }, { status: 400 });
    }

    // QA whitelist detection
    if (isWhitelisted(address)) {
      const qa = await prisma.user.upsert({
        where: { walletAddress: address },
        update: {
          username: qaUsernameFor(address),
          meritScore: 100,
          tier: calculateTier(100),
          isVerified: true,
        },
        create: {
          walletAddress: address,
          username: qaUsernameFor(address),
          meritScore: 100,
          tier: calculateTier(100),
          isVerified: true,
        },
        include: { memberships: { select: { poolId: true } } },
      });
      return NextResponse.json(
        { ...qa, tier: qa.tier, memberPoolIds: qa.memberships?.map((m) => m.poolId) ?? [] },
        { status: 200 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      include: { memberships: { select: { poolId: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const tier = calculateTier(user.meritScore);
    const { memberships, ...userData } = user;

    return NextResponse.json(
      { ...userData, tier, memberPoolIds: memberships.map((m) => m.poolId) },
      { status: 200 },
    );
  } catch (error) {
    console.error('API Users POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
