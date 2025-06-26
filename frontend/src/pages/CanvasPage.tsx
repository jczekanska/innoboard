import React, {
  useRef,
  useState,
  useEffect,
  MouseEvent,
  useContext,
  ReactNode,
} from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Rnd, ResizeHandleStyles } from "react-rnd"

import { AuthContext } from "@/context/AuthContext"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import { createApiCall } from "@/lib/api"

import Header from "@/components/canvasPage/Header"
import Toolbar, { ToolbarProps } from "@/components/canvasPage/Toolbar"
import ToolsPanel from "@/components/canvasPage/ToolsPanel"
import { LocationPicker } from "@/components/canvasPage/LocationPicker"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Mode = "draw" | "erase" | "text" | "move" | "select"

interface TextBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
}

interface Stroke {
  mode: Mode
  color: string
  size: number
  path: { x: number; y: number }[]
}

function linkifyText(text: string): ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-600"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

const CanvasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token, logout } = useContext(AuthContext)
  const apiCall = createApiCall({ token, logout })

  const { state, dispatch } = useCanvasSettings()
  const { mode, color, size, zoom } = state

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket>()
  const [canvasInfo, setCanvasInfo] = useState<{ name: string } | null>(null)
  const [texts, setTexts] = useState<TextBox[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  useEffect(() => {
    if (!token || !id) return
    apiCall(`/api/canvases/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCanvasInfo)
      .catch(() => navigate("/dashboard"))
  }, [id, token, navigate])

  useEffect(() => {
    if (!token || !id) return
    apiCall(`/api/canvases/${id}/data`)
      .then((r) => r.json())
      .then(({ content }) => {
        setTexts(content.texts || [])
        setStrokes(content.strokes || [])
        if (content.image && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d")!
          const img = new Image()
          img.onload = () => {
            ctx.clearRect(0, 0, 800, 600)
            ctx.drawImage(img, 0, 0)
            replayStrokes(ctx, content.strokes || [])
          }
          img.src = content.image
        }
      })
      .catch(console.error)
    setIsDirty(false)
  }, [id, token])

  useEffect(() => {
    if (!token || !id) return
    const ws = new WebSocket(
      `ws://localhost:8000/ws/canvas/${id}?token=${token}`
    )
    wsRef.current = ws
    ws.onmessage = ({ data }) => handleRemote(JSON.parse(data))
    return () => ws.close()
  }, [id, token])

  function handleRemote(msg: any) {
    const ctx = canvasRef.current?.getContext("2d")
    if (msg.type === "draw" && ctx) {
      const { x, y, color: c, size: s, mode: m } = msg.payload
      ctx.lineWidth = s
      ctx.strokeStyle = c
      ctx.globalCompositeOperation =
        m === "erase" ? "destination-out" : "source-over"
      ctx.lineTo(x, y)
      ctx.stroke()
      setIsDirty(true)
    }
    if (msg.type === "textAdd") {
      setTexts((ts) => [...ts, msg.payload])
      setIsDirty(true)
    }
    if (msg.type === "textMove" || msg.type === "textResize") {
      setTexts((ts) =>
        ts.map((t) => (t.id === msg.payload.id ? msg.payload : t))
      )
      setIsDirty(true)
    }
  }

  function replayStrokes(ctx: CanvasRenderingContext2D, all: Stroke[]) {
    all.forEach((st) => {
      ctx.beginPath()
      ctx.lineWidth = st.size
      ctx.strokeStyle = st.color
      ctx.globalCompositeOperation =
        st.mode === "erase" ? "destination-out" : "source-over"
      st.path.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.stroke()
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    let drawing = false
    let currentStroke: Stroke | null = null
    let lastPoint: { x: number; y: number } | null = null

    const toCanvas = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((e.clientX - rect.left) * 100) / zoom,
        y: ((e.clientY - rect.top) * 100) / zoom,
      }
    }

    const onDown = (e: MouseEvent) => {
      const { x, y } = toCanvas(e)
      lastPoint = { x, y }
      
      if (mode === "text") {
        const txt = prompt("Enter text")?.slice(0, 2000)
        if (!txt) return
        const box: TextBox = {
          id: crypto.randomUUID(),
          x,
          y,
          width: 150,
          height: 50,
          text: txt,
          color,
        }
        setTexts((ts) => [...ts, box])
        wsRef.current?.send(
          JSON.stringify({ type: "textAdd", payload: box })
        )
        setIsDirty(true)
        return
      }
      
      if (mode === "draw" || mode === "erase") {
        drawing = true
        currentStroke = { mode, color, size, path: [{ x, y }] }
        ctx.beginPath()
        ctx.moveTo(x, y)
      }
    }

    const onMove = (e: MouseEvent) => {
      if (!drawing || !currentStroke || !lastPoint) return
      
      const { x, y } = toCanvas(e)
      
      // Only draw if mouse button is pressed (e.buttons === 1)
      if ((e as any).buttons !== 1) return
      
      ctx.lineWidth = currentStroke.size
      ctx.strokeStyle = currentStroke.color
      ctx.globalCompositeOperation =
        currentStroke.mode === "erase" ? "destination-out" : "source-over"
      
      ctx.lineTo(x, y)
      ctx.stroke()
      
      currentStroke.path.push({ x, y })
      lastPoint = { x, y }
      
      wsRef.current?.send(
        JSON.stringify({
          type: "draw",
          payload: { x, y, mode, color, size },
        })
      )
      setIsDirty(true)
    }

    const onUp = () => {
      if (drawing && currentStroke) {
        setStrokes((prev) => [...prev, currentStroke!])
        currentStroke = null
      }
      drawing = false
      lastPoint = null
      // Don't call ctx.closePath() to avoid connecting lines
    }
    
    const onLeave = () => {
      lastPoint = null
    }

    window.addEventListener("mousedown", onDown as any)
    window.addEventListener("mousemove", onMove as any)
    window.addEventListener("mouseup", onUp as any)
    window.addEventListener("mouseleave", onLeave as any)
    return () => {
      window.removeEventListener("mousedown", onDown as any)
      window.removeEventListener("mousemove", onMove as any)
      window.removeEventListener("mouseup", onUp as any)
      window.removeEventListener("mouseleave", onLeave as any)
    }
  }, [mode, color, size, zoom])

  function saveContent() {
    const image = canvasRef.current?.toDataURL() ?? null
    apiCall(`/api/canvases/${id}/data`, {
      method: "POST",
      body: JSON.stringify({ content: { image, texts, strokes } }),
    })
    setIsDirty(false)
  }

  function updateTextContent(id: string, text: string) {
    setTexts((ts) => ts.map((b) => (b.id === id ? { ...b, text } : b)))
    setIsDirty(true)
  }
  function updateTextPosition(box: TextBox, d: { x: number; y: number }) {
    const updated = { ...box, x: d.x, y: d.y }
    setTexts((ts) => ts.map((t) => (t.id === box.id ? updated : t)))
    wsRef.current?.send(
      JSON.stringify({ type: "textMove", payload: updated })
    )
    setIsDirty(true)
  }
  function updateTextResize(
    box: TextBox,
    ref: HTMLElement,
    d: { x: number; y: number }
  ) {
    const updated = {
      ...box,
      width: parseInt(ref.style.width),
      height: parseInt(ref.style.height),
      x: d.x,
      y: d.y,
    }
    setTexts((ts) => ts.map((t) => (t.id === box.id ? updated : t)))
    wsRef.current?.send(
      JSON.stringify({ type: "textResize", payload: updated })
    )
    setIsDirty(true)
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = (e.currentTarget as any).email.value as string
    const resp = await apiCall(`/api/canvases/${id}/invite`, {
      method: "POST",
      body: JSON.stringify({ invitee_email: email }),
    })
    const { token: inviteToken } = await resp.json()
    const link = `${window.location.origin}/join/${inviteToken}`
    await navigator.clipboard.writeText(link)
    alert(`Invite link copied:\n${link}`)
  }

  const toolbarProps: ToolbarProps = {
    onSave: saveContent,
    onShare: () => setIsShareOpen(true),
    onDashboard: () => {
      if (isDirty && !confirm("Discard unsaved changes?")) return
      navigate("/dashboard")
    },
  }

  const textHandles: ResizeHandleStyles = {
    top: { height: 10, top: -5, cursor: "ns-resize" },
    bottom: { height: 10, bottom: -5, cursor: "ns-resize" },
    left: { width: 10, left: -5, cursor: "ew-resize" },
    right: { width: 10, right: -5, cursor: "ew-resize" },
    topLeft: { width: 10, height: 10, left: -5, top: -5, cursor: "nwse-resize" },
    topRight: { width: 10, height: 10, right: -5, top: -5, cursor: "nesw-resize" },
    bottomLeft: { width: 10, height: 10, left: -5, bottom: -5, cursor: "nesw-resize" },
    bottomRight: { width: 10, height: 10, right: -5, bottom: -5, cursor: "nwse-resize" },
  }

  return (
    <Dialog>
      <div className="flex flex-col h-screen bg-gray-100">
        <Header
          onBack={() => toolbarProps.onDashboard()}
          name={canvasInfo?.name ?? "(untitled)"}
          onShare={() => toolbarProps.onShare()}
        />

        <div className="flex flex-1 pt-13">
          <Toolbar {...toolbarProps} />

          <main className="flex-1 relative overflow-auto grid place-items-center p-6">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                style={{ transform: `scale(${zoom / 100})` }}
                className="bg-white border"
              />
              {texts.map((box) => (
                <Rnd
                  key={box.id}
                  size={{ width: box.width, height: box.height }}
                  position={{ x: box.x, y: box.y }}
                  bounds="parent"
                  disableDragging={mode !== "move"}
                  enableResizing={mode === "move"}
                  resizeHandleStyles={mode === "move" ? textHandles : {}}
                  style={{
                    pointerEvents:
                      mode === "move" || mode === "select"
                        ? "auto"
                        : "none",
                  }}
                  onDragStop={(_, d) => updateTextPosition(box, d)}
                  onResizeStop={(_, __, ref, ___, d) =>
                    updateTextResize(box, ref, d)
                  }
                >
                  {mode === "move" ? (
                    <textarea
                      className="w-full h-full p-1 resize-none bg-white border"
                      style={{ pointerEvents: "auto", color: box.color }}
                      value={box.text}
                      onChange={(e) =>
                        updateTextContent(box.id, e.target.value)
                      }
                      onBlur={saveContent}
                    />
                  ) : (
                    <div
                      className="w-full h-full p-1 bg-transparent overflow-auto"
                      style={{ color: box.color }}
                    >
                      {linkifyText(box.text)}
                    </div>
                  )}
                </Rnd>
              ))}
            </div>
          </main>

          <ToolsPanel />
        </div>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
        </DialogHeader>
        <form onSubmit={onInvite} className="space-y-4">
          <Input
            name="email"
            type="email"
            placeholder="friend@example.com"
            required
          />
          <DialogFooter>
            <Button type="submit">Send Invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <LocationPicker
        isOpen={false}
        onClose={() => {}}
        onLocationSelect={() => {}}
      />
    </Dialog>
  )
}

export default CanvasPage
