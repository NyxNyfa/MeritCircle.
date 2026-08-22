import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Endpoint tujuan link dari email — konsumsi token, tandai verified. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token tidak ada' }, { status: 400 });
    }

    const record = await prisma.emailToken.findUnique({ where: { token } });
    if (!record || record.consumed || record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token tidak valid atau kedaluwarsa' },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.emailToken.update({ where: { id: record.id }, data: { consumed: true } }),
      prisma.user.update({
        where: { walletAddress: record.wallet },
        data: { isEmailVerified: true },
      }),
    ]);

    // Respons HTML sederhana agar nyaman dibuka dari email
    return new NextResponse(
      `<!doctype html><html><body style="font-family:sans-serif;background:#10131A;color:#E2E2E9;display:flex;align-items:center;justify-content:center;height:100vh">
        <div style="text-align:center">
          <h1 style="color:#56ffa8">Email terverifikasi ✓</h1>
          <p>Email ${record.email} berhasil diverifikasi.</p>
          <a href="/profile" style="color:#5B7CFF">Kembali ke profil</a>
        </div>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 },
    );
  } catch (error) {
    console.error('Verify email API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
