'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'

type CollapsibleContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null)

type CollapsibleProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function Collapsible({ open: controlled, onOpenChange, defaultOpen, children, className }: CollapsibleProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false)
  const open = controlled ?? uncontrolled
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div className={cn(className)}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

type CollapsibleTriggerProps = {
  asChild?: boolean
  className?: string
  children: React.ReactNode
}

export function CollapsibleTrigger({ asChild, className, children }: CollapsibleTriggerProps) {
  const ctx = React.useContext(CollapsibleContext)
  if (!ctx) throw new Error('CollapsibleTrigger must be used within <Collapsible>')

  if (asChild) {
    type ChildWithClick = React.ReactElement<{ onClick?: React.MouseEventHandler; 'aria-expanded'?: boolean }>
    const child = React.Children.only(children) as ChildWithClick
    return React.cloneElement(child, {
      'aria-expanded': ctx.open,
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        ctx.setOpen(!ctx.open)
      },
    })
  }

  return (
    <button
      type="button"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn('inline-flex items-center', className)}
    >
      {children}
    </button>
  )
}

type CollapsibleContentProps = {
  className?: string
  children: React.ReactNode
}

export function CollapsibleContent({ className, children }: CollapsibleContentProps) {
  const ctx = React.useContext(CollapsibleContext)
  if (!ctx) throw new Error('CollapsibleContent must be used within <Collapsible>')

  return (
    <div
      className={cn(
        'grid transition-all duration-300 ease-in-out',
        ctx.open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className,
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}
