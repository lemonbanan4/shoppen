"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import DeleteButton from "@modules/common/components/delete-button"
import { HttpTypes } from "@medusajs/types"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset)
      }
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-950/20 text-neutral-300 font-mono text-xs my-2">
          <p className="font-bold text-red-400 uppercase tracking-wider mb-1">
            Component Error // Render Failed
          </p>
          <p className="text-neutral-400 mb-2">{this.state.error.message}</p>
          <button
            onClick={this.reset}
            className="px-3 py-1 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-white rounded text-[11px] uppercase tracking-wider"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export function LineItemErrorFallback({
  item,
  onDelete,
}: {
  item?: HttpTypes.StoreCartLineItem
  onDelete?: (id: string) => void
}) {
  return (
    <tr className="w-full bg-neutral-950/40 border-b border-neutral-800 text-neutral-400 font-mono text-xs">
      <td className="p-4 w-24">
        <div className="w-16 h-16 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 text-[10px] tracking-widest">
          ERR
        </div>
      </td>
      <td className="text-left p-4" colSpan={2}>
        <div className="flex flex-col gap-y-1">
          <span className="font-bold text-neutral-200 uppercase tracking-wider">
            {item?.product_title || item?.title || "Item Data Unavailable"}
          </span>
          <span className="text-[11px] text-neutral-500">
            This variant cannot be displayed due to a sync issue. Remove it to continue checkout.
          </span>
        </div>
      </td>
      <td className="p-4 text-right" colSpan={2}>
        {item?.id && (
          <DeleteButton id={item.id} onDelete={onDelete}>
            Remove
          </DeleteButton>
        )}
      </td>
    </tr>
  )
}

export function ProductCardErrorFallback({
  title,
}: {
  title?: string
}) {
  return (
    <div className="w-full h-full min-h-[320px] rounded-lg border border-neutral-900 bg-neutral-950/50 p-4 flex flex-col justify-between font-mono select-none">
      <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
        <span>Telemetry Offline</span>
      </div>
      <div className="my-auto text-center py-8">
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
          {title || "Item Temporarily Offline"}
        </p>
        <p className="text-[10px] text-neutral-600 mt-1">
          Catalog stream re-indexing
        </p>
      </div>
      <div className="text-[9px] text-neutral-600 uppercase tracking-widest">
        AEON // ARCHIVE
      </div>
    </div>
  )
}

export default ErrorBoundary
