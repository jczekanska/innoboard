import React, { useCallback, useState } from "react"
import { CanvasObject } from "@/types/canvas"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import { Image, MapPinned, Music } from "lucide-react"

interface Props {
    obj: CanvasObject
    updateOverlayPosition: (id: string, x: number, y: number) => void
    updateOverlayRotation: (id: string, rotation: number) => void
    updateOverlayDimension: (id: string, width: number, height: number) => void
    canvasWidth: number
    canvasHeight: number
}

const MIN_SIZE = 50

// Helper functions for coordinate transformations
const createZoomHelpers = (zoom: number) => {
    const zoomFactor = zoom / 100
    return {
        zoomFactor,
        toCanvas: (screenDelta: number) => screenDelta / zoomFactor,
        toScreen: (canvasDelta: number) => canvasDelta * zoomFactor,
    }
}

// Custom hook for pointer interactions
const usePointerDrag = () => {
    const startDrag = useCallback((
        e: React.PointerEvent<HTMLDivElement>,
        onMove: (ev: PointerEvent) => void,
        onStart?: () => void,
        onEnd?: () => void
    ) => {
        e.preventDefault()
        const elt = e.currentTarget
        const pid = e.pointerId
        elt.setPointerCapture(pid)
        onStart?.()

        const onUp = () => {
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            elt.releasePointerCapture(pid)
            onEnd?.()
        }

        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
    }, [])

    return { startDrag }
}

// Memoized component to avoid re-rendering this overlay when unrelated objects update
export const OverlayObject = React.memo<Props>(({
    obj,
    updateOverlayPosition,
    updateOverlayRotation,
    updateOverlayDimension,
    canvasWidth,
    canvasHeight
}) => {
    const { state } = useCanvasSettings()
    const { zoom, mode } = state

    const [isDragging, setIsDragging] = useState(false)
    const [isRotating, setIsRotating] = useState(false)
    const [isResizing, setIsResizing] = useState(false)

    const { startDrag } = usePointerDrag()
    const { zoomFactor, toCanvas } = createZoomHelpers(zoom)

    // Resize handler
    const handleResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const startX = e.clientX
        const startY = e.clientY
        const startWidth = obj.width
        const startHeight = obj.height
        const aspectRatio = startWidth / startHeight

        const onMove = (ev: PointerEvent) => {
            const deltaX = toCanvas(ev.clientX - startX)
            const deltaY = toCanvas(ev.clientY - startY)

            // Maintain aspect ratio based on X delta
            const newWidth = startWidth + deltaX
            const newHeight = newWidth / aspectRatio

            if (newWidth > MIN_SIZE && newHeight > MIN_SIZE) {
                updateOverlayDimension(obj.id, newWidth, newHeight)
            }
        }

        startDrag(
            e,
            onMove,
            () => setIsResizing(true),
            () => setIsResizing(false)
        )
    }, [obj.id, obj.width, obj.height, updateOverlayDimension, startDrag, toCanvas])

    // Rotation handler
    const handleRotation = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (obj.type !== "image") return

        const rect = e.currentTarget.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
        const initialRotation = obj.rotation || 0

        const onMove = (ev: PointerEvent) => {
            const currentAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX)
            const deltaRadians = currentAngle - startAngle
            const rotationDeg = initialRotation + deltaRadians * (180 / Math.PI)
            updateOverlayRotation(obj.id, rotationDeg)
        }

        startDrag(
            e,
            onMove,
            () => setIsRotating(true),
            () => setIsRotating(false)
        )
    }, [obj.id, obj.type, obj.type === "image" && obj.rotation, updateOverlayRotation, startDrag])

    // Position handler
    const handlePosition = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const startX = e.clientX
        const startY = e.clientY
        const startCanvasX = obj.x
        const startCanvasY = obj.y

        const onMove = (ev: PointerEvent) => {
            const screenDeltaX = ev.clientX - startX
            const screenDeltaY = ev.clientY - startY

            const canvasDeltaX = toCanvas(screenDeltaX)
            const canvasDeltaY = toCanvas(screenDeltaY)

            const newCanvasX = startCanvasX + canvasDeltaX
            const newCanvasY = startCanvasY + canvasDeltaY

            updateOverlayPosition(obj.id, newCanvasX, newCanvasY)
        }

        startDrag(
            e,
            onMove,
            () => setIsDragging(true),
            () => setIsDragging(false)
        )
    }, [obj.id, obj.x, obj.y, updateOverlayPosition, startDrag, toCanvas])

    // Determine cursor style
    const getCursor = (): string => {
        if (mode === "select" || mode === "rotate") {
            return isDragging ? "grabbing" : "grab"
        }
        if (mode === "resize") {
            return "nesw-resize"
        }
        return "default"
    }

    // Calculate transformed position and dimensions
    const getTransformedProperties = () => {
        const centerX = canvasWidth / 2
        const centerY = canvasHeight / 2

        const transformedX = centerX + (obj.x - centerX) * zoomFactor
        const transformedY = centerY + (obj.y - centerY) * zoomFactor
        const scaledWidth = obj.width * zoomFactor
        const scaledHeight = obj.height * zoomFactor

        return {
            x: transformedX - scaledWidth / 2,
            y: transformedY - scaledHeight / 2,
            width: scaledWidth,
            height: scaledHeight,
        }
    }

    // Get handler based on mode
    const getPointerHandler = () => {
        switch (mode) {
            case "select": return handlePosition
            case "rotate": return handleRotation
            case "resize": return handleResize
            default: return undefined
        }
    }

    // Render object content based on type
    const renderObjectContent = (width: number, height: number) => {
        const commonClasses = "flex justify-center items-center rounded-2xl"
        const iconProps = { className: "text-white" }
        const style = { width, height }

        switch (obj.type) {
            case "image":
                return (
                    <div className={`bg-red-400 ${commonClasses}`} style={style}>
                        <Image {...iconProps} />
                    </div>
                )
            case "audio":
                return (
                    <div className={`bg-blue-400 ${commonClasses}`} style={style}>
                        <Music {...iconProps} />
                    </div>
                )
            case "location":
                return (
                    <div className={`bg-green-400 ${commonClasses}`} style={style}>
                        <MapPinned {...iconProps} />
                    </div>
                )
            default:
                return null
        }
    }

    const transformed = getTransformedProperties()
    const rotation = obj.type === "image" ? obj.rotation || 0 : 0

    return (
        <div
            className="absolute"
            style={{
                rotate: `${rotation}deg`,
                left: transformed.x,
                top: transformed.y,
                cursor: getCursor(),
            }}
            draggable={false}
            onPointerDown={getPointerHandler()}
        >
            {renderObjectContent(transformed.width, transformed.height)}
        </div>
    )
})

OverlayObject.displayName = "OverlayObject"