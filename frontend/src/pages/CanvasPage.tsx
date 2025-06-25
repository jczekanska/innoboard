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
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

type Mode = "draw" | "erase" | "text" | "move";

interface DrawEvent {
  type: "draw" | "textAdd" | "textMove" | "textResize";
  payload: any;
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

interface Stroke {
  mode: Mode;
  color: string;
  size: number;
  path: { x: number; y: number }[];
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
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [contentImage, setContentImage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/canvases/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
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
        setTexts(content.texts || []);
        setStrokes(content.strokes || []);
        setContentImage(content.image || null);
        if (content.image && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d")!;
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
            ctx.drawImage(img, 0, 0);
            replayStrokes(ctx, content.strokes || []);
          };
          img.src = content.image;
        }
      })
      .catch(console.error);
    setIsDirty(false);
    setSelectedId(null);
  }, [id, token]);

  useEffect(() => {
    if (!token || !id) return;
    const ws = new WebSocket(`ws://localhost:8000/ws/canvas/${id}?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = ({ data }) => {
      const msg: DrawEvent = JSON.parse(data);

      if (msg.type === "draw") {
        const { x, y, color: c, size: s, mode: m } = msg.payload;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        ctx.lineWidth = s;
        ctx.strokeStyle = c;
        ctx.globalCompositeOperation =
          m === "erase" ? "destination-out" : "source-over";
        ctx.lineTo(x, y);
        ctx.stroke();
        setIsDirty(true);
      }

      if (msg.type === "textAdd") {
        setTexts((ts) => [...ts, msg.payload]);
        setIsDirty(true);
      }

      if (msg.type === "textMove" || msg.type === "textResize") {
        const updated = msg.payload;
        setTexts((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
        setIsDirty(true);
      }
    };
    ws.onerror = console.error;
    ws.onclose = () => console.log("WS closed");
    return () => ws.close();
  }, [id, token]);

  const replayStrokes = (ctx: CanvasRenderingContext2D, all: Stroke[]) => {
    all.forEach((st) => {
      ctx.beginPath();
      ctx.lineWidth = st.size;
      ctx.strokeStyle = st.color;
      ctx.globalCompositeOperation = st.mode === "erase" ? "destination-out" : "source-over";
      st.path.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let drawing = false;
    let currentStroke: Stroke | null = null;

    const toCoords = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
        setTexts((ts) => [...ts, box]);
        wsRef.current?.send(JSON.stringify({ type: "textAdd", payload: box }));
        setIsDirty(true);
        return;
      }

      if (mode === "draw" || mode === "erase") {
        drawing = true;
        currentStroke = { mode, color, size, path: [{ x, y }] };
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    };

    const handleMove = (e: MouseEvent) => {
      if (!drawing || !currentStroke) return;
      const { x, y } = toCoords(e);
      ctx.lineWidth = currentStroke.size;
      ctx.strokeStyle = currentStroke.color;
      ctx.globalCompositeOperation =
        currentStroke.mode === "erase" ? "destination-out" : "source-over";
      ctx.lineTo(x, y);
      ctx.stroke();
      currentStroke.path.push({ x, y });
      wsRef.current?.send(JSON.stringify({ type: "draw", payload: { x, y, mode, color, size } }));
      setIsDirty(true);
    };

    const handleUp = () => {
      if (drawing && currentStroke) {
        setStrokes((prev) => [...prev, currentStroke!]);
        currentStroke = null;
      }
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
  }, [mode, color, size]);

  const saveContent = () => {
    const image = canvasRef.current?.toDataURL() || contentImage;
    fetch(`/api/canvases/${id}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: { image, texts, strokes } }),
    }).catch(console.error);
    setContentImage(image);
    setIsDirty(false);
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
    try {
      const resp = await fetch(`/api/canvases/${id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invitee_email: email }),
      });
      const { token: inviteToken } = await resp.json();
      const link = `${window.location.origin}/join/${inviteToken}`;
      await navigator.clipboard.writeText(link);
      alert(`Invite link copied:\n${link}`);
    } catch (err: any) {
      alert(err.message || "Invite error");
    }
  };

  const deleteBox = (boxId: string) => {
    const nt = texts.filter((t) => t.id !== boxId);
    setTexts(nt);
    setIsDirty(true);
  };

  const handleDashboard = () => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return;
    navigate("/dashboard");
  };

  const handleStyles: ResizeHandleStyles = {
    top: { height: 10, top: -5, cursor: "ns-resize" },
    bottom: { height: 10, bottom: -5, cursor: "ns-resize" },
    left: { width: 10, left: -5, cursor: "ew-resize" },
    right: { width: 10, right: -5, cursor: "ew-resize" },
    topLeft: { width: 10, height: 10, left: -5, top: -5, cursor: "nwse-resize" },
    topRight: { width: 10, height: 10, right: -5, top: -5, cursor: "nesw-resize" },
    bottomLeft: { width: 10, height: 10, left: -5, bottom: -5, cursor: "nesw-resize" },
    bottomRight: { width: 10, height: 10, right: -5, bottom: -5, cursor: "nwse-resize" },
  };

  return (
    <Card className="max-w-4xl mx-auto mt-10">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>{canvasInfo?.name}</CardTitle>
        <div className="flex space-x-2">
          <Button onClick={saveContent}>Save</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>🔗 Share</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite someone</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <Input name="email" type="email" required placeholder="friend@example.com" />
                <DialogFooter>
                  <Button type="submit">Send Invite</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" onClick={handleDashboard}>
            Dashboard
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="canvas-toolbar space-x-2 mb-4">
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <Input
            type="range"
            min={1}
            max={50}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          {(["draw", "erase", "text", "move"] as Mode[]).map((m) => (
            <Button key={m} variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
              {m === "draw" ? "✏️ Draw" : m === "erase" ? "🧽 Erase" : m === "text" ? "🔤 Text" : "📦 Move"}
            </Button>
          ))}
        </div>

        <div className="canvas-frame relative">
          <canvas ref={canvasRef} width={830} height={600} className="border" />
          {texts.map((box) => (
            <Rnd
              key={box.id}
              size={{ width: box.width, height: box.height }}
              position={{ x: box.x, y: box.y }}
              bounds="parent"
              disableDragging={mode !== "move"}
              enableResizing={mode === "move"}
              style={{ pointerEvents: mode === "move" ? "auto" : "none" }}
              resizeHandleStyles={mode === "move" ? handleStyles : {}}
              onDragStop={(_, d) => {
                const updated = { ...box, x: d.x, y: d.y };
                setTexts((ts) => ts.map((t) => (t.id === box.id ? updated : t)));
                wsRef.current?.send(JSON.stringify({ type: "textMove", payload: updated }));
                setIsDirty(true);
              }}
              onResizeStop={(_, __, ref, ___, d) => {
                const updated = {
                  ...box,
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  x: d.x,
                  y: d.y,
                };
                setTexts((ts) => ts.map((t) => (t.id === box.id ? updated : t)));
                wsRef.current?.send(JSON.stringify({ type: "textResize", payload: updated }));
                setIsDirty(true);
              }}
              onClick={() => setSelectedId(box.id)}
            >
              <div className="text-box bg-white border w-full h-full relative">
                <textarea
                  value={box.text}
                  readOnly={mode !== "move"}
                  maxLength={2000}
                  onChange={(e) => {
                    setTexts((ts) =>
                      ts.map((b) => (b.id === box.id ? { ...b, text: e.target.value } : b))
                    );
                    setIsDirty(true);
                  }}
                  onBlur={saveContent}
                  className="w-full h-full resize-none p-1"
                  style={{ color: box.color }}
                />
                {mode === "move" && selectedId === box.id && (
                  <button
                    className="absolute top-0 right-0 m-1"
                    onClick={() => deleteBox(box.id)}
                  >
                    ❌
                  </button>
                )}
              </div>
            </Rnd>
          ))}
        </div>
      </CardContent>

      <CardFooter className="justify-end">
        {isDirty && <span className="text-red-500">Unsaved changes</span>}
      </CardFooter>
    </Card>
  );
};

export default CanvasPage;
