import React, { useEffect, useState } from "react"
import { CanvasObject } from "@/types/canvas"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import { Image, MapPinned, Music } from "lucide-react"

interface Props {
    obj: CanvasObject
    updateOverlayPosition: (id: string, x: number, y: number) => void
    canvasWidth: number
    canvasHeight: number
}

export const OverlayObject: React.FC<Props> = ({
    obj,
    updateOverlayPosition,
    canvasWidth,
    canvasHeight
}) => {
    const { state } = useCanvasSettings()
    const { zoom, mode } = state

    const [isDragging, setIsDragging] = useState(false)

    const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        const elt = e.currentTarget
        const pid = e.pointerId
        elt.setPointerCapture(pid)
        setIsDragging(true)

        const startX = e.clientX
        const startY = e.clientY
        const startCanvasX = obj.x
        const startCanvasY = obj.y

        const onMove = (ev: PointerEvent) => {
            // Calculate mouse movement in screen pixels
            const screenDeltaX = ev.clientX - startX
            const screenDeltaY = ev.clientY - startY

            // Convert screen pixel movement to canvas coordinate movement
            const zoomFactor = zoom / 100
            const canvasDeltaX = screenDeltaX / zoomFactor
            const canvasDeltaY = screenDeltaY / zoomFactor

            // Update canvas coordinates
            const newCanvasX = startCanvasX + canvasDeltaX
            const newCanvasY = startCanvasY + canvasDeltaY

            updateOverlayPosition(obj.id, newCanvasX, newCanvasY)
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


    // Necessary to calculate zoomed position offset relative to canvas center.
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2

    const zoomFactor = zoom / 100

    const transformedX = centerX + (obj.x - centerX) * zoomFactor
    const transformedY = centerY + (obj.y - centerY) * zoomFactor

    const scaledWidth = obj.width * zoomFactor
    const scaledHeight = obj.height * zoomFactor

    return (
        <div
            className="absolute"
            style={{
                left: transformedX - (scaledWidth / 2),
                top: transformedY - (scaledHeight / 2),
                cursor,
            }}
            draggable={false}
            onPointerDown={mode === "select" ? startDrag : undefined}
        >
            {obj.type === "image" &&
                <div
                    className="bg-red-400 flex justify-center items-center rounded-2xl"
                    style={{ width: scaledWidth, height: scaledHeight }}
                >
                    <Image className="text-white" />
                </div>
            }
            {obj.type === "audio" &&
                <div
                    className="bg-blue-400 flex justify-center items-center rounded-2xl"
                    style={{ width: scaledWidth, height: scaledHeight }}
                >
                    <Music className="text-white" />
                </div>
            }
            {obj.type === "location" &&
                <div
                    className="bg-green-400 flex justify-center items-center rounded-2xl"
                    style={{ width: scaledWidth, height: scaledHeight }}
                >
                    <MapPinned className="text-white" />
                </div>
            }
        </div>
    )
}