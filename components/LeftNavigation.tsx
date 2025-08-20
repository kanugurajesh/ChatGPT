"use client"

import { Button } from "@/components/ui/button"
import { Edit, Search, Sparkles } from "lucide-react"
import { SidebarToggle } from "./SidebarToggle"

interface LeftNavigationProps {
  onSidebarToggle: () => void
}

export function LeftNavigation({ onSidebarToggle }: LeftNavigationProps) {
  return (
    <div className="w-12 bg-[#0c0c0c] flex flex-col items-center py-3 justify-between">
      <div>
        {/* ChatGPT Logo/Sidebar Toggle */}
        <div className="w-6 h-6 mb-4 flex items-center justify-center">
          <SidebarToggle onClick={onSidebarToggle} />
        </div>

        {/* Navigation Icons */}
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white hover:bg-[#2f2f2f]">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white hover:bg-[#2f2f2f]">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-white hover:bg-[#2f2f2f]">
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bottom User Avatar */}
      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-medium">R</span>
      </div>
    </div>
  )
}