import { cn } from "@/lib/utils"

interface ImageSkeletonProps {
  className?: string;
}

function ImageSkeleton({ className }: ImageSkeletonProps) {
  return (
    <div className={cn("bg-gray-900 rounded-lg p-4 max-w-lg", className)}>
      <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: "1/1", minHeight: "256px" }}>
        {/* Pulsating circle at bottom right */}
        <div className="absolute bottom-4 right-4">
          <div className="w-8 h-8 bg-gray-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export { ImageSkeleton }