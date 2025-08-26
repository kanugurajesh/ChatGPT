"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"
import Image from "next/image"

interface SidebarToggleProps {
  onClick: () => void
}

export function SidebarToggle({ onClick }: SidebarToggleProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-8 h-8 text-white hover:bg-[#2f2f2f] transition-colors p-0"
      >
        {isHovered ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <Image
            src="/chatgpt.png"
            alt="ChatGPT"
            width={24}
            height={24}
            className="rounded-sm mt-3.5"
          />
        )}
      </Button>
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-[#1a1a1a] text-white text-sm px-2 py-1 rounded whitespace-nowrap z-10 border border-[#2f2f2f]">
          Open sidebar
        </div>
      )}
    </div>
  )
}