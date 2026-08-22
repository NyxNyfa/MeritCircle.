import { http, createConfig } from 'wagmi'
import { bscTestnet, foundry } from 'wagmi/chains'

// Chain utama = BNB Smart Chain Testnet (97); Anvil (31337) untuk development lokal.
export const SUPPORTED_CHAINS = [bscTestnet, foundry] as const

export const config = createConfig({
  chains: SUPPORTED_CHAINS,
  transports: {
    [bscTestnet.id]: http('https://bsc-testnet-dataseed.bnbchain.org'),
    [foundry.id]: http('http://127.0.0.1:8545'),
  },
})
