'use client'

import { createContext, useContext } from 'react'

export const RegisterModalContext = createContext<{ openRegister: () => void }>({
  openRegister: () => {},
})

export const useRegisterModal = () => useContext(RegisterModalContext)
