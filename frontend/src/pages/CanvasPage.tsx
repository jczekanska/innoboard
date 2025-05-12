import React, { useEffect, useState, useContext, useRef, useCallback, MouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const CanvasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket>();
  const [canvasInfo, setCanvasInfo] = useState<CanvasMeta | null>(null);

  const [mode, setMode] = useState<Mode>('draw');
  const [color, setColor] = useState<string>('#000000');
  const [size, setSize] = useState<number>(4);

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
      .catch((err) => {
        console.error(err);
        navigate('/dashboard');
      });
  }, [id, token, navigate]);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/canvases/${id}/data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load canvas data');
        return res.json();
      })
      .then(({ content }) => {
        if (content.image) {
          const ctx = canvasRef.current?.getContext('2d');
          const img = new Image();
          img.onload = () => ctx?.drawImage(img, 0, 0);
          img.src = content.image;
        }
      })
      .catch(console.error);
  }, [id, token]);

  useEffect(() => {
    if (!token || !id) return;
    const ws = new WebSocket(
      `ws://localhost:8000/ws/canvas/${id}?token=${token}`
    );
    wsRef.current = ws;
    ws.onopen = () => console.log('WS connected');
    ws.onmessage = (evt) => {
      const evtData = JSON.parse(evt.data) as DrawEvent;
      const { x, y, mode, color, size, text } = evtData;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.lineWidth = size;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      if (mode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drawing = false;

    const start = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (mode === 'text') {
        const input = prompt('Enter text:');
        if (!input) return;
        const evt: DrawEvent = { x, y, mode, color, size, text: input };
        wsRef.current?.send(JSON.stringify(evt));
        // also draw locally:
        ctx.font = `${size * 4}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(input, x, y);
        return;
      }

      drawing = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // set style
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

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
    };
  }, [mode, color, size]);

  const handleSave = () => {
    if (!token || !id) return;
    const image = canvasRef.current?.toDataURL();
    fetch(`/api/canvases/${id}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: { image } }),
    }).catch(console.error);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 bg-gray-100 border-b flex items-center space-x-4">
        <h1 className="text-xl">{canvasInfo?.name || 'Loading…'}</h1>
        <button
          onClick={handleSave}
          className="px-2 py-1 bg-blue-500 text-white rounded"
        >
          Save
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-2 py-1 bg-blue-500 text-white rounded"
        >
          Dashboard
        </button>
      </header>

      {/* Toolbar */}
      <div className="canvas-toolbar">
        <label>
          Color:{' '}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>

        <label>
          Size:{' '}
          <input
            type="range"
            min={1}
            max={50}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
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

      {/* Canvas with frame */}
      <main className="canvas-page">
        <div className="canvas-frame">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
          />
        </div>
      </main>
    </div>
  );
};

export default CanvasPage;