import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, foundry } from 'wagmi/chains'

export const config = createConfig({
  chains: [foundry, sepolia], // foundry = Anvil localhost
  transports: {
    [foundry.id]: http(),
    [sepolia.id]: http(),
  },
})