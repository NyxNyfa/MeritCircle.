// Keeper — menutup cycle pool yang settleable secara otomatis (testnet).
// SettleCycle permissionless: tx dikirim oleh wallet KEEPER_PRIVATE_KEY (gas testnet).
import { createPublicClient, createWalletClient, http } from 'viem'
import { bscTestnet, foundry } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { getContractAddresses, MERITPOOL_ABI } from '@/config/contracts'
import { getServerChainId, readIsSettleable } from '@/lib/chain'
import { computeDesignation } from '@/lib/designation'

export type KeeperResult = {
  settled: number
  details: Array<{ poolId: number; txHash?: string; error?: string }>
}

function keeperWallet() {
  const key = process.env.KEEPER_PRIVATE_KEY
  if (!key) return null
  const chainId = getServerChainId()
  const chain = chainId === 97 ? bscTestnet : foundry
  const transport = http(
    process.env.RPC_URL ?? (chainId === 97 ? 'https://bsc-testnet-dataseed.bnbchain.org' : 'http://127.0.0.1:8545'),
  )
  const account = privateKeyToAccount((key.startsWith('0x') ? key : `0x${key}`) as `0x${string}`)
  return {
    account,
    client: createWalletClient({ account, chain, transport }),
    public: createPublicClient({ chain, transport }),
  }
}

export async function runKeeperOnce(): Promise<KeeperResult> {
  const result: KeeperResult = { settled: 0, details: [] }

  // Keeper opsional: kalau tidak ada key, cukup laporkan kandidat yang layak disettle.
  const wallet = keeperWallet()
  const meritPool = getContractAddresses(getServerChainId()).meritPool

  for (let poolId = 0; poolId <= 5; poolId++) {
    try {
      if (!(await readIsSettleable(poolId))) continue

      let fallbackWinner: `0x${string}` = '0x0000000000000000000000000000000000000000'
      let fallbackSignature: `0x${string}` = '0x'
      try {
        const designation = await computeDesignation(poolId)
        fallbackWinner = designation.winner as `0x${string}`
        fallbackSignature = designation.signature
      } catch {
        // Tanpa designation (mis. tidak ada anggota memenuhi syarat) → coba settle tanpa
        // fallback; kontrak akan menolak jika pemenang memang belum bisa ditentukan.
      }

      if (!wallet) {
        result.details.push({ poolId, error: 'settleable tapi KEEPER_PRIVATE_KEY tidak diset' })
        continue
      }

      const hash = await wallet.client.writeContract({
        address: meritPool,
        abi: MERITPOOL_ABI,
        functionName: 'settleCycle',
        args: [BigInt(poolId), fallbackWinner, fallbackSignature],
        account: wallet.account,
        chain: undefined,
      } as never)

      await wallet.public.waitForTransactionReceipt({ hash })
      result.settled++
      result.details.push({ poolId, txHash: hash })
    } catch (error) {
      const e = error as { shortMessage?: string; message?: string }
      result.details.push({
        poolId,
        error: e.shortMessage || e.message || 'unknown keeper error',
      })
    }
  }

  return result
}
