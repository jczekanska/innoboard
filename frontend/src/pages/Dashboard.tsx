import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import type { Canvas, Invitation } from "../../types";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { List, ListItem } from "../components/ui/list";
import { Separator } from "../components/ui/separator";

const Dashboard: React.FC = () => {
  const { token, setToken } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [myCanvases, setMyCanvases] = useState<Canvas[]>([]);
  const [joined, setJoined] = useState<Canvas[]>([]);
  const navigate = useNavigate();

  const loadMy = () =>
    fetch("/api/canvases", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setMyCanvases)
      .catch(console.error);

  const loadJoined = () =>
    fetch("/api/invitations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((invs: Invitation[]) =>
        Promise.all(
          invs.map((inv) =>
            fetch(`/api/canvases/${inv.canvas_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json())
          )
        )
      )
      .then(setJoined)
      .catch(console.error);

  useEffect(() => {
    if (!token) return;
    loadMy();
    loadJoined();
  }, [token]);

  const handleNew = () =>
    fetch("/api/canvases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: "" }),
    })
      .then((r) => r.json())
      .then((c: Canvas) => navigate(`/canvas/${c.id}`))
      .catch(console.error);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    navigate("/");
  };

  const handleRename = (c: Canvas) => {
    const newName = prompt("Enter new name:", c.name);
    if (!newName) return;
    fetch(`/api/canvases/${c.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    })
      .then(() => loadMy())
      .catch(console.error);
  };

  const handleDelete = (c: Canvas) => {
    if (!confirm("Delete this canvas?")) return;
    fetch(`/api/canvases/${c.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => loadMy())
      .catch(console.error);
  };

  return (
    <Card className="max-w-3xl mx-auto mt-10">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Dashboard</CardTitle>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full border p-1"
          >
            <img
              src="/base_avatar.jpg"
              alt="avatar"
              className="w-8 h-8 rounded-full"
            />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-card border shadow-md">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-muted"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Button onClick={handleNew}>+ New Canvas</Button>

        {/* My Canvases */}
        <div>
          <h3 className="text-lg font-medium">My Canvases</h3>
          <Separator />
          {myCanvases.length === 0 ? (
            <p className="text-center text-muted">You have no canvases yet.</p>
          ) : (
            <List>
              {myCanvases.map((c) => (
                <ListItem key={c.id} className="flex items-center justify-between">
                  <Button variant="link" onClick={() => navigate(`/canvas/${c.id}`)}>
                    {c.name || "(untitled)"}
                  </Button>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => handleRename(c)}>
                      ✏️
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(c)}>
                      🗑️
                    </Button>
                  </div>
                </ListItem>
              ))}
            </List>
          )}
        </div>

        {/* Canvases I Joined */}
        <div>
          <h3 className="text-lg font-medium">Canvases I Joined</h3>
          <Separator />
          {joined.length === 0 ? (
            <p className="text-center text-muted">No shared canvases.</p>
          ) : (
            <List>
              {joined.map((c) => (
                <ListItem key={c.id}>
                  <Button variant="link" onClick={() => navigate(`/canvas/${c.id}`)}>
                    {c.name || "(untitled)"}
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
