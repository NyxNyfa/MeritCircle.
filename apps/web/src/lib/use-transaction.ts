'use client'

import { useState, useCallback } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/Toast'

export type TxStage =
  | 'idle'
  | 'checking'
  | 'approving'
  | 'waiting_approve'
  | 'signing'
  | 'joining'
  | 'waiting_join'
  | 'contributing'
  | 'waiting_contribute'
  | 'bidding'
  | 'waiting_bid'
  | 'swapping'
  | 'waiting_swap'

export function parseTxError(error: unknown): string {
  if (!error) return 'Terjadi kesalahan tidak diketahui.'
  const errStr = typeof error === 'string' ? error : (error as any)?.shortMessage || (error as any)?.message || ''
  
  if (
    errStr.includes('User rejected') ||
    errStr.includes('User denied') ||
    errStr.includes('rejected the request') ||
    errStr.includes('ACTION_REJECTED')
  ) {
    return 'Transaksi dibatalkan di dompet.'
  }

  if (errStr.includes('insufficient funds') || errStr.includes('exceeds balance')) {
    return 'Saldo ETH / token tidak mencukupi untuk gas atau transaksi.'
  }

  if (errStr.includes('0xfb8f41b2') || errStr.includes('ERC20InsufficientAllowance')) {
    return 'Izin token (allowance) belum disetujui atau tidak mencukupi.'
  }

  if (errStr.includes('revert') || errStr.includes('reverted')) {
    return (error as any)?.shortMessage || 'Transaksi ditolak oleh Smart Contract on-chain.'
  }

  return (error as any)?.shortMessage || errStr || 'Terjadi kesalahan pada transaksi.'
}

export function useTransaction() {
  const [stage, setStage] = useState<TxStage>('idle')
  const [stageLabel, setStageLabel] = useState<string>('')
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { address } = useAccount()

  const isBusy = stage !== 'idle'

  const waitForReceipt = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) throw new Error('Public client tidak tersedia.')
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 20_000,
      })
      if (receipt.status === 'reverted') {
        throw new Error('Transaksi gagal (reverted) di blockchain.')
      }
      return receipt
    },
    [publicClient]
  )

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries()
  }, [queryClient])

  return {
    stage,
    setStage,
    stageLabel,
    setStageLabel,
    activeId,
    setActiveId,
    isBusy,
    waitForReceipt,
    invalidateAll,
    publicClient,
    address,
    toast,
  }
}
