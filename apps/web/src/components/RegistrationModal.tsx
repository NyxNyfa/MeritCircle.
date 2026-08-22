'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './Icon'
import { useToast } from './Toast'

export type RegisterValues = {
  username: string
  email: string
  socialMedia: string
}

type RegistrationModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (values: RegisterValues) => Promise<void>
  walletAddress?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegistrationModal({ open, onClose, onSubmit, walletAddress }: RegistrationModalProps) {
  const { toast } = useToast()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [social, setSocial] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      toast('error', 'Username wajib diisi', 'Beri nama yang membedakan reputasi Anda.')
      return
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      toast('error', 'Format email tidak valid', 'Contoh: nama@email.com')
      return
    }
    setIsRegistering(true)
    try {
      await onSubmit({
        username: trimmedUsername,
        email: email.trim(),
        socialMedia: social.trim(),
      })
      setUsername('')
      setEmail('')
      setSocial('')
      onClose()
    } catch (error) {
      const e = error as { shortMessage?: string; message?: string }
      toast('error', 'Gagal mendaftar', e.shortMessage || e.message || 'Terjadi kesalahan')
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 12, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-surface-container-low/80 backdrop-blur-2xl rounded-xl border border-[#3e63ff]/30 p-8 md:p-10 shadow-2xl shadow-[0_0_40px_rgba(62,99,255,0.15)] overflow-hidden"
          >
            {/* Ambient blobs + dot grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
            <div className="absolute -top-20 -right-10 w-72 h-72 bg-primary-container rounded-full blur-[120px] opacity-20 pointer-events-none" />
            <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-secondary-container rounded-full blur-[120px] opacity-10 pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors z-10"
              aria-label="Close modal"
            >
              <Icon name="close" className="text-2xl" />
            </button>

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-highest border border-[#3e63ff]/30 mb-5 shadow-[0_0_25px_rgba(62,99,255,0.15)]">
                  <Icon name="fingerprint" className="text-3xl text-primary" />
                </div>
                <h2 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary-fixed mb-2 tracking-tighter">
                  Create Your On-Chain Identity
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto">
                  Establish your presence in the ecosystem. Claim your unique handle to get started.
                </p>
              </div>

              {/* Form */}
              <form className="space-y-5 max-w-md mx-auto" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="font-mono-label text-mono-label text-on-surface uppercase block ml-1" htmlFor="username">
                    Username <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">@</span>
                    <input
                      id="username"
                      type="text"
                      required
                      maxLength={24}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your_handle"
                      className="w-full bg-surface-container/50 border border-outline-variant/50 rounded-lg py-3 pl-10 pr-4 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-0 input-glow transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono-label text-mono-label text-on-surface uppercase block ml-1" htmlFor="email">
                    Email <span className="text-on-surface-variant lowercase normal-case">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                      <Icon name="mail" className="text-lg" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.xyz"
                      className="w-full bg-surface-container/50 border border-outline-variant/50 rounded-lg py-3 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-0 input-glow transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono-label text-mono-label text-on-surface uppercase block ml-1" htmlFor="social">
                    X / Twitter <span className="text-on-surface-variant lowercase normal-case">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                      <Icon name="link" className="text-lg" />
                    </span>
                    <input
                      id="social"
                      type="text"
                      value={social}
                      onChange={(e) => setSocial(e.target.value)}
                      placeholder="x_handle"
                      className="w-full bg-surface-container/50 border border-outline-variant/50 rounded-lg py-3 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-0 input-glow transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Action Button with loading swap */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className={`w-full relative group bg-primary text-on-primary font-headline-md text-headline-md py-4 rounded-full hover:bg-primary-fixed transition-all duration-300 overflow-hidden ${
                      isRegistering ? 'loading-state cursor-wait' : ''
                    } shadow-[0px_0px_15px_rgba(62,99,255,0.4)] hover:shadow-[0_0_25px_rgba(62,99,255,0.6)]`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 btn-content">
                      Complete Registration
                      <Icon name="arrow_forward" className="text-lg" />
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 btn-spinner bg-primary transition-opacity duration-300">
                      <Icon name="progress_activity" className="text-2xl animate-spin" />
                    </span>
                  </button>
                  <p className="font-mono-label text-mono-label text-on-surface-variant text-center mt-3 opacity-70">
                    {walletAddress
                      ? `0x${walletAddress.slice(2, 5)}…${walletAddress.slice(-4)} · By continuing, you agree to the protocol terms.`
                      : 'By continuing, you agree to the protocol terms.'}
                  </p>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}