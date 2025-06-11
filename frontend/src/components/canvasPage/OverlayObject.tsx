import React, { useMemo } from "react";
import { CanvasObject } from "@/types/canvas";
import { useCanvasSettings } from "@/context/CanvasSettingsContext";
import { Image, MapPinned, Music } from "lucide-react";
import { useOverlayHandlers } from "@/hooks/useOverlayHandlers";
import { OverlayLocation } from "./OverlayLocation";

interface Props {
    obj: CanvasObject;
    updateObjectPosition: (id: string, x: number, y: number) => void;
    updateObjectRotation: (id: string, rotation: number) => void;
    updateObjectDimension: (id: string, width: number, height: number) => void;
    deleteObject: (id: string) => void;
    canvasWidth: number;
    canvasHeight: number;
}

// Helper functions for coordinate transformations
const createZoomHelpers = (zoom: number) => {
    const zoomFactor = zoom / 100;
    return {
        zoomFactor,
        toCanvas: (screenDelta: number) => screenDelta / zoomFactor,
        toScreen: (canvasDelta: number) => canvasDelta * zoomFactor,
    };
};

// Memoized component to avoid re-rendering this overlay when unrelated objects update
export const OverlayObject = React.memo<Props>(({
    obj,
    updateObjectPosition,
    updateObjectRotation,
    updateObjectDimension,
    deleteObject,
    canvasWidth,
    canvasHeight
}) => {
    const { state } = useCanvasSettings();
    const { zoom, mode } = state;

    const { zoomFactor } = createZoomHelpers(zoom);

    const { getPointerHandler, getCursor, isDeleting } = useOverlayHandlers({
        obj,
        mode,
        zoom,
        updateObjectPosition,
        updateObjectRotation,
        updateObjectDimension,
        deleteObject
    });

    // Calculate transformed position and dimensions
    const getTransformedProperties = () => {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        const transformedX = centerX + (obj.x - centerX) * zoomFactor;
        const transformedY = centerY + (obj.y - centerY) * zoomFactor;
        const scaledWidth = obj.width * zoomFactor;
        const scaledHeight = obj.height * zoomFactor;

        return {
            x: transformedX - scaledWidth / 2,
            y: transformedY - scaledHeight / 2,
            width: scaledWidth,
            height: scaledHeight,
        };
    };

    // Render object content based on type
    const renderObjectContent = (width: number, height: number) => {
        const commonClasses = "flex justify-center items-center rounded-2xl";
        const iconProps = { className: "text-white" };
        const style = { width, height };

        switch (obj.type) {
            case "image":
                return (
                    <div className={`${!obj.src && "bg-red-400"} ${commonClasses}`} style={style}>
                        {/* <Image {...iconProps} /> */}
                        <img src={obj.type === "image" && obj.src}></img>
                    </div>
                );
            case "audio":
                return (
                    <div className={`bg-blue-400 ${commonClasses}`} style={style}>
                        <Music {...iconProps} />
                    </div>
                );
            case "location":
                return (
                    <div className={`bg-green-400 ${commonClasses}`} style={style}>
                        {/* <MapPinned {...iconProps} /> */}
                        <OverlayLocation />
                    </div>
                );
            default:
                return null;
        }
    };

    const transformed = useMemo(() => getTransformedProperties(), [obj, zoomFactor, canvasWidth, canvasHeight]);
    const rotation = obj.type === "image" ? obj.rotation || 0 : 0;

    return (
        <div
            className={`absolute transition-all duration-300 ${isDeleting ? 'scale-0 opacity-0' : ''}`}
            style={{
                transform: `rotate(${rotation}deg)`,
                left: transformed.x,
                top: transformed.y,
                cursor: getCursor(),
            }}
            draggable={false}
            onPointerDown={getPointerHandler()}
        >
            {renderObjectContent(transformed.width, transformed.height)}
        </div>
    );
});

OverlayObject.displayName = "OverlayObject";
