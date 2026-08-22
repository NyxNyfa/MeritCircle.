import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked } from "viem";

// Fungsi untuk menerjemahkan Merit Score menjadi Tier (Sesuai Blueprint Anda)
function calculateTier(score: number): number {
    if (score >= 91) return 5;
    if (score >= 76) return 4;
    if (score >= 51) return 3;
    if (score >= 21) return 2;
    if (score >= 1) return 1;
    return 0; // New user atau 0 point
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { walletAddress } = body;

        if (!walletAddress) {
            return NextResponse.json({ error: "Wallet address tidak dikirim" }, { status: 400 });
        }

        // 1. Ambil data User dari Database
        const user = await prisma.user.findUnique({
            where: { walletAddress: walletAddress.toLowerCase() },
        });

        if (!user) {
            return NextResponse.json({ error: "User tidak ditemukan di database" }, { status: 404 });
        }

        // 2. Hitung Tier User berdasarkan Merit Score
        const userTier = calculateTier(user.meritScore);

        // 3. Proses Keamanan Tingkat Tinggi: Tanda Tangan Digital (Viem)
        const privateKey = process.env.BACKEND_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("BACKEND_PRIVATE_KEY belum disetting di .env");
        }

        // Pastikan format private key benar (memiliki awalan 0x)
        const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
        const account = privateKeyToAccount(formattedKey as `0x${string}`);

        // Buat pesan hash persis seperti yang diharapkan Smart Contract: abi.encodePacked(address, uint256)
        const messageHash = keccak256(
            encodePacked(
                ['address', 'uint256'],
                [walletAddress as `0x${string}`, BigInt(userTier)]
            )
        );

        // Tandatangani hash tersebut
        const signature = await account.signMessage({
            message: { raw: messageHash }
        });

        // 4. Kembalikan data Tier dan Signature ke Frontend
        return NextResponse.json({
            userTier,
            signature,
            meritScore: user.meritScore
        }, { status: 200 });

    } catch (error) {
        console.error("Gagal membuat signature:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}