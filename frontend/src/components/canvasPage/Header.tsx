// src/components/canvasPage/Header.tsx
import React from "react"
import { ArrowLeft, Share2, Edit2 } from "lucide-react"
import { DialogTrigger } from "@/components/ui/dialog"

export type HeaderProps = {
  onBack: () => void
  name: string
  onRename: (newName: string) => void
  onShare: () => void
}

const Header: React.FC<HeaderProps> = ({ onBack, name, onRename, onShare }) => {
  return (
    <header className="flex absolute items-center w-screen h-13 bg-white px-3 border-b-1 z-20">
      <div className="flex items-center w-full gap-4">
        <ArrowLeft
          className="hover:-translate-x-1 duration-150 cursor-pointer"
          onClick={onBack}
        />

        {/* Canvas Name (click to edit) */}
        <h1
          className="text-lg font-semibold truncate cursor-pointer flex items-center gap-1"
          title="Click to rename"
          onClick={async () => {
            const newName = prompt("Enter canvas name:", name) ?? name
            if (newName && newName !== name) {
              onRename(newName)
            }
          }}
        >
          {name || "(untitled)"}
          <Edit2 className="w-4 opacity-50 hover:opacity-100" />
        </h1>
      </div>

      <div className="flex items-center w-full justify-end">
        <DialogTrigger asChild>
          <button
            className="flex items-center border py-1 px-3 gap-1.5 rounded-xl bg-white hover:scale-105 duration-150"
            onClick={onShare}
            >
            <Share2 className="w-4" />
            <span>Share</span>
          </button>
        </DialogTrigger>
      </div>
    </header>
  )
}

export default Header
