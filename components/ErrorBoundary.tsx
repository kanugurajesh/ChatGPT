"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback
      if (Fallback) {
        return <Fallback error={this.state.error} retry={this.retry} />
      }

      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
          <h3 className="text-sm font-medium text-white mb-1">Something went wrong</h3>
          <p className="text-xs text-gray-400 mb-3">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={this.retry}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-[#2f2f2f]"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}