import * as React from 'react'
import { cn } from '../../lib/utils'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'icon' | 'sm'
}

export function Button({ className, variant = 'default', size = 'default', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' &&
          'bg-[#3E63FF] text-white shadow-[0px_0px_15px_rgba(62,99,255,0.4)] hover:bg-[#5B7CFF] hover:shadow-[0px_0px_25px_rgba(62,99,255,0.6)]',
        variant === 'ghost' && 'text-[#C3C6D3] hover:bg-[#3E63FF]/20 hover:text-[#3E63FF]',
        variant === 'outline' && 'border border-[#3e63ff]/30 text-[#E2E2E9] hover:bg-[#3E63FF]/10 hover:border-[#3e63ff]/60',
        size === 'default' && 'h-10 px-4 py-2',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'icon' && 'h-9 w-9',
        className,
      )}
      {...props}
    />
  )
}
