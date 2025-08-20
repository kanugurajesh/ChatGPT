"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Palette } from "lucide-react"
import { motion } from "framer-motion"

export function ImageGallery() {
  const images = [
    {
      id: 1,
      src: "/kanugu-rajesh-logo.png",
      alt: "Kanugu Rajesh Logo",
      category: "Design",
    },
    {
      id: 2,
      src: "/network-diagram-flowchart.png",
      alt: "Network Diagram",
      category: "Technical",
    },
    {
      id: 3,
      src: "/certificate-template.png",
      alt: "Certificate",
      category: "Document",
    },
    {
      id: 4,
      src: "/anime-cooking.png",
      alt: "Anime Character",
      category: "Art",
    },
    {
      id: 5,
      src: "/fantasy-warrior.png",
      alt: "Fantasy Character",
      category: "Art",
    },
    {
      id: 6,
      src: "/person-portrait.png",
      alt: "Portrait",
      category: "Photo",
    },
    {
      id: 7,
      src: "/family-illustration.png",
      alt: "Family Illustration",
      category: "Art",
    },
    {
      id: 8,
      src: "/system-architecture-diagram.png",
      alt: "System Architecture",
      category: "Technical",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="p-6 border-b border-border"
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Library</h1>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="font-medium">Maker Scale</span>
          </div>
        </div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex gap-2 mb-4"
        >
          <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
            Ideation
          </Button>
          <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105 bg-transparent">
            Service Aggregation
          </Button>
          <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105 bg-transparent">
            Service Architecture
          </Button>
        </motion.div>
      </motion.div>

      {/* Image Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8"
        >
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.4 + index * 0.1,
                duration: 0.5,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.95 }}
              className="aspect-square bg-muted rounded-lg overflow-hidden hover:ring-2 hover:ring-ring cursor-pointer transition-all duration-200"
            >
              <img src={image.src || "/placeholder.svg"} alt={image.alt} className="w-full h-full object-cover" />
            </motion.div>
          ))}
        </motion.div>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-3 bg-muted rounded-3xl p-4 border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground transition-all duration-200 hover:scale-110"
            >
              <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                <span className="text-xs">+</span>
              </div>
            </Button>

            <Input
              placeholder="Describe an image"
              className="flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground transition-all duration-200 hover:scale-110"
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground transition-all duration-200 hover:scale-110"
              >
                <Palette className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
