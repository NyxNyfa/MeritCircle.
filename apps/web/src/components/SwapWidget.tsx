'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowLeftRight, Coins } from 'lucide-react'
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { parseEther, parseUnits } from 'viem'
import {
  MCIRCLE_ABI,
  TOKEN_SWAP_ABI,
} from '../config/contracts'
import { useContractAddresses } from '../lib/use-contracts'
import { cn } from '../lib/utils'
import { useToast } from './Toast'

type SwapWidgetProps = {
  address?: string
  mcBalance: string
  ethBalance: string
  isBalancePending: boolean
  onSwapSuccess?: () => void
}

type Direction = 'ethToMc' | 'mcToEth'
type Phase = 'idle' | 'signing' | 'confirming' | 'success' | 'error'

// 1 tBNB = 10.000 MC (rate on-chain di TokenSwap.sol)
const ETH_TO_MC_RATE = 10000

const reasonOf = (error: unknown) => {
  const e = error as { shortMessage?: string; message?: string }
  return e.shortMessage || e.message || 'Terjadi kesalahan'
}

const hasTooManyDecimals = (amount: string) => {
  const parts = amount.split('.')
  return parts.length === 2 && parts[1].length > 18
}

export default function SwapWidget({
  address,
  mcBalance,
  ethBalance,
  isBalancePending,
  onSwapSuccess,
}: SwapWidgetProps) {
  const { chainId } = useAccount()
  const { toast } = useToast()
  const { mcToken: MCIRCLE_ADDRESS, tokenSwap: TOKEN_SWAP_ADDRESS } = useContractAddresses()

  const [direction, setDirection] = useState<Direction>('ethToMc')
  const [amount, setAmount] = useState('')
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)
  const [pendingTx, setPendingTx] = useState<'approve' | 'swap' | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')

  const ethNum = parseFloat(amount) || 0
  const mcNum = parseFloat(amount) || 0
  const ethNumBalance = Number(ethBalance) || 0
  const mcNumBalance = Number(mcBalance) || 0

  const isEthToMc = direction === 'ethToMc'
  const output = isEthToMc ? ethNum * ETH_TO_MC_RATE : mcNum / ETH_TO_MC_RATE

  // Allowance MC -> swap contract (dibutuhkan untuk arah MC -> ETH)
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: MCIRCLE_ADDRESS,
    abi: MCIRCLE_ABI,
    functionName: 'allowance',
    args: address && TOKEN_SWAP_ADDRESS ? [address as `0x${string}`, TOKEN_SWAP_ADDRESS] : undefined,
    query: { enabled: !!address },
  })
  const allowanceNum = Number(allowanceData ?? BigInt(0)) / 1e18
  const needsApprove = !isEthToMc && mcNum > 0 && allowanceNum < mcNum

  const swapWrite = useWriteContract()
  const approveWrite = useWriteContract()

  const {
    data: receipt,
    isSuccess: isReceiptSuccess,
    isError: isReceiptError,
  } = useWaitForTransactionReceipt({
    hash: pendingHash ?? undefined,
  })

  // --- Sukses: konfirmasi on-chain diterima (isSuccess) ---
  useEffect(() => {
    if (!isReceiptSuccess || !receipt) return
    if (pendingTx === 'approve') {
      toast('success', 'Approve berhasil', 'Izin MC diberikan ke kontrak swap.', receipt.transactionHash)
      queueMicrotask(() => {
        setPendingHash(null)
        setPendingTx(null)
        setPhase('idle')
      })
      refetchAllowance()
    }
    if (pendingTx === 'swap') {
      const label =
        direction === 'ethToMc'
          ? `${amount} ETH → ${output.toLocaleString('en-US', { maximumFractionDigits: 0 })} MC`
          : `${amount} MC → ${output.toFixed(6)} ETH`
      toast('success', 'Swap berhasil', `${label} selesai di on-chain.`, receipt.transactionHash)
      queueMicrotask(() => {
        setPendingHash(null)
        setPendingTx(null)
        setPhase('idle')
      })
      onSwapSuccess?.()
      refetchAllowance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt, pendingHash])

  // --- Gagal di on-chain ---
  useEffect(() => {
    if (isReceiptError && pendingHash) {
      toast('error', 'Swap gagal', 'Transaksi gagal / dibatalkan di on-chain.')
      queueMicrotask(() => {
        setPendingHash(null)
        setPendingTx(null)
        setPhase('idle')
      })
    }
  }, [isReceiptError, pendingHash, toast])

  // --- Reset otomatis jika wallet pindah jaringan / ganti akun (anti stuck) ---
  useEffect(() => {
    if (phase !== 'idle') {
      queueMicrotask(() => {
        setPendingHash(null)
        setPendingTx(null)
        setPhase('idle')
      })
      toast('info', 'Transaksi dibatalkan', 'Jaringan atau akun berubah.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, address])

  const resetSwap = () => {
    setPendingHash(null)
    setPendingTx(null)
    setPhase('idle')
  }

  const handleApprove = async () => {
    if (!address) return
    if (!TOKEN_SWAP_ADDRESS) {
      toast('error', 'Swap tidak tersedia', 'Kontrak swap belum dideploy di jaringan ini.')
      return
    }
    try {
      setPhase('signing')
      const hash = await approveWrite.writeContractAsync({
        address: MCIRCLE_ADDRESS,
        abi: MCIRCLE_ABI,
        functionName: 'approve',
        args: [TOKEN_SWAP_ADDRESS, parseUnits(mcNum.toFixed(18), 18)],
      })
      setPendingHash(hash)
      setPendingTx('approve')
      setPhase('confirming')
    } catch (error) {
      setPhase('idle')
      toast('error', 'Approve dibatalkan', reasonOf(error))
    }
  }

  const handleSwap = async () => {
    if (!address) {
      toast('info', 'Wallet belum terhubung', 'Sambungkan wallet Anda untuk melakukan swap token.')
      return
    }
    if (!TOKEN_SWAP_ADDRESS) {
      toast('error', 'Swap tidak tersedia', 'Kontrak swap belum dideploy di jaringan ini.')
      return
    }
    if (amount === '' || parseFloat(amount) <= 0) {
      toast('error', 'Jumlah tidak valid', 'Masukkan jumlah token yang ingin ditukar.')
      return
    }
    if (hasTooManyDecimals(amount)) {
      toast('error', 'Jumlah tidak valid', 'Maksimal 18 desimal.')
      return
    }
    if (isEthToMc) {
      if (ethNum > ethNumBalance) {
        toast(
          'error',
          'Saldo ETH tidak cukup',
          `Saldo Anda ${ethNumBalance.toLocaleString('en-US')} ETH — biaya gas tidak termasuk.`,
        )
        return
      }
    } else {
      if (mcNum > mcNumBalance) {
        toast('error', 'Saldo MC tidak cukup', `Saldo Anda ${mcNumBalance.toLocaleString('en-US')} MC.`)
        return
      }
      if (needsApprove) {
        await handleApprove()
        return
      }
    }

    try {
      setPhase('signing')
      const hash = isEthToMc
        ? await swapWrite.writeContractAsync({
            address: TOKEN_SWAP_ADDRESS,
            abi: TOKEN_SWAP_ABI,
            functionName: 'swapBNBForMC',
            value: parseEther(amount),
          })
        : await swapWrite.writeContractAsync({
            address: TOKEN_SWAP_ADDRESS,
            abi: TOKEN_SWAP_ABI,
            functionName: 'swapMCForBNB',
            args: [parseUnits(amount, 18)],
          })
      setPendingHash(hash)
      setPendingTx('swap')
      setPhase('confirming')
    } catch (error) {
      setPhase('idle')
      toast('error', 'Swap dibatalkan', reasonOf(error))
    }
  }

  const isBusy = phase === 'signing' || phase === 'confirming'

  const handleMax = () => {
    if (!isEthToMc) setAmount(mcNumBalance > 0 ? mcNumBalance.toFixed(4) : '')
  }

  const buttonLabel = isBusy
    ? phase === 'signing'
      ? 'Menunggu tanda tangan…'
      : 'Menunggu konfirmasi…'
    : !address
      ? 'Connect Wallet to Swap'
      : parseFloat(amount) <= 0
        ? 'Enter an Amount'
        : isEthToMc
          ? `Swap ${amount} ETH → ${output.toLocaleString('en-US', { maximumFractionDigits: 0 })} MC`
          : needsApprove
            ? '1. Approve MC'
            : `Swap ${amount} MC → ${output.toFixed(6)} ETH`

  return (
    <section
      id="swap-widget"
      className="relative w-full max-w-md rounded-3xl bg-[#1d2027]/60 border border-[#3e63ff]/30 backdrop-blur-[12px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] p-6"
    >
      {/* Decorative corner dots */}
      <span className="absolute left-2.5 top-2.5 w-1 h-1 rounded-full bg-[#3E63FF]/50" />
      <span className="absolute right-2.5 top-2.5 w-1 h-1 rounded-full bg-[#3E63FF]/50" />
      <span className="absolute left-2.5 bottom-2.5 w-1 h-1 rounded-full bg-[#3E63FF]/50" />
      <span className="absolute right-2.5 bottom-2.5 w-1 h-1 rounded-full bg-[#3E63FF]/50" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-[#E2E2E9] tracking-tight">Swap Tokens</h3>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3e63ff]/30 bg-[#3E63FF]/10">
          <ArrowLeftRight className="h-4 w-4 text-[#3E63FF]" />
        </div>
      </div>

      {/* From — ETH atau MC tergantung arah */}
      <div className="rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/70 p-4 transition-colors focus-within:border-[#3e63ff]/50">
        <div className="flex items-center justify-between mb-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">You pay</label>
          {isEthToMc ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">
              Gas tidak termasuk
            </span>
          ) : (
            <button
              onClick={handleMax}
              className="font-mono text-[10px] uppercase tracking-wider text-[#3E63FF] hover:text-[#5B7CFF] transition-colors"
            >
              MAX
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.0"
            aria-label="Jumlah token"
            className="w-full bg-transparent font-mono text-2xl font-semibold text-[#E2E2E9] placeholder:text-[#C3C6D3]/40 focus:outline-none"
          />
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#3e63ff]/30 bg-[#3E63FF]/10 px-3 py-1.5 font-mono text-xs font-semibold text-[#3E63FF]">
            {isEthToMc ? (
              'ETH'
            ) : (
              <>
                <Coins className="h-3.5 w-3.5" />
                MC
              </>
            )}
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-[#C3C6D3]">
          Balance:{' '}
          {isEthToMc
            ? `${ethNumBalance.toLocaleString('en-US', { maximumFractionDigits: 4 })} ETH`
            : isBalancePending
              ? '…'
              : `${mcNumBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} MC`}
        </p>
        {needsApprove && (
          <p className="mt-1 font-mono text-[10px] text-[#5B7CFF]">
            Allowance: {allowanceNum.toLocaleString('en-US', { maximumFractionDigits: 2 })} MC — Approve dulu.
          </p>
        )}
      </div>

      {/* Toggle arah — di tengah */}
      <div className="relative flex justify-center my-2">
        <div className="absolute inset-x-4 top-1/2 h-px bg-[#3e63ff]/20" />
        <button
          onClick={() => {
            resetSwap()
            setDirection((d) => (d === 'ethToMc' ? 'mcToEth' : 'ethToMc'))
            setAmount('')
          }}
          aria-label="Balik arah swap"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#3e63ff]/30 bg-[#10131A] shadow-[0px_0px_15px_rgba(62,99,255,0.3)] hover:bg-[#3E63FF]/20 transition-colors"
        >
          <ArrowDown
            className={cn('h-4 w-4 text-[#3E63FF] transition-transform duration-300', !isEthToMc && 'rotate-180')}
          />
        </button>
      </div>

      {/* To — kebalikan arah */}
      <div className="rounded-2xl border border-[#3e63ff]/20 bg-[#10131A]/70 p-4">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3]">
          You receive
        </label>
        <div className="flex items-center gap-3">
          <p className="w-full truncate font-mono text-2xl font-semibold text-[#E2E2E9]">
            {amount && parseFloat(amount) > 0
              ? isEthToMc
                ? output.toLocaleString('en-US', { maximumFractionDigits: 0 })
                : output.toFixed(6)
              : '0.0'}
          </p>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#3e63ff]/30 bg-[#3E63FF]/10 px-3 py-1.5 font-mono text-xs font-semibold text-[#3E63FF]">
            {isEthToMc ? (
              <>
                <Coins className="h-3.5 w-3.5" />
                MC
              </>
            ) : (
              'ETH'
            )}
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-[#C3C6D3]">
          1 ETH ≈ {ETH_TO_MC_RATE.toLocaleString('en-US')} MC
          {!isEthToMc &&
            ` · ${(ETH_TO_MC_RATE / 1000).toLocaleString('en-US')} MC ≈ 0.1 ETH`}
        </p>
      </div>

      {/* Action */}
      <button
        onClick={handleSwap}
        disabled={!address || parseFloat(amount) <= 0 || isBusy}
        className={cn(
          'mt-5 w-full rounded-full py-3 text-sm font-semibold text-white transition-all duration-300',
          !address || parseFloat(amount) <= 0 || isBusy
            ? 'cursor-not-allowed bg-[#3E63FF]/30'
            : 'bg-[#3E63FF] shadow-[0px_0px_15px_rgba(62,99,255,0.4)] hover:bg-[#5B7CFF] hover:shadow-[0px_0px_25px_rgba(62,99,255,0.6)]',
        )}
      >
        {buttonLabel}
      </button>
      {pendingHash && (
        <p className="mt-2 text-center font-mono text-[10px] text-[#C3C6D3] break-all">
          {pendingHash.slice(0, 10)}…{pendingHash.slice(-6)}
        </p>
      )}
    </section>
  )
}