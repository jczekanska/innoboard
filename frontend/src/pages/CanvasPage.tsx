import React, { useState, useRef, useEffect, useContext } from "react"
import { AuthContext } from "@/context/AuthContext"
import { useNavigate, useParams } from "react-router-dom"
import Header from "@/components/canvasPage/Header"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import Toolbar from "@/components/canvasPage/Toolbar"
import ToolsPanel from "@/components/canvasPage/ToolsPanel"
import { CanvasObject, Mode } from "@/types/canvas"
import { OverlayObject } from "@/components/canvasPage/OverlayObject"

interface DrawEvent {
    x: number;
    y: number;
    mode: Mode
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

const CanvasPage: React.FC = () => {

    // General
    const navigate = useNavigate();

    // Authorization
    const { token } = useContext(AuthContext);
    const { id } = useParams<{ id: string }>();
    const [canvasInfo, setCanvasInfo] = useState<{ name: string } | null>(null);

    // we need to set up a way to get canvas dimensions from the db
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

    const { state, dispatch } = useCanvasSettings()
    console.log(state)

    // ----- Canvas Functionalities ----- //

    const [texts, setTexts] = useState<TextBox[]>([]);

    const [objects, setObjects] = useState<CanvasObject[]>([])

    console.log(objects)

    const canvasRef = useRef<HTMLCanvasElement>(null);
    // const socketRef = useRef<WebSocket>();

    // Keeps track of the last cursor position to avoid unexpected jumps
    // when the pointer leaves and re-enters the canvas during drawing.
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

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

    // I'll add this for the text boxes & whatnot
    const handleMouseClick = (canvas: HTMLCanvasElement, mode: Mode) => (e: MouseEvent) => {
        const { x, y } = getCanvasXY(canvas, e, state.zoom);
        switch (mode) {
            case "text":
                break;
            case "audio":
                setObjects(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        x,
                        y,
                        type: "audio",
                        url: "path", // placeholder
                        width: 60,  // placeholder
                        height: 60,
                    },
                ]);
                break;
            case "image":
            case "image": {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";

                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) {
                        console.log("No image selected");
                        return;
                    }

                    const url = URL.createObjectURL(file);
                    const img = new Image();

                    img.onload = () => {
                        // UX: if the image is larger than 50% of the canvas area,
                        // scale it down to fit within that limit (initially only — user can resize later)
                        const imgWidth = img.width;
                        const imgHeight = img.height;
                        const imgArea = imgWidth * imgHeight;

                        const canvas = canvasRef.current!;
                        const maxArea = canvas.width * canvas.height * 0.5;

                        let width = imgWidth;
                        let height = imgHeight;

                        if (imgArea > maxArea) {
                            const scaleFactor = Math.sqrt(maxArea / imgArea);
                            width = imgWidth * scaleFactor;
                            height = imgHeight * scaleFactor;
                        }


                        setObjects(prev => [
                            ...prev,
                            {
                                id: crypto.randomUUID(),
                                x,
                                y,
                                type: "image",
                                src: url,
                                width,
                                height,
                                rotation: 0,
                            },
                        ]);
                    };

                    img.onerror = () => {
                        console.error("Failed to load image");
                    };

                    img.src = url;
                };

                input.click();
                break;
            }

            case "location":
                setObjects(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        x,
                        y,
                        type: "location",
                        label: "place", // placeholder
                        width: 80,  // placeholder
                        height: 80,
                    },
                ]);
                break;
            default:
                // do nothing?
                break;
        }
        console.log(lastPoint.current)
    }

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
    };

    // Prevents drawing glitches when cursor re-enters canvas
    const handleMouseLeave = () => () => {
        lastPoint.current = null;
    }

    const handleMouseMove = (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        zoom: number
    ) => (e: MouseEvent) => {
        if (e.buttons !== 1) return; // Only proceed if the left mouse button is currently pressed

        if (state.mode !== "draw" && state.mode !== "erase") return;

        const current = getCanvasXY(canvas, e, zoom);
        if (!lastPoint.current) return; // Prevents drawing glitches when cursor re-enters canvas

        ctx.lineWidth = state.size;
        ctx.strokeStyle = state.mode === "erase" ? "#ffffff" : state.color;
        ctx.globalCompositeOperation = state.mode === "erase" ? "destination-out" : "source-over";

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
            ["mouseenter", handleMouseDown(canvas, ctx, state.zoom)],
            ["mousedown", handleMouseDown(canvas, ctx, state.zoom)],
            ["mousemove", handleMouseMove(canvas, ctx, state.zoom)],
            ["mouseup", handleMouseUp(ctx)],
            ["mouseleave", handleMouseLeave()],
            ["click", handleMouseClick(canvas, state.mode)]
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
    }, [state.color, state.fontFamily, state.fontSize, state.mode, state.size]);

    function updateOverlayPosition(id: string, x: number, y: number) {
        setObjects(prevObjects =>
            prevObjects.map(obj =>
                obj.id === id ? { ...obj, x, y } : obj
            )
        );
    }

    function updateOverlayRotation(id: string, rotation: number) {
        setObjects(prevObjects =>
            prevObjects.map(obj =>
                obj.id === id ? { ...obj, rotation } : obj
            )
        );
    }

    function updateOverlayDimension(id: string, width: number, height: number) {
        setObjects(prevObjects =>
            prevObjects.map(obj =>
                obj.id === id ? { ...obj, width, height } : obj
            )
        );
    }

    // ----- Component itself ----- //

    return (

        <div className="flex bg-gray-300 w-screen h-screen flex-col">
            {/* Top Bar */}
            <Header />
            <div className="flex h-screen">
                {/* Toolbar */}
                <Toolbar />
                {/* Canvas Area */}
                <main className="w-full bg-gray-300 pt-23 ps-10 overflow-auto grid place-items-center">
                    <div className="relative mb-10 me-10">
                        {/* Canvas itself */}
                        <canvas
                            ref={canvasRef}
                            style={{ scale: state.zoom + "%" }}
                            className="bg-white duration-100"
                        />
                        {/* Overlayed Objects */}
                        {/* ... */}
                        {objects.map(obj => (
                            <OverlayObject
                                obj={obj}
                                updateOverlayPosition={updateOverlayPosition}
                                updateOverlayRotation={updateOverlayRotation}
                                updateOverlayDimension={updateOverlayDimension}
                                canvasWidth={canvasRef.current.width}
                                canvasHeight={canvasRef.current.height}
                            />
                        ))}
                    </div>
                </main>
                {/* Additional Tools Panel */}
                <ToolsPanel />
            </div>
        </div>

    )
}

export default CanvasPage