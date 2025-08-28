"use client";

import { Button } from "@/components/ui/button";

interface ImageViewProps {
  currentImage: string | null;
  onCloseImageView: () => void;
}

export function ImageView({ currentImage, onCloseImageView }: ImageViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <Button
        onClick={onCloseImageView}
        className="absolute top-4 right-4 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
        size="icon"
      >
        ✕
      </Button>
      {currentImage && (
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={currentImage}
            alt="Generated image preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}