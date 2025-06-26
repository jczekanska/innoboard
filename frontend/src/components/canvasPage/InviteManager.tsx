// src/components/canvasPage/InviteManager.tsx
import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface InviteLink {
  id: number
  token: string
  created_at: string
  expires_at: string | null
  disabled: boolean
  uses: number
  status: "active" | "expired" | "disabled"
}

interface InviteManagerProps {
  canvasId: string
  token: string
}

export default function InviteManager({ canvasId, token }: InviteManagerProps) {
  const [links, setLinks] = useState<InviteLink[]>([])
  const [validity, setValidity] = useState<"24h" | "7d" | "none" | "custom">("24h")
  const [customDate, setCustomDate] = useState<string>("")

  // Load existing links
  const load = () => {
    fetch(`/api/canvases/${canvasId}/invite-links`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setLinks)
      .catch(console.error)
  }

  useEffect(load, [canvasId, token])

  // Create new link
  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const body: any = { validity }
    if (validity === "custom" && customDate) {
      body.custom_expires_at = new Date(customDate).toISOString()
    }
    const resp = await fetch(`/api/canvases/${canvasId}/invite-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    if (resp.ok) {
      setCustomDate("")
      setValidity("24h")
      load()
    } else {
      console.error("Failed to create invite link")
    }
  }

  // Disable link
  const disable = async (id: number) => {
    await fetch(`/api/canvases/${canvasId}/invite-links/${id}/disable`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  // Delete link
  const remove = async (id: number) => {
    if (!confirm("Delete this invite link?")) return
    await fetch(`/api/canvases/${canvasId}/invite-links/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—"

  return (
    <div className="w-full space-y-3">
      <h4 className="font-semibold">Invite Links</h4>

      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">Validity</label>
          <select
            value={validity}
            onChange={(e) =>
              setValidity(e.target.value as "24h" | "7d" | "none" | "custom")
            }
            className="border rounded px-2 py-1"
          >
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="none">No expiry</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {validity === "custom" && (
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Expires at</label>
            <Input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </div>
        )}

        <Button type="submit">New Link</Button>
      </form>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-1 text-left">Token</th>
              <th className="py-1 text-left">Created</th>
              <th className="py-1 text-left">Expires</th>
              <th className="py-1 text-center">Status</th>
              <th className="py-1 text-center">Uses</th>
              <th className="py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="py-1 truncate max-w-xs">{l.token}</td>
                <td className="py-1">{formatDate(l.created_at)}</td>
                <td className="py-1">{formatDate(l.expires_at)}</td>
                <td className="py-1 text-center capitalize">{l.status}</td>
                <td className="py-1 text-center">{l.uses}</td>
                <td className="py-1 space-x-1">
                  {l.status === "active" && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => disable(l.id)}
                    >
                      Disable
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => remove(l.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
