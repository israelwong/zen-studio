"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-50 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-zinc-400',
          actionButton: 'group-[.toast]:bg-zinc-50 group-[.toast]:text-zinc-900',
          cancelButton: 'group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-50',
          success: 'group-[.toaster]:bg-emerald-950 group-[.toaster]:text-emerald-50 group-[.toaster]:border-emerald-900',
          error: 'group-[.toaster]:bg-red-950 group-[.toaster]:text-red-50 group-[.toaster]:border-red-900',
          warning: 'group-[.toaster]:bg-amber-950 group-[.toaster]:text-amber-50 group-[.toaster]:border-amber-900',
          info: 'group-[.toaster]:bg-blue-950 group-[.toaster]:text-blue-50 group-[.toaster]:border-blue-900',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
