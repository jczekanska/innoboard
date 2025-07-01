import React, { ReactNode, useRef, useEffect, useState, useCallback } from "react";
import { useCanvasSettings } from "@/context/CanvasSettingsContext";
import { Mode } from "@/types/canvas";

interface OverlayTextProps {
  text: string;
  linkify?: (text: string) => ReactNode[];
  color: string;
  fontSize: number;
  fontFamily: string;
  width: number;
  height: number;
  isInteractable: boolean;
  mode: Mode;
  isSelected: boolean;
  onTextChange: (text: string) => void;
  onStyleChange: (style: { color?: string; fontSize?: number; fontFamily?: string }) => void;
}

export const OverlayText: React.FC<OverlayTextProps> = ({
  text,
  linkify,
  color,
  fontSize,
  fontFamily,
  width,
  height,
  isInteractable,
  mode,
  isSelected,
  onTextChange,
  onStyleChange,
}) => {
  const { state } = useCanvasSettings();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const allowEdit = isInteractable && mode !== "view";

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    if (allowEdit) {
      setIsEditing(true);
    }
  }, [allowEdit]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      textareaRef.current?.blur();
    }
  }, []);

  useEffect(() => {
    if (!isSelected) return;

    const hasChanged =
      state.fontSize !== fontSize ||
      state.fontFamily !== fontFamily ||
      state.color !== color;

    if (hasChanged) {
      onStyleChange({
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        color: state.color,
      });
    }
  }, [state.fontSize, state.fontFamily, state.color, fontSize, fontFamily, color, isSelected, onStyleChange]);

  const baseStyle = {
    color,
    fontSize,
    fontFamily,
    width,
    height,
    lineHeight: "1.2",
    padding: "4px",
  };

  const displayedText = text || "Lorem Ipsum";

  if (!allowEdit || (!isSelected && !isEditing)) {
    return (
      <div
        className="relative"
        style={{
          ...baseStyle,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          pointerEvents: "auto",
          cursor: isInteractable ? "text" : "default",
          userSelect: isInteractable ? "text" : "none",
        }}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {linkify ? linkify(displayedText) : displayedText}
        {(isHovered || isSelected) && (
          <div className="absolute inset-0 border border-dotted border-gray-400 border-opacity-40 rounded pointer-events-none" />
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{ width, height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          ...baseStyle,
          resize: "none",
          border: "none",
          outline: "none",
          background: "transparent",
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder="Enter text..."
      />
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded pointer-events-none" />
      )}
    </div>
  );
};

OverlayText.displayName = "OverlayText";
