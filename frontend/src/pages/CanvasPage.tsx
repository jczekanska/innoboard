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

type Mode = "draw" | "erase" | "text" | "move" | "select" | "image"

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

interface ImageBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  src: string
}

interface CircleBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

interface RectangleBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
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
  const { token } = useContext(AuthContext)
  const { state, dispatch } = useCanvasSettings()
  const { mode, color, size, zoom } = state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [canvasInfo, setCanvasInfo] = useState<{ name: string } | null>(null)
  const [texts, setTexts] = useState<TextBox[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [images, setImages] = useState<ImageBox[]>([])
  const [circles, setCircles] = useState<CircleBox[]>([])
  const [rectangles, setRectangles] = useState<RectangleBox[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<TextBox | ImageBox | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  useEffect(() => {
    if (!token || !id) return
    fetch(`/api/canvases/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCanvasInfo)
      .catch(() => navigate("/dashboard"))
  }, [id, token, navigate])

  useEffect(() => {
    if (!token || !id) return
    fetch(`/api/canvases/${id}/data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(({ content }) => {
        setTexts(content.texts || [])
        setStrokes(content.strokes || [])
        setImages(content.images || [])
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    replayStrokes(ctx, strokes)
  }, [strokes, zoom])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return

      if (e.key.toLowerCase() === "c" && selectedId) {
        e.preventDefault()
        const foundText = texts.find((t) => t.id === selectedId)
        const foundImg = images.find((i) => i.id === selectedId)
        const item = foundText ?? foundImg
        if (!item) return

        const clone = { ...item, id: crypto.randomUUID() }
        setClipboard(clone)
      }

      if (e.key.toLowerCase() === "v" && clipboard) {
        e.preventDefault()
        const pasted = {
          ...clipboard,
          x: clipboard.x + 10,
          y: clipboard.y + 10,
          id: crypto.randomUUID(),
        }

        if ("text" in pasted) {
          setTexts((ts) => [...ts, pasted as TextBox])
          wsRef.current?.send(JSON.stringify({ type: "textAdd", payload: pasted }))
        } else {
          setImages((imgs) => [...imgs, pasted as ImageBox])
          wsRef.current?.send(JSON.stringify({ type: "imageAdd", payload: pasted }))
        }

        setSelectedId(pasted.id)
        setClipboard({ ...pasted, id: crypto.randomUUID() })
        setIsDirty(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedId, clipboard, texts, images])

  function handleRemote(msg: any) {
    const ctx = canvasRef.current?.getContext("2d")
    switch (msg.type) {
      case "draw":
        if (ctx) {
          const { x, y, color: c, size: s, mode: m } = msg.payload
          ctx.lineWidth = s
          ctx.strokeStyle = c
          ctx.globalCompositeOperation =
            m === "erase" ? "destination-out" : "source-over"
          ctx.lineTo(x, y)
          ctx.stroke()
          setIsDirty(true)
        }
        break
      case "textAdd":
        setTexts((ts) => [...ts, msg.payload])
        setIsDirty(true)
        break
      case "textMove":
      case "textResize":
        setTexts((ts) =>
          ts.map((t) => (t.id === msg.payload.id ? msg.payload : t))
        )
        setIsDirty(true)
        break
      case "imageAdd":
        setImages((imgs) => [...imgs, msg.payload])
        setIsDirty(true)
        break
      case "imageMove":
      case "imageResize":
        setImages((imgs) =>
          imgs.map((i) =>
            i.id === msg.payload.id ? { ...i, ...msg.payload } : i
          )
        )
        setIsDirty(true)
        break
      case "imageDelete":
        setImages((imgs) => imgs.filter((i) => i.id !== msg.payload.id))
        setIsDirty(true)
        break
      case "circleAdd":
        setCircles((cs) => [...cs, msg.payload])
        setIsDirty(true)
        break
      case "circleMove":
      case "circleResize":
        setCircles((cs) =>
          cs.map((c) =>
            c.id === msg.payload.id ? msg.payload : c
          )
        )
        setIsDirty(true)
        break
      case "rectangleAdd":
        setRectangles((rs) => [...rs, msg.payload])
        setIsDirty(true)
        break
      case "rectangleMove":
      case "rectangleResize":
        setRectangles((rs) =>
          rs.map((r) => (r.id === msg.payload.id ? msg.payload : r))
        )
        setIsDirty(true)
        break
      case "rectangleDelete":
        setRectangles((rs) => rs.filter((r) => r.id !== msg.payload.id))
        setIsDirty(true)
        break
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

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/\.(jpe?g|png|svg)$/i.test(file.name)) {
      return alert("Unsupported image type")
    }
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const box: ImageBox = {
        id: crypto.randomUUID(),
        x: 50,
        y: 50,
        width: 200,
        height: 200,
        src,
      }
      setImages((imgs) => [...imgs, box])
      wsRef.current?.send(JSON.stringify({ type: "imageAdd", payload: box }))
      setIsDirty(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    let drawing = false
    let currentStroke: Stroke | null = null
    const toCanvas = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((e.clientX - rect.left) * 100) / zoom,
        y: ((e.clientY - rect.top) * 100) / zoom,
      }
    }
    const onDown = (e: MouseEvent) => {
      const { x, y } = toCanvas(e)
      if (mode === "circle") {
        const circle: CircleBox = {
          id: crypto.randomUUID(),
          x,
          y,
          width: 100,
          height: 100,
          color,
        }
        setCircles((cs) => [...cs, circle])
        wsRef.current?.send(JSON.stringify({ type: "circleAdd", payload: circle }))
        setIsDirty(true)
        return
      }
      if (mode === "rectangle") {
        const rect: RectangleBox = {
          id: crypto.randomUUID(),
          x,
          y,
          width: 150,
          height: 100,
          color,
        }
        setRectangles((rs) => [...rs, rect])
        wsRef.current?.send(JSON.stringify({ type: "rectangleAdd", payload: rect }))
        setIsDirty(true)
        return
      }
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
      if (mode === "image") {
        fileInputRef.current?.click()
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
      if (!drawing || !currentStroke) return
      const { x, y } = toCanvas(e)
      ctx.lineWidth = currentStroke.size
      ctx.strokeStyle = currentStroke.color
      ctx.globalCompositeOperation =
        currentStroke.mode === "erase" ? "destination-out" : "source-over"
      ctx.lineTo(x, y)
      ctx.stroke()
      currentStroke.path.push({ x, y })
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
      ctx.closePath()
    }
    canvas.addEventListener("mousedown", onDown as any)
    canvas.addEventListener("mousemove", onMove as any)
    canvas.addEventListener("mouseup", onUp as any)
    canvas.addEventListener("mouseleave", onUp as any)
    return () => {
      canvas.removeEventListener("mousedown", onDown as any)
      canvas.removeEventListener("mousemove", onMove as any)
      canvas.removeEventListener("mouseup", onUp as any)
      canvas.removeEventListener("mouseleave", onUp as any)
    }
  }, [mode, color, size, zoom])

  const updateTextContent = (id: string, text: string) => {
    setTexts((ts) => ts.map((b) => (b.id === id ? { ...b, text } : b)))
    setIsDirty(true)
  }
  const updateTextPosition = (box: TextBox, d: { x: number; y: number }) => {
    const updated = { ...box, x: d.x, y: d.y }
    setTexts((ts) => ts.map((t) => (t.id === box.id ? updated : t)))
    wsRef.current?.send(
      JSON.stringify({ type: "textMove", payload: updated })
    )
    setIsDirty(true)
  }
  const updateTextResize = (
    box: TextBox,
    ref: HTMLElement,
    d: { x: number; y: number }
  ) => {
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

  function updateImagePosition(id: string, x: number, y: number) {
    const updated = images.map((i) => (i.id === id ? { ...i, x, y } : i))
    setImages(updated)
    wsRef.current?.send(
      JSON.stringify({ type: "imageMove", payload: { id, x, y } })
    )
    setIsDirty(true)
  }
  function updateImageResize(
    id: string,
    payload: { width: number; height: number; x: number; y: number }
  ) {
    const updated = images.map((i) =>
      i.id === id ? { ...i, ...payload } : i
    )
    setImages(updated)
    wsRef.current?.send(
      JSON.stringify({ type: "imageResize", payload: { id, ...payload } })
    )
    setIsDirty(true)
  }
  function deleteImage(id: string) {
    setImages((imgs) => imgs.filter((i) => i.id !== id))
    wsRef.current?.send(
      JSON.stringify({ type: "imageDelete", payload: { id } })
    )
    setIsDirty(true)
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = (e.currentTarget as any).email.value as string
    let resp: Response
    try {
      resp = await fetch(`/api/canvases/${id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invitee_email: email }),
      })
    } catch (err) {
      console.error(err)
      alert("Network error — could not send invite.")
      return
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText)
      console.error("Invite error:", text)
      alert("Invite failed: " + (text || resp.statusText))
      return
    }
    const { token: inviteToken } = await resp.json()
    const link = `${window.location.origin}/join/${inviteToken}`
    try {
      await navigator.clipboard.writeText(link)
      alert(`Invite link copied!\n\n${link}`)
    } catch {
      alert(`Invite link: ${link}`)
    }
    setIsShareOpen(false)
  }

  function saveContent() {
    fetch(`/api/canvases/${id}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: { texts, strokes, images } }),
    })
    setIsDirty(false)
  }

  const resizeHandles: ResizeHandleStyles = {
    top: { height: 10, top: -5, cursor: "ns-resize" },
    bottom: { height: 10, bottom: -5, cursor: "ns-resize" },
    left: { width: 10, left: -5, cursor: "ew-resize" },
    right: { width: 10, right: -5, cursor: "ew-resize" },
    topLeft: { width: 10, height: 10, left: -5, top: -5, cursor: "nwse-resize" },
    topRight: {
      width: 10,
      height: 10,
      right: -5,
      top: -5,
      cursor: "nesw-resize",
    },
    bottomLeft: {
      width: 10,
      height: 10,
      left: -5,
      bottom: -5,
      cursor: "nesw-resize",
    },
    bottomRight: {
      width: 10,
      height: 10,
      right: -5,
      bottom: -5,
      cursor: "nwse-resize",
    },
  }

  const toolbarProps: ToolbarProps = {
    onSave: saveContent,
    onShare: () => setIsShareOpen(true),
    onDashboard: () => {
      if (isDirty && !confirm("Discard unsaved changes?")) return
      navigate("/dashboard")
    },
  }

  return (
    <Dialog open={isShareOpen} onOpenChange={(o) => setIsShareOpen(o)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        className="hidden"
        onChange={onSelectFile}
      />
      <button
        className="absolute top-4 right-4 z-20 bg-white p-2 rounded shadow"
        onClick={() => fileInputRef.current?.click()}
      >
        Upload Image
      </button>
      <div className="flex flex-col h-screen bg-gray-100">
        <Header
          onBack={toolbarProps.onDashboard}
          name={canvasInfo?.name ?? "(untitled)"}
          onShare={toolbarProps.onShare}
        />
        <div className="flex flex-1 pt-13">
          <Toolbar {...toolbarProps} />
          <main className="flex-1 relative overflow-auto grid place-items-center p-6">
            <div
              className="relative"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                const fake = { target: { files: [file] } } as any
                onSelectFile(fake)
              }}
            >
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
                  resizeHandleStyles={mode === "move" ? resizeHandles : {}}
                  style={{
                    pointerEvents:
                      mode === "move" || mode === "select"
                        ? "auto"
                        : "none",
                    outline:
                      mode === "select" && selectedId === box.id
                        ? "2px dashed #3b82f6"
                        : "none",
                  }}
                  onDragStop={(_, d) => updateTextPosition(box, d)}
                  onResizeStop={(_, __, ref, ___, d) =>
                    updateTextResize(box, ref, d)
                  }
                  onClick={() => mode === "select" && setSelectedId(box.id)}
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
              {images.map((img) => (
                <Rnd
                  key={img.id}
                  size={{ width: img.width, height: img.height }}
                  position={{ x: img.x, y: img.y }}
                  bounds="parent"
                  disableDragging={mode !== "move"}
                  enableResizing={mode === "move"}
                  resizeHandleStyles={mode === "move" ? resizeHandles : {}}
                  onDragStop={(_, d) =>
                    updateImagePosition(img.id, d.x, d.y)
                  }
                  onResizeStop={(_, __, ref, ___, d) =>
                    updateImageResize(img.id, {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      x: d.x,
                      y: d.y,
                    })
                  }
                  style={{
                    outline:
                      mode === "select" && selectedId === img.id
                        ? "2px dashed #3b82f6"
                        : "none",
                  }}
                  onClick={() => mode === "select" && setSelectedId(img.id)}
                >
                  <div className="relative">
                    <img
                      src={img.src}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                    {mode === "move" && (
                      <button
                        className="absolute top-0 right-0 bg-white rounded-full p-1"
                        onClick={() => deleteImage(img.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </Rnd>
              ))}
              {rectangles.map((r) => (
                <Rnd
                  key={r.id}
                  size={{ width: r.width, height: r.height }}
                  position={{ x: r.x, y: r.y }}
                  bounds="parent"
                  disableDragging={mode !== "move" && mode !== "delete"}
                  enableResizing={mode === "move"}
                  resizeHandleStyles={mode === "move" ? resizeHandles : {}}
                  style={{
                    border: `2px solid ${r.color}`,
                    cursor: mode === "delete" ? "pointer" : undefined,
                  }}
                  onDragStop={(_, d) => {
                    if (mode !== "move") return
                    const upd = { ...r, x: d.x, y: d.y }
                    setRectangles((rs) => rs.map((x) => (x.id === r.id ? upd : x)))
                    wsRef.current?.send(JSON.stringify({ type: "rectangleMove", payload: upd }))
                    setIsDirty(true)
                  }}
                  onResizeStop={(_, __, ref, ___, d) => {
                    if (mode !== "move") return
                    const upd = {
                      ...r,
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      x: d.x,
                      y: d.y,
                    }
                    setRectangles((rs) => rs.map((x) => (x.id === r.id ? upd : x)))
                    wsRef.current?.send(JSON.stringify({ type: "rectangleResize", payload: upd }))
                    setIsDirty(true)
                  }}
                  onClick={() => {
                    if (mode === "delete") {
                      setRectangles((rs) => rs.filter((x) => x.id !== r.id))
                      wsRef.current?.send(JSON.stringify({ type: "rectangleDelete", payload: { id: r.id } }))
                      setIsDirty(true)
                    }
                  }}
                />
              ))}
               {circles.map((c) => (
              <Rnd
                key={c.id}
                size={{ width: c.width, height: c.height }}
                position={{ x: c.x, y: c.y }}
                bounds="parent"
                disableDragging={mode !== "move"}
                enableResizing={mode === "move"}
                resizeHandleStyles={mode === "move" ? resizeHandles : {}}
                style={{
                  border: `2px solid ${c.color}`,
                  borderRadius: "50%",
                  pointerEvents:
                    mode === "move" || mode === "select" ? "auto" : "none",
                  cursor: mode === "delete" ? "pointer" : undefined,
                }}
                onClick={() => {
                  if (mode === "delete") {
                    setCircles((cs) => cs.filter((x) => x.id !== c.id))
                    wsRef.current?.send(JSON.stringify({ type: "circleDelete", payload: { id: c.id } }))
                    setIsDirty(true)
                  }
                }}
                onDragStop={(_, d) => {
                  const updated = { ...c, x: d.x, y: d.y }
                  setCircles((cs) => cs.map((x) => (x.id === c.id ? updated : x)))
                  wsRef.current?.send(JSON.stringify({ type: "circleMove", payload: updated }))
                  setIsDirty(true)
                }}
                onResizeStop={(_, __, ref, ___, d) => {
                  const updated = {
                    ...c,
                    width: parseInt(ref.style.width),
                    height: parseInt(ref.style.height),
                    x: d.x,
                    y: d.y,
                  }
                  setCircles((cs) => cs.map((x) => (x.id === c.id ? updated : x)))
                  wsRef.current?.send(JSON.stringify({ type: "circleResize", payload: updated }))
                  setIsDirty(true)
                }}
              />
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
