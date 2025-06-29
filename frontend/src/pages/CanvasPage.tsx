import React, { useState, useRef, useEffect, useContext, ReactNode } from "react"
import { AuthContext } from "@/context/AuthContext"
import { useNavigate, useParams } from "react-router-dom"
import Header from "@/components/canvasPage/Header"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import Toolbar from "@/components/canvasPage/Toolbar"
import ToolsPanel from "@/components/canvasPage/ToolsPanel"
import { CanvasObject, Mode, Stroke } from "@/types/canvas"
import { OverlayObject } from "@/components/canvasPage/OverlayObject"
import { LocationPicker } from "@/components/canvasPage/LocationPicker"
import { createApiCall } from "@/lib/api"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface DrawEvent {
    x: number;
    y: number;
    mode: Mode
    color: string;
    size: number;
    text?: string;
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
  const { token, logout } = useContext(AuthContext)
  const apiCall = createApiCall({ token, logout })

  const { state, dispatch } = useCanvasSettings()
  const { mode, color, size, zoom } = state

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket>()
  const [canvasInfo, setCanvasInfo] = useState<{ name: string } | null>(null)
  const [objects, setObjects] = useState<CanvasObject[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [pendingLocationCoords, setPendingLocationCoords] = useState<{ x: number; y: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<CanvasObject | null>(null)
  const [inviteExpiry, setInviteExpiry] = useState<"24h" | "7d" | "never">("24h")
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  
  // Update selected shape properties when color or size changes
  useEffect(() => {
    if (selectedId && (mode === "select")) {
      const selectedObject = objects.find(obj => obj.id === selectedId)
      if (selectedObject && (selectedObject.type === "circle" || selectedObject.type === "rectangle")) {
        // Only update if the color or strokeWidth actually changed
        if (selectedObject.color !== color || selectedObject.strokeWidth !== size) {
          setObjects(prevObjects =>
            prevObjects.map(obj =>
              obj.id === selectedId ? { ...obj, color, strokeWidth: size } : obj
            )
          )
          const updatedObject = { ...selectedObject, color, strokeWidth: size }
          wsRef.current?.send(
            JSON.stringify({ type: "objectUpdate", payload: updatedObject })
          )
          setIsDirty(true)
        }
      }
    }
  }, [color, size, selectedId, mode]) // Removed 'objects' from dependencies

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
        setObjects(content.objects || [])
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
    if (msg.type === "objectAdd") {
      setObjects((objs) => [...objs, msg.payload])
      setIsDirty(true)
    }
    if (msg.type === "objectUpdate") {
      setObjects((objs) =>
        objs.map((obj) => (obj.id === msg.payload.id ? msg.payload : obj))
      )
      setIsDirty(true)
    }
    if (msg.type === "objectDelete") {
      setObjects((objs) => objs.filter((obj) => obj.id !== msg.payload.id))
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
      
      // Handle object creation for different modes
      if (mode === "text") {
        const obj: CanvasObject = {
          id: crypto.randomUUID(),
          type: "text",
          x,
          y,
          width: 200,
          height: 50,
          text: "",
          color: state.color,
          fontSize: state.fontSize,
          fontFamily: state.fontFamily,
          rotation: 0,
        }
        setObjects((objs) => [...objs, obj])
        wsRef.current?.send(
          JSON.stringify({ type: "objectAdd", payload: obj })
        )
        setIsDirty(true)
        return
      }
      
      if (mode === "image") {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = "image/*"
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) return
          const url = URL.createObjectURL(file)
          const img = new Image()
          img.onload = () => {
            const imgWidth = img.width
            const imgHeight = img.height
            const imgArea = imgWidth * imgHeight
            const canvas = canvasRef.current!
            const maxArea = canvas.width * canvas.height * 0.5
            let width = imgWidth
            let height = imgHeight
            if (imgArea > maxArea) {
              const scaleFactor = Math.sqrt(maxArea / imgArea)
              width = imgWidth * scaleFactor
              height = imgHeight * scaleFactor
            }
            const obj: CanvasObject = {
              id: crypto.randomUUID(),
              type: "image",
              x,
              y,
              width,
              height,
              rotation: 0,
              src: url,
            }
            setObjects((objs) => [...objs, obj])
            wsRef.current?.send(
              JSON.stringify({ type: "objectAdd", payload: obj })
            )
            setIsDirty(true)
          }
          img.src = url
        }
        input.click()
        return
      }
      
      if (mode === "audio") {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = "audio/*"
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) return
          const url = URL.createObjectURL(file)
          const obj: CanvasObject = {
            id: crypto.randomUUID(),
            type: "audio",
            x,
            y,
            width: 250,
            height: 80,
            url,
            filename: file.name,
          }
          setObjects((objs) => [...objs, obj])
          wsRef.current?.send(
            JSON.stringify({ type: "objectAdd", payload: obj })
          )
          setIsDirty(true)
        }
        input.click()
        return
      }
      
      if (mode === "location") {
        setPendingLocationCoords({ x, y })
        setIsLocationPickerOpen(true)
        return
      }
      
      if (mode === "circle") {
        const obj: CanvasObject = {
          id: crypto.randomUUID(),
          type: "circle",
          x,
          y,
          width: 100,
          height: 100,
          color: state.color,
          strokeWidth: state.size,
          rotation: 0,
        }
        setObjects((objs) => [...objs, obj])
        wsRef.current?.send(
          JSON.stringify({ type: "objectAdd", payload: obj })
        )
        setIsDirty(true)
        return
      }
      
      if (mode === "rectangle") {
        const obj: CanvasObject = {
          id: crypto.randomUUID(),
          type: "rectangle",
          x,
          y,
          width: 150,
          height: 100,
          color: state.color,
          strokeWidth: state.size,
          rotation: 0,
        }
        setObjects((objs) => [...objs, obj])
        wsRef.current?.send(
          JSON.stringify({ type: "objectAdd", payload: obj })
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
    
    canvas.addEventListener("mousedown", onDown as any)
    window.addEventListener("mousemove", onMove as any)
    window.addEventListener("mouseup", onUp as any)
    return () => {
      canvas.removeEventListener("mousedown", onDown as any)
      window.removeEventListener("mousemove", onMove as any)
      window.removeEventListener("mouseup", onUp as any)
    }
  }, [mode, color, size, zoom])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      console.log('Key pressed:', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey, 'Selected ID:', selectedId)
      
      // Check for Ctrl on Windows/Linux or Cmd (Meta) on macOS
      const isModifierPressed = e.ctrlKey || e.metaKey
      if (!isModifierPressed) return

      if (e.key.toLowerCase() === "c" && selectedId) {
        e.preventDefault()
        console.log('Attempting to copy object with ID:', selectedId)
        const foundObject = objects.find((obj) => obj.id === selectedId)
        console.log('Found object:', foundObject)
        if (!foundObject) return

        const clone = { ...foundObject, id: crypto.randomUUID() }
        setClipboard(clone)
        console.log('Object copied to clipboard:', clone)
      }

      if (e.key.toLowerCase() === "v" && clipboard) {
        e.preventDefault()
        console.log('Attempting to paste from clipboard:', clipboard)
        const pasted = {
          ...clipboard,
          x: clipboard.x + 10,
          y: clipboard.y + 10,
          id: crypto.randomUUID(),
        }

        console.log('Creating pasted object:', pasted)
        setObjects((objs) => [...objs, pasted])
        wsRef.current?.send(JSON.stringify({ type: "objectAdd", payload: pasted }))

        setSelectedId(pasted.id)
        setClipboard({ ...pasted, id: crypto.randomUUID() })
        setIsDirty(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedId, clipboard, objects])

  function saveContent() {
    const image = canvasRef.current?.toDataURL() ?? null
    apiCall(`/api/canvases/${id}/data`, {
      method: "POST",
      body: JSON.stringify({ content: { image, objects, strokes } }),
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
   
  function updateObjectPosition(id: string, x: number, y: number) {
    setObjects(prevObjects =>
      prevObjects.map(obj =>
        obj.id === id ? { ...obj, x, y } : obj
      )
    )
    const updatedObject = objects.find(obj => obj.id === id)
    if (updatedObject) {
      const newObj = { ...updatedObject, x, y }
      wsRef.current?.send(
        JSON.stringify({ type: "objectUpdate", payload: newObj })
      )
    }
    setIsDirty(true)
  }

  function updateObjectRotation(id: string, rotation: number) {
    setObjects(prevObjects =>
      prevObjects.map(obj =>
        obj.id === id ? { ...obj, rotation } : obj
      )
    )
    const updatedObject = objects.find(obj => obj.id === id)
    if (updatedObject && (updatedObject.type === "image" || updatedObject.type === "text" || updatedObject.type === "circle" || updatedObject.type === "rectangle")) {
      const newObj = { ...updatedObject, rotation }
      wsRef.current?.send(
        JSON.stringify({ type: "objectUpdate", payload: newObj })
      )
    }
    setIsDirty(true)
  }

  function updateObjectDimension(id: string, width: number, height: number) {
    setObjects(prevObjects =>
      prevObjects.map(obj =>
        obj.id === id ? { ...obj, width, height } : obj
      )
    )
    const updatedObject = objects.find(obj => obj.id === id)
    if (updatedObject) {
      const newObj = { ...updatedObject, width, height }
      wsRef.current?.send(
        JSON.stringify({ type: "objectUpdate", payload: newObj })
      )
    }
    setIsDirty(true)
  }

  function deleteObject(id: string) {
    setObjects(prevObjects => prevObjects.filter(obj => obj.id !== id))
    wsRef.current?.send(
      JSON.stringify({ type: "objectDelete", payload: { id } })
    )
    setIsDirty(true)
  }

  function updateObjectText(id: string, text: string) {
    setObjects(prevObjects =>
      prevObjects.map(obj =>
        obj.id === id && obj.type === "text" ? { ...obj, text } : obj
      )
    )
    const updatedObject = objects.find(obj => obj.id === id)
    if (updatedObject && updatedObject.type === "text") {
      const newObj = { ...updatedObject, text }
      wsRef.current?.send(
        JSON.stringify({ type: "objectUpdate", payload: newObj })
      )
    }
    setIsDirty(true)
  }

  function updateObjectStyle(id: string, style: { color?: string; fontSize?: number; fontFamily?: string }) {
    setObjects(prevObjects =>
      prevObjects.map(obj =>
        obj.id === id && obj.type === "text" ? { ...obj, ...style } : obj
      )
    )
    const updatedObject = objects.find(obj => obj.id === id)
    if (updatedObject && updatedObject.type === "text") {
      const newObj = { ...updatedObject, ...style }
      wsRef.current?.send(
        JSON.stringify({ type: "objectUpdate", payload: newObj })
      )
    }
    setIsDirty(true)
  }

  const handleLocationSelect = (location: { name: string; lat: number; lng: number }) => {
    if (!pendingLocationCoords) return

    const obj: CanvasObject = {
      id: crypto.randomUUID(),
      type: "location",
      x: pendingLocationCoords.x,
      y: pendingLocationCoords.y,
      width: 200,
      height: 150,
      label: location.name,
      lat: location.lat,
      lng: location.lng,
    }
    setObjects((objs) => [...objs, obj])
    wsRef.current?.send(
      JSON.stringify({ type: "objectAdd", payload: obj })
    )
    setIsDirty(true)
    setPendingLocationCoords(null)
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

  const handleLocationPickerClose = () => {
    setIsLocationPickerOpen(false)
    setPendingLocationCoords(null)
  }

  return (
    <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
      <div className="flex flex-col h-screen bg-gray-100">
        <Header
          onBack={() => {
            if (isDirty && !confirm("Discard unsaved changes?")) return
            navigate("/dashboard")
          }}
          name={canvasInfo?.name ?? "(untitled)"}
          onRename={onRename}
          onSave={saveContent}
          onDashboard={() => {
            if (isDirty && !confirm("Discard unsaved changes?")) return
            navigate("/dashboard")
          }}
          onShare={openSharePanel}
        />

        <div className="flex flex-1 pt-13">
          <Toolbar onShare={() => setIsShareOpen(true)} onDashboard={() => {
            if (isDirty && !confirm("Discard unsaved changes?")) return
            navigate("/dashboard")
          }} />

          <main className="flex-1 relative overflow-auto grid place-items-center p-6">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                style={{ transform: `scale(${zoom / 100})` }}
                className="bg-white border"
              />
              {/* Overlay Objects */}
              {objects.map(obj => (
                <OverlayObject
                  key={obj.id}
                  obj={obj}
                  updateObjectPosition={updateObjectPosition}
                  updateObjectRotation={updateObjectRotation}
                  updateObjectDimension={updateObjectDimension}
                  updateObjectText={updateObjectText}
                  updateObjectStyle={updateObjectStyle}
                  deleteObject={deleteObject}
                  canvasWidth={800}
                  canvasHeight={600}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          </main>

          <ToolsPanel />
        </div>
      </div>
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}></Dialog>
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
        isOpen={isLocationPickerOpen}
        onClose={handleLocationPickerClose}
        onLocationSelect={handleLocationSelect}
      />
    </Dialog>
  )
}

export default CanvasPage
