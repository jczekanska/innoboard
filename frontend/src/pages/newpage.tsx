import React, { useState, useRef, useEffect, useContext } from "react"

// external components
import { HexColorPicker } from "react-colorful"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowLeft, Eraser, FileAudio, Image, LucideIcon, MapPin, Minus, MousePointer, PencilLine, Plus, Share2, Type } from "lucide-react"

// components
import Slider from "@/components/canvasPage/Slider"
import ToolsButton from "@/components/canvasPage/ToolsButton"
import { AuthContext } from "@/context/AuthContext"
import { useNavigate, useParams } from "react-router-dom"

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

const CanvasPage: React.FC = () => {

    // General
    const navigate = useNavigate();

    // Authorization
    const { token } = useContext(AuthContext);
    const { id } = useParams<{ id: string }>();
    const [canvasInfo, setCanvasInfo] = useState<{ name: string } | null>(null);

    useEffect(() => {
        if (!token || !id) return;
        fetch(`/api/canvases/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(setCanvasInfo)
            .catch(() => navigate("/dashboard"));
    }, [id, token, navigate]);

    // ----- Interface functionalities -----

    const [mode, setMode] = useState<Mode>("select")

    const [zoom, setZoom] = useState(100)

    const [size, setSize] = useState(33)

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
    const [color, setColor] = useState<string>("#000000")

    const [fontSize, setFontSize] = useState<number>(16) // Font size for text elements
    const [fontFamily, setFontFamily] = useState<string>("Inter") // Font family for text elements

    const MIN_FONT_SIZE = 8;
    const MAX_FONT_SIZE = 144;

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

        setFontSize(value)
    };

    // ----- Canvas Functionalities ----- //

    const canvasRef = useRef<HTMLCanvasElement>(null);
    // const socketRef = useRef<WebSocket>();

    // Keeps track of the last cursor position to avoid unexpected jumps
    // when the pointer leaves and re-enters the canvas during drawing.
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    const configRef = useRef({ mode, color, size });

    useEffect(() => {
        configRef.current = { mode, color, size };
    }, [mode, color, size]);

    // Converts mouse event coordinates to canvas-relative coordinates,
    // accounting for canvas position and current zoom level.
    const getCanvasXY = (canvas: HTMLCanvasElement, e: MouseEvent, zoom: number) => {
        const r = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (100 / zoom),
            y: (e.clientY - r.top) * (100 / zoom),
        };
    };

    // // This section sets up mouse event handlers for canvas interaction

    const handleMouseDown = (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        zoom: number
    ) => (e: MouseEvent) => {
        lastPoint.current = getCanvasXY(canvas, e, zoom);
        // Handling text comes here in Martyna's original code
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    };

    const handleMouseUp = (ctx: CanvasRenderingContext2D) => () => {
        ctx.closePath();
        lastPoint.current = null;
    };

    const handleMouseMove = (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        zoom: number
    ) => (e: MouseEvent) => {
        if (e.buttons !== 1) return; // Only proceed if the left mouse button is currently pressed

        const { mode, color, size } = configRef.current;
        if (mode !== "draw" && mode !== "erase") return;

        const current = getCanvasXY(canvas, e, zoom);
        if (!lastPoint.current) return; // Prevents drawing glitches when cursor re-enters canvas

        ctx.lineWidth = size;
        ctx.strokeStyle = mode === "erase" ? "#ffffff" : color;
        ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";

        ctx.lineTo(current.x, current.y);
        ctx.stroke();

        lastPoint.current = current;
    };

    // Handles all canvas interaction
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Lists event listeners & their callback functions
        const listeners: [keyof DocumentEventMap, EventListener][] = [
            ["mouseenter", handleMouseDown(canvas, ctx, zoom)],
            ["mousedown", handleMouseDown(canvas, ctx, zoom)],
            ["mousemove", handleMouseMove(canvas, ctx, zoom)],
            ["mouseup", handleMouseUp(ctx)],
            ["mouseleave", handleMouseUp(ctx)],
        ];

        // Applies all event listeners on mount
        for (const [event, handler] of listeners) {
            canvas.addEventListener(event, handler);
        }

        // Removes all event listeners on unmount
        return () => {
            for (const [event, handler] of listeners) {
                canvas.removeEventListener(event, handler);
            }
        };
    }, [canvasRef.current, zoom]);

    // ----- Component itself ----- //

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
            <main className="w-full bg-gray-300 pt-23 ps-10 overflow-auto grid place-items-center">
                {/* Canvas itself */}
                <canvas
                    ref={canvasRef}
                    style={{ scale: zoom + "%" }}
                    className="mb-10 me-10 bg-white duration-100"
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