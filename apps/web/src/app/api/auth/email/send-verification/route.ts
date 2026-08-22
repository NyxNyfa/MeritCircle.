import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Kirim email verifikasi. Wajib bukti kepemilikan wallet.
 * Tanpa RESEND_API_KEY: link verifikasi dicetak ke log server (mode dev).
 */
export async function POST(req: Request) {
  try {
    const wallet = await authenticateRequest(req);
    if (!wallet) {
      return NextResponse.json({ error: 'Verifikasi wallet dibutuhkan' }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }
    if (user.isEmailVerified && user.email === normalizedEmail) {
      return NextResponse.json({ error: 'Email sudah terverifikasi' }, { status: 409 });
    }

    // Email unik lintas akun
    const taken = await prisma.user.findFirst({
      where: { email: normalizedEmail, NOT: { walletAddress: wallet } },
      select: { walletAddress: true },
    });
    if (taken) {
      return NextResponse.json({ error: 'Email sudah dipakai akun lain' }, { status: 409 });
    }

    // Simpan email + buat token baru (token lama tidak valid)
    await prisma.user.update({
      where: { walletAddress: wallet },
      data: { email: normalizedEmail, isEmailVerified: false },
    });
    await prisma.emailToken.deleteMany({ where: { wallet } });

    const tokenRecord = await prisma.emailToken.create({
      data: {
        token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
        email: normalizedEmail,
        wallet,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const origin = new URL(req.url).origin;
    const verifyUrl = `${origin}/api/auth/email/verify?token=${tokenRecord.token}`;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      // Mode dev tanpa Resend: tautan dicetak di log server
      console.log(`[email] LINK VERIFIKASI untuk ${normalizedEmail}: ${verifyUrl}`);
      return NextResponse.json(
        { sent: true, devLink: verifyUrl },
        { status: 200 },
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Merit Pool <onboarding@resend.dev>',
        to: [normalizedEmail],
        subject: 'Verifikasi Email — Merit Pool',
        html: `<p>Halo @${user.username},</p>
               <p>Klik tautan berikut untuk memverifikasi email Anda (berlaku 24 jam):</p>
               <p><a href="${verifyUrl}">Verifikasi Email Saya</a></p>
               <p>— Merit Pool</p>`,
      }),
    });

    if (!res.ok) {
      console.error('[email] Resend error:', await res.text());
      return NextResponse.json({ error: 'Gagal mengirim email' }, { status: 502 });
    }

    return NextResponse.json({ sent: true }, { status: 200 });
  } catch (error) {
    console.error('Send verification API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
