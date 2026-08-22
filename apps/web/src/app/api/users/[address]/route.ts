import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isWhitelisted, qaUsernameFor } from '@/config/whitelist';
import { authenticateRequest } from '@/lib/auth';
import { calculateTier } from '@/lib/tier';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const resolvedParams = await params;
    const address = resolvedParams.address.toLowerCase();

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
      });
      return NextResponse.json({ ...qa, tier: qa.tier }, { status: 200 });
    }

    // Alur normal: cari user di database
    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const tier = calculateTier(user.meritScore);

    return NextResponse.json({ ...user, tier }, { status: 200 });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Wajib bukti kepemilikan wallet — hanya pemilik akun yang boleh edit profil
    const authedAddress = await authenticateRequest(request);
    if (!authedAddress) {
      return NextResponse.json({ error: 'Verifikasi wallet dibutuhkan' }, { status: 401 });
    }

    const resolvedParams = await params;
    const address = resolvedParams.address.toLowerCase();

    if (authedAddress !== address) {
      return NextResponse.json({ error: 'Tidak berhak mengubah profil ini' }, { status: 403 });
    }

    const { avatarUrl, twitterHandle, bio } = await request.json();

    const existing = await prisma.user.findUnique({ where: { walletAddress: address } });
    if (!existing) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Hanya kolom profil yang bisa diedit — meritScore/tier/username tidak pernah berubah di sini,
    // terutama untuk wallet whitelist (QA_Tester / Tier 5).
    const updated = await prisma.user.update({
      where: { walletAddress: address },
      data: {
        avatarUrl: avatarUrl === undefined ? existing.avatarUrl : avatarUrl === null ? null : String(avatarUrl),
        twitterHandle:
          twitterHandle === undefined
            ? existing.twitterHandle
            : twitterHandle === null
              ? null
              : String(twitterHandle).trim() || null,
        bio: bio === undefined ? existing.bio : bio === null ? null : String(bio).trim() || null,
      },
    });

    const tier = calculateTier(updated.meritScore);
    return NextResponse.json({ ...updated, tier }, { status: 200 });
  } catch (error) {
    console.error("Update Profile API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
