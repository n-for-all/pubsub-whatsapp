import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-disabled transition-all duration-200 ease-out',
          'focus:border-border-interactive focus:ring-2 focus:ring-primary-500 focus:ring-opacity-40 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-500 focus:ring-opacity-40',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }