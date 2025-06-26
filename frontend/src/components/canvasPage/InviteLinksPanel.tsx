// src/components/InviteLinksPanel.tsx
import React, { useEffect, useState, useContext } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Input }  from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { InvitationLinkOut, InvitationLinkCreate } from "@/types"

export default function InviteLinksPanel({
  canvasId,
  token,
  open,
  onOpenChange
}: {
  canvasId: number
  token: string
  open: boolean
  onOpenChange(open: boolean): void
}) {
  const [links, setLinks] = useState<InvitationLinkOut[]>([])
  const [validity, setValidity] = useState<InvitationLinkCreate["validity"]>("24h")
  const [customAt, setCustomAt] = useState<string>("")  

  useEffect(() => {
    if (!open) return
    fetch(`/api/canvases/${canvasId}/invite-links`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setLinks)
  }, [open])

  const createLink = async () => {
    const payload: InvitationLinkCreate = {
      validity,
      custom_expires_at: validity === "custom" ? new Date(customAt) : undefined,
      disabled: false
    }
    const resp = await fetch(`/api/canvases/${canvasId}/invite-links`, {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    const newLink = await resp.json()
    setLinks(ls => [newLink, ...ls])
  }

  const disableLink = async (id: number) => {
    await fetch(`/api/canvases/${canvasId}/invite-links/${id}/disable`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    })
    setLinks(ls => ls.map(l => l.id === id ? { ...l, status: "disabled" } : l))
  }

  const deleteLink = async (id: number) => {
    await fetch(`/api/canvases/${canvasId}/invite-links/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    setLinks(ls => ls.filter(l => l.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="w-96 p-4 bg-white">
        <h2 className="text-lg font-semibold mb-4">Invite Links</h2>
        <div className="space-y-2 mb-4">
          <select
            value={validity}
            onChange={e => setValidity(e.target.value as any)}
            className="w-full border p-1"
          >
            <option value="24h">Expires in 24 hours</option>
            <option value="7d">Expires in 7 days</option>
            <option value="none">No expiration</option>
            <option value="custom">Custom date/time</option>
          </select>
          {validity === "custom" && (
            <input
              type="datetime-local"
              value={customAt}
              onChange={e => setCustomAt(e.target.value)}
              className="w-full border p-1"
            />
          )}
          <Button onClick={createLink} className="w-full">Generate Link</Button>
        </div>
        <ul className="space-y-2 max-h-64 overflow-auto">
          {links.map(link => (
            <li key={link.id} className="flex justify-between items-center border p-2">
              <div className="flex-1">
                <code className="block truncate">{window.location.origin}/join/{link.token}</code>
                <small className="block text-xs text-gray-500">
                  {link.status} {link.expires_at ? `until ${new Date(link.expires_at).toLocaleString()}` : ""}
                  · uses: {link.uses}
                </small>
              </div>
              <div className="flex gap-1">
                {link.status === "active" && (
                  <Button size="sm" onClick={() => disableLink(link.id)}>Disable</Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => deleteLink(link.id)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}
