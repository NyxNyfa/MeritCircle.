import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked } from "viem";
import { calculateTier } from "@/lib/tier";
import { readUserCohort } from "@/lib/chain";

/**
 * Endpoint penandatanganan resmi backend untuk join pool.
 * Menerima { walletAddress, poolId? } — poolId adalah id DB (cuid).
 * Risk gate: tier >= tierRequired pool, dan pool auction menuntut isVerified.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { walletAddress, poolId } = body;

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

        // 2. Hitung Tier User berdasarkan Merit Score (band spesifikasi)
        const userTier = calculateTier(user.meritScore);

        // 3. Risk gate per-pool bila poolId disertakan
        if (poolId) {
            const pool = await prisma.pool.findUnique({ where: { id: String(poolId) } });
            if (!pool) {
                return NextResponse.json({ error: "Pool tidak ditemukan" }, { status: 404 });
            }
            if (userTier < pool.tierRequired) {
                return NextResponse.json(
                    { error: `Ditolak: Butuh Tier ${pool.tierRequired}` },
                    { status: 403 }
                );
            }
            if (pool.isAuctionMode && !user.isVerified) {
                return NextResponse.json(
                    { error: "Ditolak: Pool auction membutuhkan akun terverifikasi" },
                    { status: 403 }
                );
            }

            // Strict Lock-in check: user tidak boleh join pool lain jika sedang terikat di pool aktif
            const existingMemberships = await prisma.poolMember.findMany({
                where: { userId: walletAddress.toLowerCase() },
                include: { pool: true },
            });

            // Validasi status on-chain untuk membership yang tercatat di DB (bersihkan stale membership)
            const trulyActiveMemberships = [];
            for (const m of existingMemberships) {
                try {
                    const onChainCohort = await readUserCohort(m.pool.poolIdOnChain, walletAddress);
                    if (onChainCohort > BigInt(0)) {
                        trulyActiveMemberships.push(m);
                    } else {
                        // Bersihkan DB membership yang sudah tuntas (COMPLETED) on-chain
                        await prisma.poolMember.deleteMany({
                            where: { poolId: m.poolId, userId: m.userId }
                        }).catch(() => undefined);
                    }
                } catch {
                    trulyActiveMemberships.push(m);
                }
            }

            if (trulyActiveMemberships.length > 0 && !trulyActiveMemberships.some((m) => m.poolId === String(poolId))) {
                return NextResponse.json(
                    { error: `Ditolak: Anda sudah terikat di ${trulyActiveMemberships[0].pool.name}` },
                    { status: 403 }
                );
            }
        }

        // 4. Tanda tangan digital backend (format pesan = kontrak: abi.encodePacked(address, uint256))
        const privateKey = process.env.BACKEND_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("BACKEND_PRIVATE_KEY belum disetting di .env");
        }

        const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
        const account = privateKeyToAccount(formattedKey as `0x${string}`);

        const messageHash = keccak256(
            encodePacked(
                ['address', 'uint256'],
                [walletAddress as `0x${string}`, BigInt(userTier)]
            )
        );

        const signature = await account.signMessage({
            message: { raw: messageHash }
        });

        // 5. Kembalikan data Tier dan Signature ke Frontend
        return NextResponse.json({
            userTier,
            signature,
            meritScore: user.meritScore
        }, { status: 200 });

    } catch (error) {
        console.error("Gagal membuat signature:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
