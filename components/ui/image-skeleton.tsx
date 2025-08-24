import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ImageSkeletonProps {
  className?: string;
}

function ImageSkeleton({ className }: ImageSkeletonProps) {
  return (
    <div className={cn("bg-gray-800 rounded-lg p-4 max-w-lg", className)}>
      <div className="relative bg-gray-700 rounded-lg overflow-hidden" style={{ aspectRatio: "1/1", minHeight: "256px" }}>
        {/* Skeleton shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-pulse" />
        
        {/* Loading spinner in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-400 font-medium">Generating image...</span>
          </div>
        </div>
        
        {/* Animated shimmer overlay */}
        <div 
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{
            animation: 'shimmer 2s infinite'
          }}
        />
      </div>
    </div>
  )
}

export { ImageSkeleton }