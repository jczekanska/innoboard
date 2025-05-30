import React, { useState } from "react"
import { CanvasObject } from "@/types/canvas"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import { Image, MapPinned, Music } from "lucide-react"

interface Props {
    obj: CanvasObject
    updateOverlayPosition: (id: string, x: number, y: number) => void
}

export const OverlayObject: React.FC<Props> = ({ obj, updateOverlayPosition }) => {
    const { state } = useCanvasSettings()
    const { zoom, mode } = state

    const [isDragging, setIsDragging] = useState(false)

    const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        const elt = e.currentTarget
        const pid = e.pointerId
        elt.setPointerCapture(pid)
        setIsDragging(true)

        const startX = e.clientX, startY = e.clientY
        const baseX = obj.x, baseY = obj.y

        const onMove = (ev: PointerEvent) => {
            const dx = (ev.clientX - startX) * (100 / zoom)
            const dy = (ev.clientY - startY) * (100 / zoom)
            updateOverlayPosition(obj.id, baseX + dx, baseY + dy)
        }

        const onUp = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            elt.releasePointerCapture(pid)
            setIsDragging(false)
        }

        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
    }

    const cursor = mode === "select"
        ? isDragging
            ? "grabbing"
            : "grab"
        : "default"

    return (
        <div
            className="absolute"
            style={{
                left: obj.x * (zoom / 100) - (obj.width / 2),
                top: obj.y * (zoom / 100) - (obj.height / 2),
                cursor,
            }}
            draggable={false}
            onPointerDown={mode === "select" ? startDrag : undefined}
        >
            {/* remove width and height classes later */}
            {obj.type === "image" &&
                <div className="bg-red-400 flex justify-center items-center rounded-2xl" style={{ width: obj.width, height: obj.height }}>
                    <Image className="text-white" />
                </div>}
            {obj.type === "audio" &&
                <div className="bg-blue-400 flex justify-center items-center rounded-2xl" style={{ width: obj.width, height: obj.height }}>
                    <Music className="text-white" />
                </div>
            }
            {obj.type === "location" &&
                <div className="bg-green-400 flex justify-center items-center rounded-2xl" style={{ width: obj.width, height: obj.height }}>
                    <MapPinned className="text-white" />
                </div>
            }
        </div>
    )
}

{/* <img src="/icons/audio.svg" className="w-6 h-6" alt="audio" /> */ }