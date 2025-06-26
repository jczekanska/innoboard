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

  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [loadingPwd, setLoadingPwd] = useState(false);

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
      body: JSON.stringify({}),
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

  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setLoadingEmail(true);
    const resp = await fetch("/api/user/change_email", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: emailCurrentPassword,
        new_email: newEmail,
      }),
    });
    const body = await resp.json();
    setLoadingEmail(false);
    if (!resp.ok) {
      setEmailError(body.detail || "An error occurred");
    } else {
      localStorage.removeItem("access_token");
      setToken(null);
      navigate("/");
    }
  };

  const passwordValid = (pw: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(pw);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (pwdNew !== pwdConfirm) {
      setPwdError("Passwords do not match");
      return;
    }
    if (!passwordValid(pwdNew)) {
      setPwdError("Password must be 8+ chars, upper, lower, number & special");
      return;
    }
    setLoadingPwd(true);
    const resp = await fetch("/api/user/change_password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: pwdCurrent,
        new_password: pwdNew,
      }),
    });
    const body = await resp.json();
    setLoadingPwd(false);
    if (!resp.ok) {
      setPwdError(body.detail || "An error occurred");
    } else {
      localStorage.removeItem("access_token");
      setToken(null);
      navigate("/");
    }
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
            <div className="absolute right-0 mt-2 w-44 bg-card border shadow-md">
              <button
                onClick={() => {
                  setShowChangeEmail(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted"
              >
                Change Email
              </button>
              <button
                onClick={() => {
                  setShowChangePassword(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted"
              >
                Change Password
              </button>
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

        <div>
          <h3 className="text-lg font-medium">My Canvases</h3>
          <Separator />
          {myCanvases.length === 0 ? (
            <p className="text-center text-muted">You have no canvases yet.</p>
          ) : (
            <List>
              {myCanvases.map((c) => (
                <ListItem
                  key={c.id}
                  className="flex items-center justify-between"
                >
                  <Button
                    variant="link"
                    onClick={() => navigate(`/canvas/${c.id}`)}
                  >
                    {c.name}
                  </Button>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => handleRename(c)}>
                      ✏️
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(c)}
                    >
                      🗑️
                    </Button>
                  </div>
                </ListItem>
              ))}
            </List>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium">Canvases I Joined</h3>
          <Separator />
          {joined.length === 0 ? (
            <p className="text-center text-muted">No shared canvases.</p>
          ) : (
            <List>
              {joined.map((c) => (
                <ListItem key={c.id}>
                  <Button
                    variant="link"
                    onClick={() => navigate(`/canvas/${c.id}`)}
                  >
                    {c.name || "(untitled)"}
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </div>
      </CardContent>

      {showChangeEmail && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Change Email</h3>
            <form onSubmit={handleChangeEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">
                  Current Password
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full border rounded px-2 py-1"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  New Email
                </label>
                <input
                  type="email"
                  className="mt-1 block w-full border rounded px-2 py-1"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              {emailError && (
                <p className="text-sm text-red-600">{emailError}</p>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowChangeEmail(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={loadingEmail}
                >
                  {loadingEmail ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded shadow max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Change Password</h3>
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">
                  Current Password
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full border rounded px-2 py-1"
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  New Password
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full border rounded px-2 py-1"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full border rounded px-2 py-1"
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  required
                />
              </div>
              {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={
                    loadingPwd ||
                    !pwdCurrent ||
                    !pwdNew ||
                    !pwdConfirm ||
                    pwdNew !== pwdConfirm ||
                    !passwordValid(pwdNew)
                  }
                >
                  {loadingPwd ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Dashboard;
