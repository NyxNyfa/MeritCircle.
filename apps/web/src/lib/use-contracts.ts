'use client'

import { useChainId } from 'wagmi'
import { getContractAddresses, type ContractAddresses } from '@/config/contracts'

/** Alamat kontrak sesuai chain yang sedang aktif di wallet pengguna. */
export function useContractAddresses(): ContractAddresses {
  const chainId = useChainId()
  return getContractAddresses(chainId)
}
