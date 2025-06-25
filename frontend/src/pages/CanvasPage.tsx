import React, {
  useRef,
  useState,
  useEffect,
  MouseEvent,
  ChangeEvent,
  useContext,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Rnd, ResizeHandleStyles } from "react-rnd";
import { AuthContext } from "../context/AuthContext";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

type Mode = "draw" | "erase" | "text" | "move";
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
  color: string;
}

const CanvasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket>();

  const [canvasInfo, setCanvasInfo] = useState<{ name: string } | null>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [color, setColor] = useState<string>("#000000");
  const [size, setSize] = useState<number>(4);
  const [texts, setTexts] = useState<TextBox[]>([]);
  const [contentImage, setContentImage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/canvases/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCanvasInfo)
      .catch(() => navigate("/dashboard"));
  }, [id, token, navigate]);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/canvases/${id}/data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(({ content }) => {
        setContentImage(content.image || null);
        setTexts(content.texts || []);
        if (content.image && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d")!;
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = content.image;
        }
      })
      .catch(console.error);
    setIsDirty(false);
    setSelectedId(null);
  }, [id, token]);

  useEffect(() => {
    if (!token || !id) return;
    const ws = new WebSocket(
      `ws://localhost:8000/ws/canvas/${id}?token=${token}`
    );
    wsRef.current = ws;
    ws.onmessage = ({ data }) => {
      const evt = JSON.parse(data) as DrawEvent;
      const { x, y, mode, color: c, size: s, text } = evt;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      ctx.lineWidth = s;
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
      ctx.globalCompositeOperation =
        mode === "erase" ? "destination-out" : "source-over";

      if (mode === "text" && text) {
        ctx.font = `${s * 4}px sans-serif`;
        ctx.fillText(text, x, y);
      } else if (mode !== "text") {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      setIsDirty(true);
    };
    ws.onerror = console.error;
    ws.onclose = () => console.log("WS closed");
    return () => ws.close();
  }, [id, token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let drawing = false;

    const clearSelection = () => setSelectedId(null);
    canvas.addEventListener("mousedown", clearSelection);

    const toCoords = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const handleDown = (e: MouseEvent) => {
      const { x, y } = toCoords(e);
      if (mode === "text") {
        const txt = prompt("Enter text (max 2000 chars):")?.slice(0, 2000);
        if (!txt) return;
        const box: TextBox = {
          id: crypto.randomUUID(),
          x,
          y,
          width: 150,
          height: 50,
          text: txt,
          color,
        };
        const nt = [...texts, box];
        setTexts(nt);
        save(nt);
        return;
      }
      if (mode !== "draw" && mode !== "erase") return;
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleMove = (e: MouseEvent) => {
      if (!drawing) return;
      const { x, y } = toCoords(e);
      ctx.lineWidth = size;
      ctx.strokeStyle = mode === "erase" ? "#ffffff" : color;
      ctx.globalCompositeOperation =
        mode === "erase" ? "destination-out" : "source-over";
      ctx.lineTo(x, y);
      ctx.stroke();
      wsRef.current!.send(
        JSON.stringify({ x, y, mode, color, size } as DrawEvent)
      );
      setIsDirty(true);
    };

    const handleUp = () => {
      drawing = false;
      ctx.closePath();
    };

    canvas.addEventListener("mousedown", handleDown as any);
    canvas.addEventListener("mousemove", handleMove as any);
    canvas.addEventListener("mouseup", handleUp as any);
    canvas.addEventListener("mouseleave", handleUp as any);
    return () => {
      canvas.removeEventListener("mousedown", clearSelection);
      canvas.removeEventListener("mousedown", handleDown as any);
      canvas.removeEventListener("mousemove", handleMove as any);
      canvas.removeEventListener("mouseup", handleUp as any);
      canvas.removeEventListener("mouseleave", handleUp as any);
    };
  }, [mode, color, size, texts]);

  const save = (nt: TextBox[] = texts) => {
    const img = canvasRef.current?.toDataURL() || contentImage;
    fetch(`/api/canvases/${id}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: { image: img, texts: nt } }),
    }).catch(console.error);
    setContentImage(img);
    setIsDirty(false);
  };

  const deleteBox = (boxId: string) => {
    const nt = texts.filter((t) => t.id !== boxId);
    setTexts(nt);
    save(nt);
  };
  const goDash = () => {
    if (isDirty && !window.confirm("Unsaved changes – discard?")) return;
    navigate("/dashboard");
  };

  const handleStyles: ResizeHandleStyles = {
    top:    { height: 10, top: -5, cursor: "ns-resize" },
    bottom: { height: 10, bottom: -5, cursor: "ns-resize" },
    left:   { width: 10, left: -5, cursor: "ew-resize" },
    right:  { width: 10, right: -5, cursor: "ew-resize" },
    topLeft:     { width: 10, height: 10, left: -5, top: -5, cursor: "nwse-resize" },
    topRight:    { width: 10, height: 10, right: -5, top: -5, cursor: "nesw-resize" },
    bottomLeft:  { width: 10, height: 10, left: -5, bottom: -5, cursor: "nesw-resize" },
    bottomRight: { width: 10, height: 10, right: -5, bottom: -5, cursor: "nwse-resize" },
  };

  return (
    <Card className="max-w-4xl mx-auto mt-10">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>{canvasInfo?.name}</CardTitle>
        <div className="flex space-x-2">
          <Button onClick={() => save()}>Save</Button>
          <Button variant="ghost" onClick={goDash}>
            Dashboard
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="canvas-toolbar">
          <Input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <Input
            type="range"
            min={1}
            max={50}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <Button
            variant={mode === "draw" ? "default" : "outline"}
            onClick={() => setMode("draw")}
          >
            ✏️ Draw
          </Button>
          <Button
            variant={mode === "erase" ? "default" : "outline"}
            onClick={() => setMode("erase")}
          >
            🧽 Erase
          </Button>
          <Button
            variant={mode === "text" ? "default" : "outline"}
            onClick={() => setMode("text")}
          >
            🔤 Text
          </Button>
          <Button
            variant={mode === "move" ? "default" : "outline"}
            onClick={() => setMode("move")}
          >
            📦 Move
          </Button>
        </div>

        <div className="canvas-frame">
          <div className="canvas-inner-frame">
            <canvas ref={canvasRef} width={830} height={600} />
          </div>

          {texts.map((box) => (
            <Rnd
              key={box.id}
              size={{ width: box.width, height: box.height }}
              position={{ x: box.x, y: box.y }}
              bounds="parent"
              style={{ pointerEvents: mode === "move" ? "auto" : "none" }}
              disableDragging={mode !== "move"}
              enableResizing={mode === "move"}
              resizeHandleStyles={
                mode === "move" ? handleStyles : {}
              }
              onDragStop={(_, d) => {
                const nt = texts.map((t) =>
                  t.id === box.id ? { ...t, x: d.x, y: d.y } : t
                );
                setTexts(nt);
                setIsDirty(true);
              }}
              onResizeStop={(_, __, ref, ___, d) => {
                const nt = texts.map((t) =>
                  t.id === box.id
                    ? {
                        ...t,
                        width: parseInt(ref.style.width),
                        height: parseInt(ref.style.height),
                        x: d.x,
                        y: d.y,
                      }
                    : t
                );
                setTexts(nt);
                setIsDirty(true);
              }}
              onClick={() => setSelectedId(box.id)}
            >
              <div className="text-box" style={{ width: "100%", height: "100%" }}>
                <textarea
                  value={box.text}
                  maxLength={2000}
                  readOnly={mode !== "move"}
                  onChange={(e) => {
                    const t = e.target.value.slice(0, 2000);
                    setTexts((ts) =>
                      ts.map((x) => (x.id === box.id ? { ...x, text: t } : x))
                    );
                    setIsDirty(true);
                  }}
                  onBlur={() => save()}
                  style={{
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    border: mode === "move" ? undefined : "none",
                    background: mode === "move" ? undefined : "transparent",
                    color: box.color,
                    resize: "none",
                  }}
                />
                {mode === "move" && selectedId === box.id && (
                  <button
                    className="delete-btn"
                    onClick={() => {
                      deleteBox(box.id);
                      setSelectedId(null);
                    }}
                  >
                    ❌
                  </button>
                )}
              </div>
            </Rnd>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">{/*…*/}</CardFooter>
    </Card>
  );
};

export default CanvasPage;
