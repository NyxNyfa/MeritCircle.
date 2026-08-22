import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encodePacked, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ⚠️ PRIVATE KEY RAHASIA BACKEND (Anvil Account #1)
// Ingat: Di production, ini HARUS disimpan di file .env
const BACKEND_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

export async function POST(req: Request) {
  try {
    // 1. Terima data dari Frontend
    const { userAddress, poolId } = await req.json();

    if (!userAddress || !poolId) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // 2. Cek database Supabase
    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress.toLowerCase() }
    });
    const pool = await prisma.pool.findUnique({
      where: { id: poolId }
    });

    if (!user || !pool) {
      return NextResponse.json({ error: "User atau Pool tidak ditemukan" }, { status: 404 });
    }

    // 3. THE RISK GATE: Evaluasi Tier & VIP
    // 1 Tier = 20 Merit Points — dihitung ulang dari score agar konsisten
    const userTier = Math.floor(user.meritScore / 20);
    if (userTier < pool.tierRequired) {
      return NextResponse.json({ error: `Ditolak: Butuh Tier ${pool.tierRequired}` }, { status: 403 });
    }
    if (pool.isAuctionMode && !user.isVerified) {
      return NextResponse.json({ error: "Ditolak: Membutuhkan status VIP" }, { status: 403 });
    }

    // 4. MEMBUAT TANDA TANGAN (SIGNATURE)
    // - Menyamakan format pesan dengan MeritPool.sol: keccak256(abi.encodePacked(msg.sender, userTier))
    const backendAccount = privateKeyToAccount(BACKEND_PRIVATE_KEY);
    const messageHash = keccak256(
      encodePacked(
        ['address', 'uint256'],
        [userAddress as `0x${string}`, BigInt(userTier)]
      )
    );
    const signature = await backendAccount.signMessage({
      message: { raw: messageHash }
    });

    // 5. Kembalikan Tanda Tangan + tier yang ditandatangani ke Frontend
    return NextResponse.json({ signature, userTier }, { status: 200 });

  } catch (error) {
    console.error("Signature API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}