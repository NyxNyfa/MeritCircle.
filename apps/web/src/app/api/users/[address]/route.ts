import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isWhitelisted, qaUsernameFor } from '@/config/whitelist';

// 1 Tier = 20 Merit Points — tier selalu dihitung ulang dari score agar konsisten
const MERIT_POINTS_PER_TIER = 20;

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
          tier: Math.floor(100 / MERIT_POINTS_PER_TIER),
          isVerified: true,
        },
        create: {
          walletAddress: address,
          username: qaUsernameFor(address),
          meritScore: 100,
          tier: Math.floor(100 / MERIT_POINTS_PER_TIER),
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

    const tier = Math.floor(user.meritScore / MERIT_POINTS_PER_TIER);

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
    const resolvedParams = await params;
    const address = resolvedParams.address.toLowerCase();

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

    const tier = Math.floor(updated.meritScore / MERIT_POINTS_PER_TIER);
    return NextResponse.json({ ...updated, tier }, { status: 200 });
  } catch (error) {
    console.error("Update Profile API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}