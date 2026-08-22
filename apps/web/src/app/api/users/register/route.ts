// apps/web/src/app/api/users/register/route.ts

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isWhitelisted, qaUsernameFor } from '@/config/whitelist';
import { authenticateRequest } from '@/lib/auth';
import { calculateTier } from '@/lib/tier';

export async function POST(req: Request) {
  try {
    // Wajib bukti kepemilikan wallet (challenge-response) — cegah registrasi atas nama wallet orang lain
    const authedAddress = await authenticateRequest(req);
    if (!authedAddress) {
      return NextResponse.json({ error: 'Verifikasi wallet dibutuhkan' }, { status: 401 });
    }

    const { username, email, socialMedia } = await req.json();
    const normalizedAddress = authedAddress;

    // QA bypass: wallet whitelist tidak perlu register manual — langsung QA_Tester Tier 5
    if (isWhitelisted(normalizedAddress)) {
      const qa = await prisma.user.upsert({
        where: { walletAddress: normalizedAddress },
        update: {
          username: qaUsernameFor(normalizedAddress),
          meritScore: 100,
          tier: calculateTier(100),
          isVerified: true,
        },
        create: {
          walletAddress: normalizedAddress,
          username: qaUsernameFor(normalizedAddress),
          meritScore: 100,
          tier: calculateTier(100),
          isVerified: true,
        },
      });
      return NextResponse.json(qa, { status: 200 });
    }

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: "Username wajib diisi" }, { status: 400 });
    }

    const normalizedUsername = username.trim().replace(/\s+/g, ' ');

    // Idempotent: jika wallet SUDAH terdaftar, jangan error 500 —
    // kembalikan data user yang ada (200) agar UI tidak masuk loop "Create Identity".
    const existing = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
    });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    // Username harus unik di seluruh wallet
    const nameTaken = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (nameTaken) {
      return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
    }

    // User baru mulai dari Score 0 = Tier 0
    const newUser = await prisma.user.create({
      data: {
        walletAddress: normalizedAddress,
        username: normalizedUsername,
        email: email && typeof email === 'string' ? email.trim() : null,
        socialMedia: socialMedia && typeof socialMedia === 'string' ? socialMedia.trim() : null,
        meritScore: 0,
        tier: calculateTier(0),
        isVerified: false,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Register API Error:", error);
    // Unique constraint yang tersisa (mis. username tabrakan dalam satu request) -> 409
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: "Wallet atau username sudah terdaftar" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
