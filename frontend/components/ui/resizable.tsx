'use client'

import * as React from 'react'
import { GripVerticalIcon } from 'lucide-react'
import * as ResizablePrimitive from 'react-resizable-panels'

import { cn } from '@/lib/utils'

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full w-full data-[panel-group-direction=vertical]:flex-col',
        className,
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-[6px] items-center justify-center bg-transparent transition-colors hover:bg-white/10 active:bg-white/10 group data-[panel-group-direction=vertical]:h-[6px] data-[panel-group-direction=vertical]:w-full cursor-col-resize data-[panel-group-direction=vertical]:cursor-row-resize',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-center h-full w-full">
        {withHandle && (
          <div className="flex flex-col gap-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity data-[panel-group-direction=vertical]:flex-row">
            <div className="w-[3px] h-[3px] rounded-full bg-zinc-500"></div>
            <div className="w-[3px] h-[3px] rounded-full bg-zinc-500"></div>
            <div className="w-[3px] h-[3px] rounded-full bg-zinc-500"></div>
          </div>
        )}
      </div>
    </ResizablePrimitive.PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
