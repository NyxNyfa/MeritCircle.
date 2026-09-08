'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './Icon'
import { useToast } from './Toast'
import type { UserProfile } from './Sidebar'

export type EditProfileValues = {
  avatarUrl: string
  twitterHandle: string
  bio: string
}

type EditProfileModalProps = {
  open: boolean
  onClose: () => void
  profile: UserProfile | null | undefined
  onSubmit: (values: EditProfileValues) => Promise<void>
}

export default function EditProfileModal({ open, onClose, profile, onSubmit }: EditProfileModalProps) {
  const { toast } = useToast()
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? '')
  const [twitterHandle, setTwitterHandle] = useState(profile?.twitterHandle ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
      toast('error', 'Format tidak valid', 'Hanya menerima format .png')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSubmit({
        avatarUrl: avatarUrl.trim(),
        twitterHandle: twitterHandle.trim(),
        bio: bio.trim(),
      })
      onClose()
    } catch (error) {
      const err = error as { shortMessage?: string; message?: string }
      toast('error', 'Gagal menyimpan profil', err.shortMessage || err.message || 'Terjadi kesalahan')
    } finally {
      setIsSaving(false)
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
            className="relative w-full max-w-lg bg-[#1d2027]/90 backdrop-blur-2xl rounded-xl border border-[#3e63ff]/30 p-8 shadow-2xl shadow-[0_0_40px_rgba(62,99,255,0.15)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
            <div className="absolute -top-20 -right-10 w-72 h-72 bg-[#3E63FF]/20 rounded-full blur-[120px] opacity-20 pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-[#C3C6D3] hover:text-[#E2E2E9] transition-colors z-10"
              aria-label="Close modal"
            >
              <Icon name="close" className="text-2xl" />
            </button>

            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#10131A] border border-[#3e63ff]/30 mb-5 shadow-[0_0_25px_rgba(62,99,255,0.15)]">
                  <Icon name="edit" className="text-3xl text-[#3E63FF]" />
                </div>
                <h2 className="text-2xl font-bold text-[#E2E2E9] tracking-tighter mb-2">Edit Profile</h2>
                <p className="text-sm text-[#C3C6D3] max-w-sm mx-auto">
                  Update avatar, X handle, dan bio Anda.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Avatar File Upload (.png strictly) */}
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3] block ml-1" htmlFor="avatarFileInput">
                    Upload Avatar <span className="lowercase normal-case opacity-60">(PNG Only)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border border-[#3E63FF]/50 bg-[#10131A] ring-2 ring-[#3E63FF]/30">
                        <img src={avatarUrl} alt="Avatar preview" className="object-cover w-full h-full" />
                      </div>
                    ) : null}
                    <div className="flex-1">
                      <input
                        id="avatarFileInput"
                        type="file"
                        accept="image/png, .png"
                        onChange={handleFileChange}
                        className="w-full text-xs text-[#E2E2E9] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#3E63FF]/20 file:text-[#A9C7FF] hover:file:bg-[#3E63FF]/30 file:cursor-pointer cursor-pointer bg-[#10131A]/70 border border-[#3e63ff]/20 rounded-lg p-1.5 focus:outline-none focus:border-[#3E63FF] transition-all"
                      />
                      <p className="text-[11px] text-[#C3C6D3]/70 mt-1 ml-1">
                        Hanya menerima format .png
                      </p>
                    </div>
                  </div>
                </div>


                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3] block ml-1" htmlFor="twitterHandle">
                    X / Twitter <span className="lowercase normal-case opacity-60">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#C3C6D3]">@</span>
                    <input
                      id="twitterHandle"
                      type="text"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value)}
                      placeholder="your_x_handle"
                      className="w-full bg-[#10131A]/70 border border-[#3e63ff]/20 rounded-lg py-3 pl-10 pr-4 text-[#E2E2E9] placeholder:text-[#C3C6D3]/40 focus:outline-none focus:border-[#3E63FF] transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-[#C3C6D3] block ml-1" htmlFor="bio">
                    Bio <span className="lowercase normal-case opacity-60">(Optional)</span>
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    maxLength={280}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Ceritakan tentang Anda…"
                    className="w-full resize-none bg-[#10131A]/70 border border-[#3e63ff]/20 rounded-lg py-3 px-4 text-[#E2E2E9] placeholder:text-[#C3C6D3]/40 focus:outline-none focus:border-[#3E63FF] transition-all duration-300"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`w-full relative group bg-[#3E63FF] text-white font-semibold py-4 rounded-full hover:bg-[#5B7CFF] transition-all duration-300 overflow-hidden ${
                      isSaving ? 'loading-state cursor-wait' : ''
                    } shadow-[0px_0px_15px_rgba(62,99,255,0.4)] hover:shadow-[0_0_25px_rgba(62,99,255,0.6)]`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 btn-content">
                      Save Changes
                      <Icon name="check" className="text-lg" />
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 btn-spinner bg-[#3E63FF] transition-opacity duration-300">
                      <Icon name="progress_activity" className="text-2xl animate-spin" />
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}