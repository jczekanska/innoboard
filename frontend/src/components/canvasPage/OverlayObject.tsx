import React from "react";
import { CanvasObject } from "@/types/canvas";
import { useCanvasSettings } from "@/context/CanvasSettingsContext";
import { Image, MapPinned, Music } from "lucide-react";
import { useOverlayHandlers } from "@/hooks/useOverlayHandlers";

interface Props {
    obj: CanvasObject;
    updateOverlayPosition: (id: string, x: number, y: number) => void;
    updateOverlayRotation: (id: string, rotation: number) => void;
    updateOverlayDimension: (id: string, width: number, height: number) => void;
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
    updateOverlayPosition,
    updateOverlayRotation,
    updateOverlayDimension,
    canvasWidth,
    canvasHeight
}) => {
    const { state } = useCanvasSettings();
    const { zoom, mode } = state;

    const { zoomFactor } = createZoomHelpers(zoom);

    const { getPointerHandler, getCursor } = useOverlayHandlers({
        obj,
        mode,
        zoom,
        updateOverlayPosition,
        updateOverlayRotation,
        updateOverlayDimension,
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
                    <div className={`bg-red-400 ${commonClasses}`} style={style}>
                        <Image {...iconProps} />
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
                        <MapPinned {...iconProps} />
                    </div>
                );
            default:
                return null;
        }
    };

    const transformed = getTransformedProperties();
    const rotation = obj.type === "image" ? obj.rotation || 0 : 0;

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
    );
});

OverlayObject.displayName = "OverlayObject";