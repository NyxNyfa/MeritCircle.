'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '../config/wagmi'
import { useState } from 'react'
import { ToastProvider } from './Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  // Membuat instance query client baru setiap kali komponen di-mount
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}