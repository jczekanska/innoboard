import React, {
  useEffect,
  useRef,
  useState,
  MouseEvent,
  useContext,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { AuthContext } from '../context/AuthContext';
import type { Canvas as CanvasMeta } from '../../types';

type Mode = 'draw' | 'erase' | 'text';
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

const CanvasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket>();
  const [canvasInfo, setCanvasInfo] = useState<CanvasMeta | null>(null);

  // Toolbar state
  const [mode, setMode] = useState<Mode>('draw');
  const [color, setColor] = useState<string>('#000000');
  const [size, setSize] = useState<number>(4);

  // Text boxes state
  const [texts, setTexts] = useState<TextBox[]>([]);
  const [contentImage, setContentImage] = useState<string | null>(null);

  // Load metadata
  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/canvases/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(setCanvasInfo)
      .catch(() => navigate('/dashboard'));
  }, [id, token, navigate]);

  // Load existing content (image + texts)
  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/canvases/${id}/data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(({ content }) => {
        setContentImage(content.image || null);
        setTexts(content.texts || []);
        if (content.image && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d')!;
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = content.image;
        }
      })
      .catch(console.error);
  }, [id, token]);

  // WebSocket for real‐time drawing & erasing
  useEffect(() => {
    if (!token || !id) return;
    const ws = new WebSocket(`ws://localhost:8000/ws/canvas/${id}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => console.log('WS connected');
    ws.onmessage = ({ data }) => {
      const evt = JSON.parse(data) as DrawEvent;
      const { x, y, mode, color, size, text } = evt;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.lineWidth = size;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';

      if (mode === 'text' && text) {
        ctx.font = `${size * 4}px sans-serif`;
        ctx.fillText(text, x, y);
      } else if (mode !== 'text') {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    };
    ws.onerror = console.error;
    ws.onclose = () => console.log('WS disconnected');
    return () => ws.close();
  }, [id, token]);

  // Draw / erase / text placement handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let drawing = false;

    const toCanvasCoords = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start = (e: MouseEvent) => {
      const { x, y } = toCanvasCoords(e);
      if (mode === 'text') {
        const input = prompt('Enter text (max 2000 chars):')?.slice(0, 2000);
        if (!input) return;
        // create new text box
        const id = crypto.randomUUID();
        const box: TextBox = { id, x, y, width: 150, height: 50, text: input };
        const updated = [...texts, box];
        setTexts(updated);
        saveContent(updated);
        return;
      }
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent) => {
      if (!drawing) return;
      const { x, y } = toCanvasCoords(e);
      ctx.lineWidth = size;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
      ctx.lineTo(x, y);
      ctx.stroke();
      const evt: DrawEvent = { x, y, mode, color, size };
      wsRef.current?.send(JSON.stringify(evt));
    };

    const end = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', start as any);
    canvas.addEventListener('mousemove', draw as any);
    canvas.addEventListener('mouseup', end as any);
    canvas.addEventListener('mouseleave', end as any);

    return () => {
      canvas.removeEventListener('mousedown', start as any);
      canvas.removeEventListener('mousemove', draw as any);
      canvas.removeEventListener('mouseup', end as any);
      canvas.removeEventListener('mouseleave', end as any);
    };
  }, [mode, color, size, texts]);

  // Save entire content snapshot (image + texts)
  const saveContent = (newTexts: TextBox[] = texts) => {
    const image = canvasRef.current?.toDataURL() || contentImage;
    const payload = { image, texts: newTexts };
    fetch(`/api/canvases/${id}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: payload }),
    }).catch(console.error);
    setContentImage(image as string);
  };

  // Remove a text box
  const deleteBox = (boxId: string) => {
    const updated = texts.filter((t) => t.id !== boxId);
    setTexts(updated);
    saveContent(updated);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 bg-pale-rose border-b flex items-center gap-4">
        <h1 className="text-xl text-deep-pink">{canvasInfo?.name}</h1>
        <button onClick={() => saveContent()} className="btn">Save</button>
        <button onClick={() => navigate('/dashboard')} className="btn">Dashboard</button>
      </header>

      {/* Toolbar */}
      <div className="canvas-toolbar">
        <label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label>
          <input
            type="range"
            min={1}
            max={50}
            value={size}
            onChange={(e) => setSize(+e.target.value)}
          />
        </label>
        <button
          onClick={() => setMode('draw')}
          className={mode === 'draw' ? 'active' : ''}
        >
          ✏️ Draw
        </button>
        <button
          onClick={() => setMode('erase')}
          className={mode === 'erase' ? 'active' : ''}
        >
          🧽 Erase
        </button>
        <button
          onClick={() => setMode('text')}
          className={mode === 'text' ? 'active' : ''}
        >
          🔤 Text
        </button>
      </div>

      {/* Canvas + Text Boxes */}
      <main className="canvas-page">
        <div className="canvas-frame">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
          />
          {texts.map((box) => (
            <Rnd
              key={box.id}
              size={{ width: box.width, height: box.height }}
              position={{ x: box.x, y: box.y }}
              bounds="parent"
              onDragStop={(_, d) => {
                const updated = texts.map((t) =>
                  t.id === box.id ? { ...t, x: d.x, y: d.y } : t
                );
                setTexts(updated);
                saveContent(updated);
              }}
              onResizeStop={(_, __, ref, ___, d) => {
                const updated = texts.map((t) =>
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
                setTexts(updated);
                saveContent(updated);
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
                  style={{color: color}}
                />
                <button className="delete-btn" onClick={() => deleteBox(box.id)}>
                  ❌
                </button>
              </div>
            </Rnd>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CanvasPage;
