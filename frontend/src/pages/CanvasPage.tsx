import React, { useEffect, useState, useContext, useRef, useCallback, MouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import type { Canvas as CanvasMeta } from '../../types';

interface DrawEvent {
  x: number;
  y: number;
}

const CanvasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket>();
  const [canvasInfo, setCanvasInfo] = useState<CanvasMeta | null>(null);

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
      const { x, y } = JSON.parse(evt.data) as DrawEvent;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
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
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };
    const draw = (e: MouseEvent) => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      wsRef.current?.send(
        JSON.stringify({ x: e.offsetX, y: e.offsetY } as DrawEvent)
      );
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
  }, []);

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
        <button onClick={handleSave} className="px-2 py-1 bg-blue-500 text-white rounded">
          Save
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-2 py-1 bg-blue-500 text-white rounded"
        >
          Dashboard
        </button>
      </header>
      <main className="flex-1">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="bg-white border mx-auto my-4"
        />
      </main>
    </div>
  );
};

export default CanvasPage;