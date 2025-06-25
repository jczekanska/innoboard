import type { CanvasObject } from "@/types/canvas";

export const useOverlayTransform = (
    obj: CanvasObject,
    zoom: number,
    canvasWidth: number,
    canvasHeight: number,
) => {
    const zoomFactor = zoom / 100;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const transformedX = centerX + (obj.x - centerX) * zoomFactor;
    const transformedY = centerY + (obj.y - centerY) * zoomFactor;
    const scaledWidth = obj.width * zoomFactor;
    const scaledHeight = obj.height * zoomFactor;

    return {
        position: {
            x: transformedX - scaledWidth / 2,
            y: transformedY - scaledHeight / 2,
        },
        size: {
            width: scaledWidth,
            height: scaledHeight,
        },
        zoomFactor,
        toCanvas: (delta: number) => delta / zoomFactor,
    };
};
