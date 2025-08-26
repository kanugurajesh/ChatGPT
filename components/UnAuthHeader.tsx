"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { HelpCircle } from "lucide-react";

export function UnAuthHeader() {
  return (
    <div className="flex items-center justify-between py-3 px-6 bg-[#212121] w-full">
      {/* Logo - Left */}
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center mr-3">
          <div className="w-5 h-5 bg-white rounded-sm opacity-80"></div>
        </div>
      </div>

      {/* Auth buttons and Help - Right */}
      <div className="flex items-center gap-3">
        <SignInButton>
          <Button 
            variant="ghost"
            className="bg-transparent hover:bg-white/5 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors border-0"
          >
            Log in
          </Button>
        </SignInButton>
        
        <SignUpButton>
          <Button className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-medium transition-colors">
            Sign up for free
          </Button>
        </SignUpButton>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="w-8 h-8 rounded-full bg-transparent hover:bg-white/5 text-gray-400 hover:text-white"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}