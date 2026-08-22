'use client'

import { useAccount, useBalance, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { MC_TOKEN_ADDRESS as MCIRCLE_ADDRESS, MCIRCLE_ABI } from '@/config/contracts'
import SwapWidget from '@/components/SwapWidget'

export default function SwapPage() {
  const { address } = useAccount()

  const {
    data: balanceData,
    isPending: isBalancePending,
    refetch: refetchBalance,
  } = useReadContract({
    address: MCIRCLE_ADDRESS,
    abi: MCIRCLE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const mcBalance = balanceData ? formatUnits(balanceData as bigint, 18) : '0'

  const { data: ethBalanceData, refetch: refetchEth } = useBalance({ address })
  const ethBalance = ethBalanceData
    ? formatUnits(ethBalanceData.value, ethBalanceData.decimals)
    : '0'

  return (
    <div className="flex justify-center py-4 md:py-10">
      <SwapWidget
        address={address}
        mcBalance={mcBalance}
        ethBalance={ethBalance}
        isBalancePending={isBalancePending}
        onSwapSuccess={() => {
          refetchBalance()
          refetchEth()
        }}
      />
    </div>
  )
}