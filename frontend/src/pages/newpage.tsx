import { ArrowLeft, Eraser, FileAudio, Image, LucideIcon, MapPin, Minus, MousePointer, PencilLine, Plus, Share2, Type } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HexColorPicker } from "react-colorful"
// import { Slider } from "@/components/ui/slider"
import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"


const CanvasPage: React.FC = () => {



    const [zoom, setZoom] = useState(100)

    const [size, setSize] = useState(33)

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
    const [color, setColor] = useState<string>("#000000")

    const [fontSize, setFontSize] = useState<number>(16) // Font size for text elements
    const [fontFamily, setFontFamily] = useState<string>("Inter") // Font family for text elements

    const MIN_FONT_SIZE = 8;
    const MAX_FONT_SIZE = 144;

    const allowedKeys = [
        "Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Enter",
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

        console.log("Accepted font size:", value);
    };


    return <div className="flex bg-gray-300 w-screen h-screen flex-col">
        {/* Top Bar */}
        <div className="flex absolute items-center w-screen h-13 bg-white px-3 border-b-1">
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
        </div>
        <div className="flex h-screen">
            {/* Toolbar */}
            <div className="flex flex-col w-15 bg-white pt-16 pb-3 border-e-1">
                <div className="flex flex-col items-center gap-3">
                    <ToolsButton icon={MousePointer} />
                    <ToolsButton icon={PencilLine} />
                    <ToolsButton icon={Type} />
                    <ToolsButton icon={Eraser} />
                    <ToolsButton icon={Image} />
                    <ToolsButton icon={FileAudio} />
                    <ToolsButton icon={MapPin} />
                </div>
                {/* Zoom Functionality (might cause problems: in this case, remove it) */}
                <div className="flex flex-col items-center gap-3 h-full justify-end">
                    <ToolsButton icon={Minus} onClick={() => setZoom(zoom > 25 ? zoom - 25 : zoom)} />
                    <span className="text-xs">{zoom}%</span>
                    <ToolsButton icon={Plus} onClick={() => setZoom(zoom < 350 ? zoom + 25 : zoom)} />
                </div>
            </div>
            {/* Canvas Area */}
            <div className="w-full bg-red-100 pt-23 ps-10 overflow-auto grid place-items-center">
                {/* Canvas itself */}
                <div

                    style={{ scale: zoom + "%" }}
                    className="h-50 w-50 mb-10 me-10 bg-white duration-100"></div>
            </div>
            {/* Additional Tools Panel */}
            <div className="flex flex-col w-80 px-3 bg-white items-center gap-3 pt-16 border-s-1">
                {/* Text */}
                <div className="flex w-full gap-2">
                    {/* Font Family */}
                    <div className="flex flex-[2] flex-col">
                        <label className="text-sm text-gray-500 mb-1.5 ms- block">Font Family</label>
                        <select className="border py-1.5 ps-1.5 rounded-lg overflow-hidden"
                            value={fontFamily}
                            onChange={(event) => {
                                setFontFamily(event.currentTarget.value)
                            }}>
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
                        <label className="text-sm text-gray-500 mb-1.5 block">Size</label>
                        <input
                            className="flex w-full bg-[#e9e9ec] border py-1 pe-1.5 text-center rounded-lg"
                            type="number" min={MIN_FONT_SIZE} max={MAX_FONT_SIZE}
                            onKeyDown={handleKeyDown} onChange={handleChange}
                        />
                    </div>
                </div>
                {/* Colors */}
                <div className="flex flex-col w-full gap-1.5">
                    <label className="text-sm text-gray-500 bloc">Color</label>
                    <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                        <PopoverTrigger asChild>
                            <button className="flex w-full border-1 items-center py-1 px-3 rounded-xl gap-2">
                                <div className="h-4 w-4 rounded-full shadow-xs" style={{ backgroundColor: color }} />
                                {color}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 bg-white">
                            <HexColorPicker color={color} onChange={setColor} />
                        </PopoverContent>
                    </Popover>
                </div>
                {/* Cursor Size */}
                <div className="flex flex-col w-full gap-1.5">
                    <label className="text-sm text-gray-500 block">Cursor Size</label>
                    <div className="flex w-full">
                        <Slider defaultValue={[size]} max={100} step={1} className="w-full"
                            onValueChange={([val]) => {
                                setSize(val)
                            }} />
                        <span className="w-17 text-end block">{size}px</span>
                    </div>
                </div>
                {/* Users */}

            </div>
        </div>
    </div>
}




const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        className={`relative flex w-full touch-none select-none items-center ${className}`}
        {...props}
    >
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-200">
            <SliderPrimitive.Range className="absolute h-full bg-black" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-black bg-white shadow hover:bg-gray-100 focus:outline-none" />
    </SliderPrimitive.Root>
))

Slider.displayName = "Slider"

export { Slider }

type ToolsButtonProps = {
    icon: LucideIcon
    onClick?: () => void
}

const ToolsButton: React.FC<ToolsButtonProps> = ({ icon: Icon, onClick }) => {
    return (
        <button
            className="flex w-8 h-8 rounded-xl bg-white hover:scale-110 hover:bg-gray-100 duration-150"
            onClick={onClick}
        >
            <Icon className="m-auto w-5 text-gray-900" />
        </button>
    )
}

export default CanvasPage