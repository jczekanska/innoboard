import { CanvasObject, Mode } from "@/types/canvas";
import { useCallback, useState, useRef } from "react";

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
    updateObjectPosition: (id: string, x: number, y: number) => void;
    updateObjectRotation: (id: string, rotation: number) => void;
    updateObjectDimension: (id: string, width: number, height: number) => void;
    deleteObject: (id: string) => void;
}

export const useOverlayHandlers = ({
    obj,
    mode,
    zoom,
    updateObjectPosition,
    updateObjectRotation,
    updateObjectDimension,
    deleteObject
}: UseOverlayHandlersProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const animationRef = useRef<number | null>(null);

    const { startDrag } = usePointerDrag();
    const { toCanvas } = createZoomHelpers(zoom);

    // HANDLERS
    // Special handler for rectangle/circle tools' proportional resizing
    const handleProportionalResize = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = obj.width;
            const startHeight = obj.height;
            const rect = e.currentTarget.getBoundingClientRect();
            
            // Calculate center of the shape
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Determine which edge is being dragged based on mouse position
            const relativeX = e.clientX - rect.left;
            const relativeY = e.clientY - rect.top;
            const edgeThreshold = 20; // pixels from edge
            
            let resizeMode: 'width' | 'height' | 'both' = 'both';
            
            if (relativeX < edgeThreshold) {
                resizeMode = 'width'; // left edge
            } else if (relativeX > rect.width - edgeThreshold) {
                resizeMode = 'width'; // right edge
            } else if (relativeY < edgeThreshold) {
                resizeMode = 'height'; // top edge
            } else if (relativeY > rect.height - edgeThreshold) {
                resizeMode = 'height'; // bottom edge
            }

            const onMove = (ev: PointerEvent) => {
                // Calculate movement relative to center
                const currentDistanceFromCenterX = ev.clientX - centerX;
                const currentDistanceFromCenterY = ev.clientY - centerY;
                const startDistanceFromCenterX = startX - centerX;
                const startDistanceFromCenterY = startY - centerY;
                
                // Calculate how much the distance from center has changed
                const deltaDistanceX = Math.abs(currentDistanceFromCenterX) - Math.abs(startDistanceFromCenterX);
                const deltaDistanceY = Math.abs(currentDistanceFromCenterY) - Math.abs(startDistanceFromCenterY);
                
                // Convert to canvas coordinates and apply 2x factor since we're measuring from center
                const deltaX = toCanvas(deltaDistanceX * 2);
                const deltaY = toCanvas(deltaDistanceY * 2);
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                
                if (resizeMode === 'width') {
                    newWidth = startWidth + deltaX;
                } else if (resizeMode === 'height') {
                    newHeight = startHeight + deltaY;
                } else {
                    // Both dimensions (corner drag)
                    const aspectRatio = startWidth / startHeight;
                    newWidth = startWidth + deltaX;
                    newHeight = newWidth / aspectRatio;
                }

                if (newWidth > MIN_SIZE && newHeight > MIN_SIZE) {
                    updateObjectDimension(obj.id, newWidth, newHeight);
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
            updateObjectDimension,
            startDrag,
            toCanvas,
        ],
    );

    // Regular resize handler (maintains aspect ratio)
    const handleResize = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const startX = e.clientX;
            const startWidth = obj.width;
            const startHeight = obj.height;
            const aspectRatio = startWidth / startHeight;

            const onMove = (ev: PointerEvent) => {
                const deltaX = toCanvas(ev.clientX - startX);
                
                // Maintain aspect ratio based on X delta
                const newWidth = startWidth + deltaX;
                const newHeight = newWidth / aspectRatio;

                if (newWidth > MIN_SIZE && newHeight > MIN_SIZE) {
                    updateObjectDimension(obj.id, newWidth, newHeight);
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
            updateObjectDimension,
            startDrag,
            toCanvas,
        ],
    );

    // Rotation handler
    const handleRotation = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (obj.type !== "image" && obj.type !== "text" && obj.type !== "circle" && obj.type !== "rectangle") return;

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
                updateObjectRotation(obj.id, rotationDeg);
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
            obj.type === "image" ? obj.rotation : obj.type === "text" ? obj.rotation : undefined,
            updateObjectRotation,
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

                updateObjectPosition(obj.id, newCanvasX, newCanvasY);
            };

            startDrag(
                e,
                onMove,
                () => setIsDragging(true),
                () => setIsDragging(false),
            );
        },
        [obj.id, obj.x, obj.y, updateObjectPosition, startDrag, toCanvas],
    );

    const handleDelete = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            e.stopPropagation();
            setIsDeleting(true);
            
            // Delay actual deletion until animation completes
            animationRef.current = window.setTimeout(() => {
                deleteObject(obj.id);
                setIsDeleting(false);
            }, 300); // Match this with CSS animation duration
        },
        [obj.id, deleteObject],
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
            case "rectangle":
                // Use proportional resize for rectangle tool on rectangles
                if (obj.type === "rectangle") {
                    return handleProportionalResize;
                }
                return undefined;
            case "circle":
                // Use proportional resize for circle tool on circles
                if (obj.type === "circle") {
                    return handleProportionalResize;
                }
                return undefined;
            case "delete":
                return handleDelete;
            default:
                return undefined;
        }
    }, [mode, handlePosition, handleRotation, handleResize, handleProportionalResize, handleDelete, obj.type]);

    // Determine cursor style
    const getCursor = useCallback((): string => {
        switch (mode) {
            case "move":
                return "move";
            case "rotate":
                if (obj.type !== "image" && obj.type !== "text" && obj.type !== "circle" && obj.type !== "rectangle") return "not-allowed";
                return isDragging ? "grabbing" : "grab";
            case "resize":
                return "nesw-resize";
            case "delete":
                return "pointer";
            default:
                return "default";
        }
    }, [mode, isDragging, obj.type]);

    return {
        isDragging,
        isRotating,
        isResizing,
        isDeleting,
        getPointerHandler,
        getCursor,
    };
};
