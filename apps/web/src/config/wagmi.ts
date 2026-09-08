import { http, createConfig } from 'wagmi'
import { bscTestnet, foundry } from 'wagmi/chains'

// Chain utama lokal = Anvil Foundry (31337); BNB Smart Chain Testnet (97) untuk testnet.
export const SUPPORTED_CHAINS = [foundry, bscTestnet] as const

export const config = createConfig({
  chains: SUPPORTED_CHAINS,
  transports: {
    [bscTestnet.id]: http('https://bsc-testnet-dataseed.bnbchain.org'),
    [foundry.id]: http('http://127.0.0.1:8545'),
  },
})
