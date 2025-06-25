import React, { useMemo } from "react";
import { CanvasObject } from "@/types/canvas";
import { useCanvasSettings } from "@/context/CanvasSettingsContext";

import { useOverlayHandlers } from "@/hooks/useOverlayHandlers";
import { OverlayLocation } from "./OverlayLocation";
import { OverlayAudio } from "./OverlayAudio";
import { OverlayText } from "./OverlayText";

interface Props {
    obj: CanvasObject;
    updateObjectPosition: (id: string, x: number, y: number) => void;
    updateObjectRotation: (id: string, rotation: number) => void;
    updateObjectDimension: (id: string, width: number, height: number) => void;
    updateObjectText: (id: string, text: string) => void;
    updateObjectStyle: (id: string, style: { color?: string; fontSize?: number; fontFamily?: string }) => void;
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
    updateObjectText,
    updateObjectStyle,
    deleteObject,
    canvasWidth,
    canvasHeight
}) => {
    const { state } = useCanvasSettings();
    const { zoom, mode } = state;

    const { zoomFactor } = createZoomHelpers(zoom);

    const { getPointerHandler, getCursor, isDeleting, isDragging, isRotating, isResizing } = useOverlayHandlers({
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
                    <OverlayAudio
                        src={obj.url}
                        filename={obj.filename}
                        width={width}
                        height={height}
                        isInteractable={mode === "select"}
                    />
                );
            case "location":
                return (
                    <OverlayLocation
                        label={obj.label}
                        lat={obj.lat}
                        lng={obj.lng}
                        width={width}
                        height={height}
                    />
                );
            case "text":
                return (
                    <OverlayText
                        text={obj.text}
                        color={obj.color}
                        fontSize={obj.fontSize}
                        fontFamily={obj.fontFamily}
                        width={width}
                        height={height}
                        isInteractable={mode === "select"}
                        mode={mode}
                        isDragging={isDragging}
                        isRotating={isRotating}
                        isResizing={isResizing}
                        onTextChange={(text) => updateObjectText(obj.id, text)}
                        onStyleChange={(style) => updateObjectStyle(obj.id, style)}
                    />
                );
            default:
                return null;
        }
    };

    const transformed = useMemo(() => getTransformedProperties(), [obj, zoomFactor, canvasWidth, canvasHeight]);
    const rotation = (obj.type === "image" || obj.type === "text") ? obj.rotation || 0 : 0;

    // Disable pointer events for draw/erase modes to allow painting through
    const shouldDisablePointerEvents = mode === 'draw' || mode === 'erase';

    return (
        <div
            className={`absolute ${isDeleting ? 'transition-all duration-300 scale-0 opacity-0' : ''}`}
            style={{
                transform: `rotate(${rotation}deg)`,
                left: transformed.x,
                top: transformed.y,
                cursor: getCursor(),
                pointerEvents: shouldDisablePointerEvents ? 'none' : 'auto',
            }}
            draggable={false}
            onPointerDown={shouldDisablePointerEvents ? undefined : getPointerHandler()}
        >
            {renderObjectContent(transformed.width, transformed.height)}
        </div>
    );
});

OverlayObject.displayName = "OverlayObject";
