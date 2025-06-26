import { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvasSettings } from '@/context/CanvasSettingsContext';

interface OverlayTextProps {
    text: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    width: number;
    height: number;
    isInteractable: boolean;
    mode: string;
    isDragging: boolean;
    isRotating: boolean;
    isResizing: boolean;
    isSelected: boolean;
    onTextChange: (text: string) => void;
    onStyleChange: (style: { color?: string; fontSize?: number; fontFamily?: string }) => void;
}

export const OverlayText = ({
    text,
    color,
    fontSize,
    fontFamily,
    width,
    height,
    isInteractable,
    mode,
    isDragging,
    isRotating,
    isResizing,
    isSelected,
    onTextChange,
    onStyleChange,
}: OverlayTextProps) => {
    const { state, dispatch } = useCanvasSettings();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [localText, setLocalText] = useState(text);

    // Update local text when prop changes
    useEffect(() => {
        setLocalText(text);
    }, [text]);

    // Handle double click to start editing
    const handleDoubleClick = useCallback(() => {
        if (!isInteractable) return;
        setIsEditing(true);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    }, [isInteractable]);

    // Handle text change
    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setLocalText(newText);
        onTextChange(newText);
    }, [onTextChange]);

    // Handle blur to stop editing
    const handleBlur = useCallback(() => {
        setIsEditing(false);
    }, []);

    // Handle key press (Escape to stop editing, Enter for new line)
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsEditing(false);
            textareaRef.current?.blur();
        }
    }, []);

    // Apply font changes when selected (editing or just selected) and settings change
    useEffect(() => {
        // Only apply changes if the text is selected (either editing or just selected)
        if (!isSelected) return;

        // Check if any font settings have changed from current text object settings
        const hasChanges =
            state.fontFamily !== fontFamily ||
            state.fontSize !== fontSize ||
            state.color !== color;

        if (hasChanges) {
            // Update the style for this text object to match current settings
            onStyleChange({
                fontFamily: state.fontFamily,
                fontSize: state.fontSize,
                color: state.color,
            });
        }
    }, [state.fontFamily, state.fontSize, state.color, isSelected, fontFamily, fontSize, color, onStyleChange]);

    const textStyle = {
        color,
        fontSize: `${fontSize}px`,
        fontFamily,
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        resize: 'none' as const,
        overflow: 'hidden' as const,
        padding: '4px',
        lineHeight: '1.2',
        wordWrap: 'break-word' as const,
    };

    // Determine if pointer events should be disabled (for painting/erasing through textboxes)
    const shouldDisablePointerEvents = mode === 'draw' || mode === 'erase';

    // Allow hover for interactive modes, but disable text interaction for non-select modes
    const allowTextInteraction = mode === 'select' || mode === 'text';

    return (
        <div
            className={`relative ${allowTextInteraction ? 'cursor-text' : 'cursor-default'}`}
            style={{
                width,
                height,
                pointerEvents: shouldDisablePointerEvents ? 'none' : 'auto'
            }}
            onDoubleClick={allowTextInteraction ? handleDoubleClick : undefined}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={localText}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={textStyle}
                    placeholder="Enter text..."
                    disabled={!isInteractable}
                />
            ) : (
                <div
                    style={{
                        ...textStyle,
                        whiteSpace: 'pre-wrap',
                        cursor: isInteractable ? 'text' : 'default',
                        userSelect: isInteractable ? 'text' : 'none',
                    }}
                >
                    {localText || 'Lorem Ipsum'}
                </div>
            )}

            {/* Visual indicator when in editing mode */}
            {isEditing && (
                <div className="absolute inset-0 border-2 border-blue-400 border-dashed pointer-events-none rounded" />
            )}

            {/* Faint dotted outline when hovering or during operations */}
            {(isHovered || isDragging || isRotating || isResizing) && !isEditing && !shouldDisablePointerEvents && (
                <div className="absolute inset-0 border border-gray-400 border-dotted border-opacity-40 pointer-events-none rounded" />
            )}
        </div>
    );
};
