import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

type Invite = {
  id: number;
  canvas_id: number;
  token: string;
  expires_at: string | null;
  disabled: boolean;
};

interface SharePanelProps {
  canvasId: number;
}

export const SharePanel: React.FC<SharePanelProps> = ({ canvasId }) => {
  const { token } = useContext(AuthContext);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [expiresIn, setExpiresIn] = useState<"24h" | "7d" | "none">("24h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    if (!token) {
      setError("You must be logged in to manage invites.");
      return;
    }
    try {
      const res = await fetch(
        `/api/canvases/${canvasId}/invitations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }
      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }
      setInvites(await res.json());
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [canvasId, token]);

  const make = async () => {
    setLoading(true);
    setError(null);

    if (!token) {
      setError("You must be logged in to create invites.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/canvases/${canvasId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ expires_in: expiresIn }),
        }
      );
      if (res.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }
      await load();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-white space-y-4">
      <h3 className="text-lg font-medium">Invite Links</h3>
      {error && <div className="text-red-600">{error}</div>}

      <div className="flex items-center space-x-2">
        <select
          value={expiresIn}
          onChange={(e) =>
            setExpiresIn(e.target.value as "24h" | "7d" | "none")
          }
          className="border rounded px-2 py-1"
        >
          <option value="24h">Expires in 24h</option>
          <option value="7d">Expires in 7d</option>
          <option value="none">No expiration</option>
        </select>
        <button
          onClick={make}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Link"}
        </button>
      </div>

      <ul className="divide-y">
        {invites.length === 0 && !error && (
          <li className="py-2 text-gray-500">No invites yet.</li>
        )}
        {invites.map((inv) => (
          <li key={inv.id} className="py-2">
            <a
              href={`${window.location.origin}/join/${inv.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {window.location.origin}/join/{inv.token}
            </a>
            <span className="ml-4 text-sm text-gray-500">
              {inv.expires_at ?? "never"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
