// E2E lifecycle Basic Pool di Anvil: join -> settle x3 -> verifikasi DB & merit.
// Pemakaian:
//   DATABASE_URL=... BACKEND_PRIVATE_KEY=0x... npx tsx scripts/e2e-lifecycle.ts
// (KEEPER_PRIVATE_KEY diset otomatis dari BACKEND/owner key di dalam skrip)
import { createPublicClient, createWalletClient, http, parseEther, keccak256, encodePacked } from 'viem'
import { foundry } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { getContractAddresses, MERITPOOL_ABI, MCIRCLE_ABI } from '../src/config/contracts'
import { runIndexerOnce } from '../src/lib/indexer'
import { runKeeperOnce } from '../src/lib/keeper'
import { prisma } from '../src/lib/prisma'

const OWNER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const USER_KEYS = [
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // anvil #1
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // anvil #2
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // anvil #3
]
const USER_NAMES = ['e2e_alice', 'e2e_bob', 'e2e_carol']

async function main() {
  const transport = http('http://127.0.0.1:8545')
  const publicClient = createPublicClient({ chain: foundry, transport })
  const { mcToken, meritPool } = getContractAddresses(31337)

  const backendPrivateKey = process.env.BACKEND_PRIVATE_KEY
  if (!backendPrivateKey) throw new Error('BACKEND_PRIVATE_KEY wajib untuk skrip ini')
  const backendAccount = privateKeyToAccount(
    (backendPrivateKey.startsWith('0x') ? backendPrivateKey : `0x${backendPrivateKey}`) as `0x${string}`,
  )
  process.env.KEEPER_PRIVATE_KEY = OWNER_KEY

  function walletFor(key: string) {
    const account = privateKeyToAccount(key as `0x${string}`)
    return { account, client: createWalletClient({ account, chain: foundry, transport }) }
  }

  async function signJoin(wallet: string, tier: number): Promise<`0x${string}`> {
    const hash = keccak256(encodePacked(['address', 'uint256'], [wallet as `0x${string}`, BigInt(tier)]))
    return backendAccount.signMessage({ message: { raw: hash } })
  }

  // 0. Daftarkan user di DB (merit awal 0) — username unik per alamat
  for (let i = 0; i < USER_KEYS.length; i++) {
    const acc = privateKeyToAccount(USER_KEYS[i] as `0x${string}`)
    const wallet = acc.address.toLowerCase()
    const existing = await prisma.user.findUnique({ where: { walletAddress: wallet } })
    if (existing) {
      await prisma.user.update({
        where: { walletAddress: wallet },
        data: { meritScore: 0, tier: 0 },
      })
      continue
    }
    await prisma.user.create({
      data: {
        walletAddress: wallet,
        username: `${USER_NAMES[i]}_${acc.address.slice(-4).toLowerCase()}`,
        meritScore: 0,
        tier: 0,
      },
    })
  }

  // 1. Mint + approve + join Basic Pool (pool 0) — idempotent: langkah yang sudah selesai dilewati
  const owner = walletFor(OWNER_KEY)
  for (let i = 0; i < USER_KEYS.length; i++) {
    const user = walletFor(USER_KEYS[i])

    const alreadyJoined = await publicClient.readContract({
      address: meritPool,
      abi: MERITPOOL_ABI,
      functionName: 'hasContributed',
      args: [BigInt(0), BigInt(1), user.account.address],
    } as never)

    if (alreadyJoined) {
      console.log(`skip join (sudah): ${user.account.address}`)
      continue
    }

    const balance = (await publicClient.readContract({
      address: mcToken,
      abi: MCIRCLE_ABI,
      functionName: 'balanceOf',
      args: [user.account.address],
    } as never)) as bigint
    if (balance < parseEther('200')) {
      await owner.client.writeContract({
        address: mcToken,
        abi: MCIRCLE_ABI.concat([{
          type: 'function',
          name: 'mint',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [],
          stateMutability: 'nonpayable',
        }] as never),
        functionName: 'mint',
        args: [user.account.address, parseEther('1000')],
      } as never)
    }

    const allowance = (await publicClient.readContract({
      address: mcToken,
      abi: MCIRCLE_ABI,
      functionName: 'allowance',
      args: [user.account.address, meritPool],
    } as never)) as bigint
    if (allowance < parseEther('200')) {
      await user.client.writeContract({
        address: mcToken,
        abi: MCIRCLE_ABI,
        functionName: 'approve',
        args: [meritPool, parseEther('500')],
      } as never)
    }

    const signature = await signJoin(user.account.address, 0)
    await user.client.writeContract({
      address: meritPool,
      abi: MERITPOOL_ABI,
      functionName: 'joinPool',
      args: [BigInt(0), BigInt(0), signature],
    } as never)
    console.log(`joined: ${user.account.address}`)
  }

  console.log('indexer:', await runIndexerOnce())

  // 2. Cycle 1 -> keeper settle (Merit Queue)
  console.log('keeper c1:', await runKeeperOnce())
  console.log('indexer:', await runIndexerOnce())

  // 3. Cycle 2 & 3: semua kontribusi lalu settle (skip yang sudah bayar)
  for (let cycle = 2; cycle <= 3; cycle++) {
    const state = await publicClient.readContract({
      address: meritPool,
      abi: MERITPOOL_ABI,
      functionName: 'getPoolState',
      args: [BigInt(0)],
    } as never)
    const activeCycle = Number((state as readonly unknown[])[2])
    if (activeCycle !== cycle) {
      console.log(`cycle ${cycle} sudah lewat (aktif: ${activeCycle})`)
      continue
    }
    for (let i = 0; i < USER_KEYS.length; i++) {
      const user = walletFor(USER_KEYS[i])
      const paid = await publicClient.readContract({
        address: meritPool,
        abi: MERITPOOL_ABI,
        functionName: 'hasContributed',
        args: [BigInt(0), BigInt(cycle), user.account.address],
      } as never)
      if (paid) continue
      await user.client.writeContract({
        address: meritPool,
        abi: MERITPOOL_ABI,
        functionName: 'contribute',
        args: [BigInt(0)],
      } as never)
    }
    console.log(`keeper c${cycle}:`, await runKeeperOnce())
    console.log('indexer:', await runIndexerOnce())
  }

  // 4. Verifikasi hasil di database
  const [contribs, payouts, obligs, notifs, repEvents] = await Promise.all([
    prisma.contribution.count({ where: { poolIdOnChain: 0, round: 0 } }),
    prisma.payout.findMany({ where: { poolIdOnChain: 0, round: 0 } }),
    prisma.obligation.findMany({ where: { poolIdOnChain: 0, round: 0 } }),
    prisma.notification.count(),
    prisma.reputationEvent.count(),
  ])

  console.log('\n=== HASIL ===')
  console.log('contributions:', contribs, '(harus 9)')
  console.log('payouts:', payouts.map((p) => ({ cycle: p.cycle, user: p.userWallet.slice(0, 8), amount: p.payoutAmount })))
  console.log('obligations:', obligs.map((o) => ({ user: o.userWallet.slice(0, 8), status: o.status, contributed: o.contributedCycles, missed: o.missedCycles })))
  console.log('notifications total:', notifs, '| reputation events:', repEvents)

  for (let i = 0; i < USER_KEYS.length; i++) {
    const acc = privateKeyToAccount(USER_KEYS[i] as `0x${string}`)
    const u = await prisma.user.findUnique({ where: { walletAddress: acc.address.toLowerCase() } })
    console.log(`${USER_NAMES[i]}: merit=${u?.meritScore} tier=${u?.tier}`)
  }

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
