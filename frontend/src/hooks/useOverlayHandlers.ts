import { CanvasObject, Mode } from "@/types/canvas";
import { useCallback, useState } from "react";

const MIN_SIZE = 50;

// Helper functions for coordinate transformations
const createZoomHelpers = (zoom: number) => {
    const zoomFactor = zoom / 100;
    return {
        zoomFactor,
        toCanvas: (screenDelta: number) => screenDelta / zoomFactor,
        toScreen: (canvasDelta: number) => canvasDelta * zoomFactor,
    };
};

// Custom hook for pointer interactions
const usePointerDrag = () => {
    const startDrag = useCallback((
        e: React.PointerEvent<HTMLDivElement>,
        onMove: (ev: PointerEvent) => void,
        onStart?: () => void,
        onEnd?: () => void,
    ) => {
        e.preventDefault();
        const elt = e.currentTarget;
        const pid = e.pointerId;
        elt.setPointerCapture(pid);
        onStart?.();

        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            elt.releasePointerCapture(pid);
            onEnd?.();
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    }, []);

    return { startDrag };
};

interface UseOverlayHandlersProps {
    obj: CanvasObject;
    mode: Mode;
    zoom: number;
    updateOverlayPosition: (id: string, x: number, y: number) => void;
    updateOverlayRotation: (id: string, rotation: number) => void;
    updateOverlayDimension: (id: string, width: number, height: number) => void;
}

export const useOverlayHandlers = ({
    obj,
    mode,
    zoom,
    updateOverlayPosition,
    updateOverlayRotation,
    updateOverlayDimension,
}: UseOverlayHandlersProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const { startDrag } = usePointerDrag();
    const { toCanvas } = createZoomHelpers(zoom);

    // HANDLERS
    // Resize handler
    const handleResize = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const startX = e.clientX;
            // const startY = e.clientY;
            const startWidth = obj.width;
            const startHeight = obj.height;
            const aspectRatio = startWidth / startHeight;

            const onMove = (ev: PointerEvent) => {
                const deltaX = toCanvas(ev.clientX - startX);
                // const deltaY = toCanvas(ev.clientY - startY);

                // Maintain aspect ratio based on X delta
                const newWidth = startWidth + deltaX;
                const newHeight = newWidth / aspectRatio;

                if (newWidth > MIN_SIZE && newHeight > MIN_SIZE) {
                    updateOverlayDimension(obj.id, newWidth, newHeight);
                }
            };

            startDrag(
                e,
                onMove,
                () => setIsResizing(true),
                () => setIsResizing(false),
            );
        },
        [
            obj.id,
            obj.width,
            obj.height,
            updateOverlayDimension,
            startDrag,
            toCanvas,
        ],
    );

    // Rotation handler
    const handleRotation = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (obj.type !== "image") return;

            const rect = e.currentTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const startAngle = Math.atan2(
                e.clientY - centerY,
                e.clientX - centerX,
            );
            const initialRotation = obj.rotation || 0;

            const onMove = (ev: PointerEvent) => {
                const currentAngle = Math.atan2(
                    ev.clientY - centerY,
                    ev.clientX - centerX,
                );
                const deltaRadians = currentAngle - startAngle;
                const rotationDeg = initialRotation +
                    deltaRadians * (180 / Math.PI);
                updateOverlayRotation(obj.id, rotationDeg);
            };

            startDrag(
                e,
                onMove,
                () => setIsRotating(true),
                () => setIsRotating(false),
            );
        },
        [
            obj.id,
            obj.type,
            obj.type === "image" && obj.rotation,
            updateOverlayRotation,
            startDrag,
        ],
    );

    // Position handler
    const handlePosition = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const startX = e.clientX;
            const startY = e.clientY;
            const startCanvasX = obj.x;
            const startCanvasY = obj.y;

            const onMove = (ev: PointerEvent) => {
                const screenDeltaX = ev.clientX - startX;
                const screenDeltaY = ev.clientY - startY;

                const canvasDeltaX = toCanvas(screenDeltaX);
                const canvasDeltaY = toCanvas(screenDeltaY);

                const newCanvasX = startCanvasX + canvasDeltaX;
                const newCanvasY = startCanvasY + canvasDeltaY;

                updateOverlayPosition(obj.id, newCanvasX, newCanvasY);
            };

            startDrag(
                e,
                onMove,
                () => setIsDragging(true),
                () => setIsDragging(false),
            );
        },
        [obj.id, obj.x, obj.y, updateOverlayPosition, startDrag, toCanvas],
    );

    // UTILS
    // Get handler based on mode
    const getPointerHandler = useCallback(() => {
        switch (mode) {
            case "move":
                return handlePosition;
            case "rotate":
                return handleRotation;
            case "resize":
                return handleResize;

            default:
                return undefined;
        }
    }, [mode, handlePosition, handleRotation, handleResize]);

    // Determine cursor style
    const getCursor = useCallback((): string => {
        switch (mode) {
            case "move":
                return "move";
            case "rotate":
                return isDragging ? "grabbing" : "grab";
            case "resize":
                return "nesw-resize";
            case "delete":
                return "pointer";
            default:
                return "default";
        }
    }, [mode, isDragging]);

    return {
        isDragging,
        isRotating,
        isResizing,
        getPointerHandler,
        getCursor,
    };
};
