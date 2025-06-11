import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import { useState } from "react"
import { HexColorPicker } from "react-colorful"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Slider from "./Slider"


const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 144;

const ToolsPanel = () => {

    const { state, dispatch } = useCanvasSettings()
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)

    // // This section sets up the intended behavior for the "Font Size" field

    const allowedKeys = [
        "Backspace", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete", "Enter",
    ];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const isNumber = /^[0-9]$/.test(e.key);
        const isAllowed = allowedKeys.includes(e.key);

        if (!isNumber && !isAllowed) {
            e.preventDefault();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseInt(e.target.value, 10);

        if (isNaN(value)) return;

        // Clamps value within allowed range
        if (value < MIN_FONT_SIZE) value = MIN_FONT_SIZE;
        if (value > MAX_FONT_SIZE) value = MAX_FONT_SIZE;

        dispatch({ type: "SET_FONT_SIZE", payload: value })
    };

    return (<aside className="flex flex-col w-80 px-3 bg-white items-center gap-3 pt-16 border-s-1">
        {/* Text */}
        <section className="flex w-full gap-2">
            {/* Font Family */}
            <div className="flex flex-[2] flex-col">
                <label
                    htmlFor="font-family-select"
                    className="text-sm text-gray-500 mb-1.5 ms- block">
                    Font Family
                </label>
                <select
                    id="font-family-select"
                    className="border py-1.5 ps-1.5 rounded-lg overflow-hidden"
                    value={state.fontFamily}
                    onChange={(event) => {
                        dispatch({ type: "SET_FONT_FAMILY", payload: event.currentTarget.value })
                    }}
                >
                    <option value="Inter, system-ui, -apple-system, sans-serif">Inter</option>
                    <option value="Arial, Helvetica, sans-serif">Arial</option>
                    <option value="Helvetica, Arial, sans-serif">Helvetica</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                    <option value="'Courier New', Courier, monospace">Courier New</option>
                    <option value="Georgia, 'Times New Roman', serif">Georgia</option>
                    <option value="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System UI</option>
                    <option value="'Comic Neue', 'Comic Sans MS', cursive">Comic Sans</option>
                    <option value="Impact, 'Arial Black', sans-serif">Impact</option>
                </select>
            </div>
            {/* Font Size */}
            <div className="flex flex-[1] flex-col items-center">
                <label
                    htmlFor="font-size-input"
                    className="text-sm text-gray-500 mb-1.5 block">
                    Size
                </label>
                <input
                    id="font-size-input"
                    className="flex w-full bg-[#e9e9ec] border py-1 pe-1.5 text-center rounded-lg"
                    type="number" value={state.fontSize} min={MIN_FONT_SIZE} max={MAX_FONT_SIZE}
                    onKeyDown={handleKeyDown} onChange={handleChange}
                />
            </div>
        </section>
        {/* Colors */}
        <section className="flex flex-col w-full gap-1.5">
            <label id="color-label" className="text-sm text-gray-500">Color</label>
            <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                    <button
                        className="flex w-full border-1 items-center py-1 px-3 rounded-xl gap-2"
                        aria-labelledby="color-label"
                    >
                        <div className="h-4 w-4 rounded-full shadow-xs" style={{ backgroundColor: state.color }} />
                        {state.color}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 bg-white" role="dialog" aria-labelledby="color-label">
                    <HexColorPicker
                        color={state.color}
                        onChange={(color) => {
                            dispatch({ type: "SET_COLOR", payload: color })
                        }}
                        aria-label="Color Picker" />
                </PopoverContent>
            </Popover>
        </section>
        {/* Cursor Size */}
        <section className="flex flex-col w-full gap-1.5">
            <label id="cursor-size-label" className="text-sm text-gray-500 block">Cursor Size</label>
            <div className="flex w-full" aria-labelledby="cursor-size-label">
                <Slider
                    className="w-full"
                    // values
                    defaultValue={[state.size]} max={100} step={1}
                    // arias
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.size} aria-labelledby="cursor-size-label"
                    // functionality
                    onValueChange={([val]) => {
                        dispatch({ type: "SET_SIZE", payload: val })
                    }} />
                {/* display */}
                <span className="w-17 text-end block">{state.size}px</span>
            </div>
        </section>
        {/* Users */}
        {/* Display the users here */}
    </aside>)
}

export default ToolsPanel