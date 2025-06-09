import React, {
  useRef,
  useState,
  useEffect,
  MouseEvent,
  ChangeEvent,
  useContext,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Rnd } from "react-rnd";
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

type Mode = "draw" | "erase" | "text";
interface DrawEvent {
  x: number;
  y: number;
  mode: Mode;
  color: string;
  size: number;
  text?: string;
}
interface TextBox {
  // what is this id and why is it necessary?
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

const CanvasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const wsRef = useRef<WebSocket>();

  const [canvasInfo, setCanvasInfo] = useState<{ name: string } | null>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [color, setColor] = useState<string>("#000000");
  const [size, setSize] = useState<number>(4);
  const [texts, setTexts] = useState<TextBox[]>([]);
  const [contentImage, setContentImage] = useState<string | null>(null);

  // useEffect(() => {
  //   if (!token || !id) return;
  //   fetch(`/api/canvases/${id}`, {
  //     headers: { Authorization: `Bearer ${token}` },
  //   })
  //     .then((r) => (r.ok ? r.json() : Promise.reject()))
  //     .then(setCanvasInfo)
  //     .catch(() => navigate("/dashboard"));
  // }, [id, token, navigate]);

  // useEffect(() => {
  //   if (!token || !id) return;
  //   fetch(`/api/canvases/${id}/data`, {
  //     headers: { Authorization: `Bearer ${token}` },
  //   })
  //     .then((r) => r.json())
  //     .then(({ content }) => {
  //       setContentImage(content.image || null);
  //       setTexts(content.texts || []);
  //       if (content.image && canvasRef.current) {
  //         const ctx = canvasRef.current.getContext("2d")!;
  //         const img = new Image();
  //         img.onload = () => ctx.drawImage(img, 0, 0);
  //         img.src = content.image;
  //       }
  //     })
  //     .catch(console.error);
  // }, [id, token]);

  // useEffect(() => {
  //   if (!token || !id) return;
  //   const ws = new WebSocket(
  //     `ws://localhost:8000/ws/canvas/${id}?token=${token}`
  //   );
  //   wsRef.current = ws;
  //   ws.onmessage = ({ data }) => {
  //     const evt = JSON.parse(data) as DrawEvent;
  //     const { x, y, mode, color: c, size: s, text } = evt;
  //     const ctx = canvasRef.current?.getContext("2d");
  //     if (!ctx) return;

  //     ctx.lineWidth = s;
  //     ctx.strokeStyle = c;
  //     ctx.fillStyle = c;
  //     ctx.globalCompositeOperation =
  //       mode === "erase" ? "destination-out" : "source-over";

  //     if (mode === "text" && text) {
  //       ctx.font = `${s * 4}px sans-serif`;
  //       ctx.fillText(text, x, y);
  //     } else if (mode !== "text") {
  //       ctx.lineTo(x, y);
  //       ctx.stroke();
  //     }
  //   };
  //   ws.onerror = console.error;
  //   ws.onclose = () => console.log("WS closed");
  //   return () => ws.close();
  // }, [id, token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let drawing = false;

    const toCoords = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const handleDown = (e: MouseEvent) => {
      const { x, y } = toCoords(e);
      if (mode === "text") {
        const input = prompt("Enter text (max 2000 chars):")?.slice(0, 2000);
        if (!input) return;
        const id = crypto.randomUUID();
        const box: TextBox = { id, x, y, width: 150, height: 50, text: input };
        const nt = [...texts, box];
        setTexts(nt);
        saveContent(nt);
        return;
      }
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
      const evt: DrawEvent = { x, y, mode, color, size };
      wsRef.current?.send(JSON.stringify(evt));
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
      canvas.removeEventListener("mousedown", handleDown as any);
      canvas.removeEventListener("mousemove", handleMove as any);
      canvas.removeEventListener("mouseup", handleUp as any);
      canvas.removeEventListener("mouseleave", handleUp as any);
    };
  }, [mode, color, size, texts]);

  const saveContent = (newTexts: TextBox[] = texts) => {
    const image = canvasRef.current?.toDataURL() || contentImage;
    fetch(`/api/canvases/${id}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: { image, texts: newTexts } }),
    }).catch(console.error);
    setContentImage(image);
  };

  const deleteBox = (boxId: string) => {
    const nt = texts.filter((t) => t.id !== boxId);
    setTexts(nt);
    saveContent(nt);
  };

  return (
    <Card className="max-w-4xl mx-auto mt-10">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{canvasInfo?.name}</CardTitle>
        <div className="flex space-x-2">
          <Button onClick={() => saveContent()}>Save</Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="canvas-toolbar">
          <Input
            type="color"
            value={color}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setColor(e.target.value)
            }
          />
          <Input
            type="range"
            min={1}
            max={50}
            value={size}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSize(Number(e.target.value))
            }
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
        </div>

        <div className="caxnvas-frame">
          <div className="canvas-inner-frame">
            <canvas ref={canvasRef} width={830} height={600} />
          </div>

          {texts.map((box) => (
            <Rnd
              key={box.id}
              size={{ width: box.width, height: box.height }}
              position={{ x: box.x, y: box.y }}
              bounds="parent"
              onDragStop={(_, d) => {
                const nt = texts.map((t) =>
                  t.id === box.id ? { ...t, x: d.x, y: d.y } : t
                );
                setTexts(nt);
                saveContent(nt);
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
                saveContent(nt);
              }}
            >
              <div className="text-box">
                <textarea
                  value={box.text}
                  maxLength={2000}
                  onChange={(e) => {
                    const newText = e.target.value.slice(0, 2000);
                    setTexts((ts) =>
                      ts.map((t) =>
                        t.id === box.id ? { ...t, text: newText } : t
                      )
                    );
                  }}
                  onBlur={() => saveContent()}
                  style={{ color }}
                />
                <button
                  className="delete-btn"
                  onClick={() => deleteBox(box.id)}
                >
                  {/* meu amigo que porra eh essa */}
                  ❌
                </button>
              </div>
            </Rnd>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CanvasPage;
