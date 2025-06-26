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

type InviteLink = {
  token: string
  link: string
  expiresAt: string | null
  disabled: boolean
  joinCount: number
}

const CanvasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useContext(AuthContext)

  const { state, dispatch } = useCanvasSettings()
  const { mode, color, size, zoom } = state

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket>()
  const [canvasInfo, setCanvasInfo] = useState<{ name: string } | null>(null)
  const [texts, setTexts] = useState<TextBox[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [inviteExpiry, setInviteExpiry] = useState<"24h" | "7d" | "never">("24h")
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)

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

    const toCanvas = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((e.clientX - rect.left) * 100) / zoom,
        y: ((e.clientY - rect.top) * 100) / zoom,
      }
    }

    const onDown = (e: MouseEvent) => {
      const { x, y } = toCanvas(e)
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

  function saveContent() {
    const image = canvasRef.current?.toDataURL() ?? null
    fetch(`/api/canvases/${id}/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: { image, texts, strokes } }),
    })
    setIsDirty(false)
  }

  async function onRename(newName: string) {
    if (!id || !token) return
    try {
      const resp = await fetch(`/api/canvases/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      })
      if (!resp.ok) throw new Error(await resp.text())
      const updated = await resp.json()
      setCanvasInfo(updated)
    } catch (err: any) {
      console.error("Rename failed:", err)
      alert("Could not rename canvas: " + err.message)
    }
  }

  async function loadInvites() {
    if (!id || !token) return
    setLoadingLinks(true)
    try {
      const resp = await fetch(`/api/canvases/${id}/invite`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error(resp.statusText)
      const data: Array<{
        token: string
        expires_at: string | null
        disabled: boolean
        join_count: number
      }> = await resp.json()

      setInviteLinks(
        data.map(inv => ({
          token: inv.token,
          link: `${window.location.origin}/join/${inv.token}`,
          expiresAt: inv.expires_at,
          disabled: inv.disabled,
          joinCount: inv.join_count,
        }))
      )
    } catch (e) {
      console.error("Load invites failed:", e)
      alert("Could not load invite links.")
    } finally {
      setLoadingLinks(false)
    }
  }

  const openSharePanel = () => {
    loadInvites()
    setIsShareOpen(true)
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    const form = e.currentTarget as any
    const email = form.email.value as string

    let expiryHours: number | null = null
    if (inviteExpiry === "24h") expiryHours = 24
    if (inviteExpiry === "7d") expiryHours = 24 * 7

    try {
      const resp = await fetch(`/api/canvases/${id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invitee_email: email, expiry_hours: expiryHours }),
      })
      if (!resp.ok) throw new Error(await resp.text())
      form.reset()
      await loadInvites()
      const { token: newToken } = await resp.json()
      navigator.clipboard.writeText(`${window.location.origin}/join/${newToken}`)
      alert("Invite created and link copied!")
    } catch (err: any) {
      console.error("Invite failed:", err)
      alert("Invite failed: " + err.message)
    }
  }

  const disableInvite = async (tok: string) => {
    try {
      const resp = await fetch(
        `/api/canvases/${id}/invite/${tok}/disable`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!resp.ok) throw new Error(resp.statusText)
      await loadInvites()
    } catch (e) {
      console.error(e)
      alert("Failed to disable invite.")
    }
  }

  const activateInvite = async (tok: string) => {
    try {
      const resp = await fetch(
        `/api/canvases/${id}/invite/${tok}/activate`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!resp.ok) throw new Error(resp.statusText)
      await loadInvites()
    } catch (e) {
      console.error(e)
      alert("Failed to activate invite.")
    }
  }

  const deleteInvite = async (tok: string) => {
    if (!confirm("Delete this invite permanently?")) return
    try {
      const resp = await fetch(
        `/api/canvases/${id}/invite/${tok}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!resp.ok) throw new Error(resp.statusText)
      await loadInvites()
    } catch (e) {
      console.error(e)
      alert("Failed to delete invite.")
    }
  }

  const getStatus = (inv: InviteLink) => {
    if (inv.disabled) return "Disabled"
    if (inv.expiresAt && new Date(inv.expiresAt + "Z") < new Date())
      return "Expired"
    return "Active"
  }

  const toolbarProps: ToolbarProps = {
    onSave: saveContent,
    onShare: openSharePanel,
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
    <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
      <div className="flex flex-col h-screen bg-gray-100">
        <Header
          onBack={toolbarProps.onDashboard}
          name={canvasInfo?.name ?? "(untitled)"}
          onRename={onRename}
          onShare={openSharePanel}
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

      <DialogContent className="space-y-4 max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Invites</DialogTitle>
        </DialogHeader>

        <form onSubmit={onInvite} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="friend@example.com"
            required
            className="w-full p-2 border rounded"
          />
          <div>
            <label className="block mb-1">Expires in</label>
            <select
              value={inviteExpiry}
              onChange={e =>
                setInviteExpiry(
                  e.target.value as "24h" | "7d" | "never"
                )
              }
              className="w-full p-2 border rounded"
            >
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="never">No expiry</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit">Create Invite</Button>
          </DialogFooter>
        </form>

        {loadingLinks ? (
          <p>Loading invites…</p>
        ) : inviteLinks.length === 0 ? (
          <p className="italic text-sm">
            No invites yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {inviteLinks.map(inv => {
              const status = getStatus(inv)
              const expiresLabel = inv.expiresAt
                ? new Date(inv.expiresAt + "Z").toLocaleString("default", {
                    timeZone: "Europe/Warsaw",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Never"

              return (
                <li
                  key={inv.token}
                  className="p-3 border rounded space-y-1"
                >
                  <a
                    href={inv.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600 break-all"
                  >
                    {inv.link}
                  </a>
                  <div className="text-sm text-gray-600 flex flex-wrap gap-4">
                    <span>
                      Status: <strong>{status}</strong>
                    </span>
                    <span>
                      Expires: {expiresLabel}
                    </span>
                    <span>
                      Joins: {inv.joinCount}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {!inv.disabled && status === "Active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          disableInvite(inv.token)
                        }
                      >
                        Disable
                      </Button>
                    )}
                    {inv.disabled && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          activateInvite(inv.token)
                        }
                      >
                        Activate
                      </Button>
                    )}
                    {(inv.disabled || status === "Expired") && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-red-600"
                        onClick={() =>
                          deleteInvite(inv.token)
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
            )})}
          </ul>
        )}
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
