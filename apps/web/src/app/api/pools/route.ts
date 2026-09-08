import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readUserCohort } from '@/lib/chain';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get('address')?.toLowerCase();

    // Tarik semua pool dari database, urutkan dari tier terendah
    const pools = await prisma.pool.findMany({
      orderBy: { tierRequired: 'asc' },
      include: {
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    const response = await Promise.all(
      pools.map(async (pool) => {
        const allMembers = pool.members;
        const totalMembers = allMembers.length;
        const activeGroups = Math.floor(totalMembers / pool.poolSize);
        const openCohortMembersCount = totalMembers % pool.poolSize;

        // Cek apakah userAddress terdaftar on-chain di salah satu cohort aktif pool ini
        let isUserOnChainMember = false;
        let onChainCohortNum = 0;
        if (userAddress) {
          try {
            const c = await readUserCohort(pool.poolIdOnChain, userAddress);
            if (c > BigInt(0)) {
              isUserOnChainMember = true;
              onChainCohortNum = Number(c);
            } else {
              // Jika user tidak lagi aktif on-chain di pool ini, bersihkan stale membership di DB
              const hasStale = allMembers.some((m) => m.userId.toLowerCase() === userAddress);
              if (hasStale) {
                await prisma.poolMember.deleteMany({
                  where: { poolId: pool.id, userId: userAddress },
                }).catch(() => undefined);
              }
            }
          } catch {
            // fallback DB
            isUserOnChainMember = allMembers.some((m) => m.userId.toLowerCase() === userAddress);
          }
        }

        if (isUserOnChainMember) {
          const userCohortNumber = onChainCohortNum || Math.floor(allMembers.findIndex((m) => m.userId.toLowerCase() === userAddress) / pool.poolSize) + 1;
          const isUserCohortFull = totalMembers >= userCohortNumber * pool.poolSize;
          const userCohortCount = isUserCohortFull ? pool.poolSize : (totalMembers % pool.poolSize);

          return {
            id: pool.id,
            poolIdOnChain: pool.poolIdOnChain,
            name: pool.name,
            tierRequired: pool.tierRequired,
            contributionAmount: pool.contributionAmount,
            poolSize: pool.poolSize,
            totalYield: pool.totalYield,
            isAuctionMode: pool.isAuctionMode,
            viewCount: pool.viewCount,
            lastWinnerUsername: pool.lastWinnerUsername,
            lastWinnerAddress: pool.lastWinnerAddress,
            createdAt: pool.createdAt,
            updatedAt: pool.updatedAt,
            totalMembers,
            activeGroups,
            memberCount: userCohortCount,
            isUserMember: true,
            userCohortNumber,
            isCohortActive: userCohortCount >= pool.poolSize,
          };
        }

      // Untuk non-anggota: tampilkan kapasitas kelompok pembentukan saat ini (0 jika baru dibuat / kelipatan poolSize)
      return {
        id: pool.id,
        poolIdOnChain: pool.poolIdOnChain,
        name: pool.name,
        tierRequired: pool.tierRequired,
        contributionAmount: pool.contributionAmount,
        poolSize: pool.poolSize,
        totalYield: pool.totalYield,
        isAuctionMode: pool.isAuctionMode,
        viewCount: pool.viewCount,
        lastWinnerUsername: pool.lastWinnerUsername,
        lastWinnerAddress: pool.lastWinnerAddress,
        createdAt: pool.createdAt,
        updatedAt: pool.updatedAt,
        totalMembers,
        activeGroups,
        memberCount: openCohortMembersCount,
        isUserMember: false,
        userCohortNumber: null,
        isCohortActive: false,
      };
    })
  );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("API Pools Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}