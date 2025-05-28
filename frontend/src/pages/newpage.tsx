import React, { useState, useRef, useEffect, useContext } from "react"
import { AuthContext } from "@/context/AuthContext"
import { useNavigate, useParams } from "react-router-dom"
import Header from "@/components/canvasPage/Header"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import Toolbar from "@/components/canvasPage/Toolbar"
import ToolsPanel from "@/components/canvasPage/ToolsPanel"

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

export type Mode = "select" | "draw" | "text" | "erase" | "image" | "audio" | "location"



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

    const { state, dispatch } = useCanvasSettings()



    // ----- Canvas Functionalities ----- //

    const [texts, setTexts] = useState<TextBox[]>([]);

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

    // I'll add this for the text boxes
    const handleMouseClick = () => {
        // if (mode !== "text") return
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
        lastPoint.current = null;
    };

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
    }, [canvasRef.current, state.zoom]);

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
                    {/* Canvas itself */}
                    <canvas
                        ref={canvasRef}
                        style={{ scale: state.zoom + "%" }}
                        className="mb-10 me-10 bg-white duration-100"
                    />
                </main>
                {/* Additional Tools Panel */}
                <ToolsPanel />
            </div>
        </div>

    )
}

export default CanvasPage