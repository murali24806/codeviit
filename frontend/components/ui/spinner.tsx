import { Loader2Icon, LucideProps } from 'lucide-react'

import { cn } from '@/lib/utils'

interface SpinnerProps extends Omit<LucideProps, 'size'> {
  size?: 'sm' | 'md' | 'lg' | number | string
}

function Spinner({ className, size, ...props }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-8' : 'size-4'
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('animate-spin', sizeClass, className)}
      {...props}
    />
  )
}

export { Spinner }
