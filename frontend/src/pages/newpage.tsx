import * as React from "react"
import { useState } from "react"

// external components
import { HexColorPicker } from "react-colorful"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowLeft, Eraser, FileAudio, Image, LucideIcon, MapPin, Minus, MousePointer, PencilLine, Plus, Share2, Type } from "lucide-react"

// components
import Slider from "@/components/canvasPage/Slider"
import ToolsButton from "@/components/canvasPage/ToolsButton"

const CanvasPage: React.FC = () => {

    // Canvas Functionalities

    interface DrawEvent {
        x: number;
        y: number;
        mode: Mode;
        color: string;
        size: number;
        text?: string;
    }
    interface TextBox {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
    }

    type Mode = "select" | "draw" | "text" | "erase" | "image" | "audio" | "location"

    const TOOLS: Record<Mode, LucideIcon> = {
        select: MousePointer,
        draw: PencilLine,
        text: Type,
        erase: Eraser,
        image: Image,
        audio: FileAudio,
        location: MapPin
    }


    // Interface functionalities

    const [mode, setMode] = useState<Mode>("select")

    const [zoom, setZoom] = useState(100)

    const [size, setSize] = useState(33)

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
    const [color, setColor] = useState<string>("#000000")

    const [fontSize, setFontSize] = useState<number>(16) // Font size for text elements
    const [fontFamily, setFontFamily] = useState<string>("Inter") // Font family for text elements

    const MIN_FONT_SIZE = 8;
    const MAX_FONT_SIZE = 144;

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

        // Clamp value within allowed range
        if (value < MIN_FONT_SIZE) value = MIN_FONT_SIZE;
        if (value > MAX_FONT_SIZE) value = MAX_FONT_SIZE;

        setFontSize(value)
    };


    return <div className="flex bg-gray-300 w-screen h-screen flex-col">
        {/* Top Bar */}
        <header className="flex absolute items-center w-screen h-13 bg-white px-3 border-b-1">
            {/* Canvas Name */}
            <div className="flex items-center w-full gap-6">
                {/* Back Button */}
                <ArrowLeft className="hover:-translate-x-1 duration-150 cursor-pointer ms-0.5" />
                {/* Canvas Name */}
                <h1 className="text-lg font-medium truncate">
                    New Canvas {new Date().toISOString()}
                </h1>
            </div>
            {/* Canvas Options */}
            <div className="flex items-center w-full justify-end">
                {/* Share Button */}
                <button className="flex items-center border py-1 px-3 gap-1.5 rounded-xl bg-white hover:scale-105 duration-150">
                    <Share2 className="w-4" />
                    <span>
                        Share
                    </span>
                </button>
            </div>
        </header>
        <div className="flex h-screen">
            {/* Toolbar */}
            <aside className="flex flex-col w-15 bg-white pt-16 pb-3 border-e-1">
                <section className="flex flex-col items-center gap-3">
                    {(Object.entries(TOOLS) as [Mode, LucideIcon][]).map(([toolMode, Icon]) => (
                        <ToolsButton
                            key={toolMode}
                            icon={Icon}
                            active={mode === toolMode}
                            onClick={() => setMode(toolMode)}
                        />
                    ))}
                </section>
                {/* Zoom Functionality (might cause problems: in this case, remove it) */}
                <section className="flex flex-col items-center gap-3 h-full justify-end">
                    <ToolsButton icon={Minus} onClick={() => setZoom(zoom > 25 ? zoom - 25 : zoom)} />
                    <span className="text-xs">{zoom}%</span>
                    <ToolsButton icon={Plus} onClick={() => setZoom(zoom < 350 ? zoom + 25 : zoom)} />
                </section>
            </aside>
            {/* Canvas Area */}
            <main className="w-full bg-red-100 pt-23 ps-10 overflow-auto grid place-items-center">
                {/* Canvas itself */}
                <canvas
                    style={{ scale: zoom + "%" }}
                    className="h-50 w-50 mb-10 me-10 bg-white duration-100"
                />
            </main>
            {/* Additional Tools Panel */}
            <aside className="flex flex-col w-80 px-3 bg-white items-center gap-3 pt-16 border-s-1">
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
                            value={fontFamily}
                            onChange={(event) => {
                                setFontFamily(event.currentTarget.value)
                            }}
                        >
                            <option value="Inter">Inter</option>
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Georgia">Georgia</option>
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
                            type="number" value={fontSize} min={MIN_FONT_SIZE} max={MAX_FONT_SIZE}
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
                                <div className="h-4 w-4 rounded-full shadow-xs" style={{ backgroundColor: color }} />
                                {color}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 bg-white" role="dialog" aria-labelledby="color-label">
                            <HexColorPicker color={color} onChange={setColor} aria-label="Color Picker" />
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
                            defaultValue={[size]} max={100} step={1}
                            // arias
                            aria-valuemin={0} aria-valuemax={100} aria-valuenow={size} aria-labelledby="cursor-size-label"
                            // functionality
                            onValueChange={([val]) => {
                                setSize(val)
                            }} />
                        {/* display */}
                        <span className="w-17 text-end block">{size}px</span>
                    </div>
                </section>
                {/* Users */}
                {/* Display the users here */}
            </aside>
        </div>
    </div>
}






export default CanvasPage