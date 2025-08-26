"use client"

import { useState, useEffect } from "react"

export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  })

  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [is768px, setIs768px] = useState(false)
  const [isCompactDesktop, setIsCompactDesktop] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      const height = window.innerHeight

      setWindowSize({
        width,
        height,
      })

      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIs768px(width >= 768 && width <= 768)
      setIsCompactDesktop(width >= 768 && width < 1100)
      setIsDesktop(width >= 1100)
    }

    // Set initial size
    handleResize()

    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return {
    windowSize,
    isMobile,
    isTablet,
    is768px,
    isCompactDesktop,
    isDesktop,
    isSmallScreen: isMobile || isTablet,
    useOverlayNav: isMobile || isCompactDesktop,
  }
}