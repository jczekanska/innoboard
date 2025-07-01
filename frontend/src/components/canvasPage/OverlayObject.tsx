import React, { useMemo, ReactNode } from "react";
import { CanvasObject, Mode } from "@/types/canvas";
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
  updateObjectStyle: (id: string, style: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
  }) => void;
  deleteObject: (id: string) => void;
  canvasWidth: number;
  canvasHeight: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  linkify?: (text: string) => ReactNode[];
}

const createZoomHelpers = (zoom: number) => {
  const zoomFactor = zoom / 100;
  return {
    zoomFactor,
    toCanvas: (screenDelta: number) => screenDelta / zoomFactor,
    toScreen: (canvasDelta: number) => canvasDelta * zoomFactor,
  };
};

export const OverlayObject = React.memo<Props>(({
  obj,
  updateObjectPosition,
  updateObjectRotation,
  updateObjectDimension,
  updateObjectText,
  updateObjectStyle,
  deleteObject,
  canvasWidth,
  canvasHeight,
  selectedId,
  onSelect,
  linkify
}) => {
  const { state } = useCanvasSettings();
  const { zoom, mode } = state;
  const { zoomFactor } = createZoomHelpers(zoom);

  const {
    getPointerHandler,
    getCursor,
    isDeleting,
    isDragging,
    isRotating,
    isResizing
  } = useOverlayHandlers({
    obj,
    mode,
    zoom,
    updateObjectPosition,
    updateObjectRotation,
    updateObjectDimension,
    deleteObject
  });

  const transformed = useMemo(() => {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const tx = cx + (obj.x - cx) * zoomFactor - (obj.width * zoomFactor) / 2;
    const ty = cy + (obj.y - cy) * zoomFactor - (obj.height * zoomFactor) / 2;
    return {
      x: tx,
      y: ty,
      width: obj.width * zoomFactor,
      height: obj.height * zoomFactor,
    };
  }, [obj, zoomFactor, canvasWidth, canvasHeight]);

  const rotation = ("rotation" in obj ? obj.rotation : 0) || 0;
  const isSelected = selectedId === obj.id;
  const shouldDisablePointerEvents = mode === "draw" || mode === "erase";
  const selectionOutline = isSelected && mode === "select"
    ? "2px dashed #3b82f6"
    : "none";

  const renderObjectContent = () => {
    const style = { width: transformed.width, height: transformed.height };
    const common = "flex justify-center items-center rounded-2xl";

    switch (obj.type) {
      case "image":
        return (
          <div style={style} className={`${common} ${!obj.src && "bg-red-400"}`}>
            <img src={obj.src} alt="" />
          </div>
        );
      case "audio":
        return (
          <OverlayAudio
            src={obj.url}
            filename={obj.filename}
            width={transformed.width}
            height={transformed.height}
            isInteractable={mode === "select"}
          />
        );
      case "location":
        return (
          <OverlayLocation
            label={obj.label}
            lat={obj.lat}
            lng={obj.lng}
            width={transformed.width}
            height={transformed.height}
          />
        );
      case "text":
        return (
          <OverlayText
            text={obj.text}
            linkify={linkify}
            color={obj.color}
            fontSize={obj.fontSize}
            fontFamily={obj.fontFamily}
            width={transformed.width}
            height={transformed.height}
            isInteractable={mode === "select"}
            isSelected={isSelected}
            onTextChange={(t) => updateObjectText(obj.id, t)}
            onStyleChange={(s) => updateObjectStyle(obj.id, s)}
          />
        );
      case "circle":
        return (
          <div
            style={{
              ...style,
              borderRadius: "50%",
              border: `${obj.strokeWidth}px solid ${obj.color}`,
              background: "transparent",
            }}
            className={common}
          />
        );
      case "rectangle":
        return (
          <div
            style={{
              ...style,
              border: `${obj.strokeWidth}px solid ${obj.color}`,
              background: "transparent",
            }}
            className={common}
          />
        );
      default:
        return null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (mode === "select") {
      e.stopPropagation();
      onSelect(obj.id);
    }
  };

  return (
    <div
      className={`absolute ${isDeleting ? "transition-all duration-300 scale-0 opacity-0" : ""}`}
      style={{
        left: transformed.x,
        top: transformed.y,
        transform: `rotate(${rotation}deg)`,
        cursor: mode === "select" ? "pointer" : getCursor(),
        pointerEvents: shouldDisablePointerEvents ? "none" : "auto",
        outline: selectionOutline,
      }}
      draggable={false}
      onPointerDown={shouldDisablePointerEvents ? undefined : getPointerHandler()}
      onClick={handleClick}
    >
      {renderObjectContent()}
    </div>
  );
});

OverlayObject.displayName = "OverlayObject";
