"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"

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
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.078 6.078 0 0 0 6.529 2.9 5.973 5.973 0 0 0 4.258 1.786c1.638 0 3.185-.65 4.299-1.786a5.987 5.987 0 0 0 4.007-2.9 6.042 6.042 0 0 0-.75-7.094l.003-.003z"/>
          </svg>
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