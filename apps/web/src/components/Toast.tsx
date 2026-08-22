'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './Icon'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  type: ToastType
  title: string
  description?: string
  txHash?: string
}

type ToastContextValue = {
  toast: (type: ToastType, title: string, description?: string, txHash?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const TOAST_STYLES: Record<ToastType, { icon: string; accent: string; glow: string }> = {
  success: {
    icon: 'check_circle',
    accent: 'border-secondary-fixed/40',
    glow: 'shadow-[0_0_40px_-8px_rgba(0,236,145,0.4)]',
  },
  error: {
    icon: 'error',
    accent: 'border-error/40',
    glow: 'shadow-[0_0_40px_-8px_rgba(255,180,171,0.4)]',
  },
  info: {
    icon: 'info',
    accent: 'border-primary/40',
    glow: 'shadow-[0_0_40px_-8px_rgba(62,99,255,0.4)]',
  },
}

const TOAST_ICON_COLORS: Record<ToastType, string> = {
  success: 'text-secondary-fixed',
  error: 'text-error',
  info: 'text-primary',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, title: string, description?: string, txHash?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-3), { id, type, title, description, txHash }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }, [])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 w-[min(92vw,380px)] pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const style = TOAST_STYLES[t.type]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.95, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 60, scale: 0.9, filter: 'blur(4px)' }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className={`pointer-events-auto relative overflow-hidden rounded-xl border ${style.accent} ${style.glow} bg-surface-container-low/90 backdrop-blur-2xl px-4 py-3 flex items-start gap-3`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className={`mt-0.5 shrink-0 ${TOAST_ICON_COLORS[t.type]}`}>
                  <Icon name={style.icon} fill className="text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface leading-snug">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed break-words">{t.description}</p>
                  )}
                  {t.txHash && (
                    <a
                      href={`https://etherscan.io/tx/${t.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1.5 text-[11px] font-mono text-primary/90 hover:text-primary underline underline-offset-2"
                    >
                      {t.txHash.slice(0, 10)}…{t.txHash.slice(-6)}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 p-1 rounded-md text-outline hover:text-on-surface hover:bg-white/10 transition-colors"
                  aria-label="Tutup notifikasi"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}