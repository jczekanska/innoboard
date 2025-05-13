// src/pages/JoinCanvasPage.tsx
import React, { useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export const JoinCanvasPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useContext(AuthContext);

  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem("access_token");
      if (!stored) {
        return navigate(`/login?next=${location.pathname}`, { replace: true });
      }
      const res = await fetch(`/api/join/${token}`, {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (!res.ok) {
        alert("Link invalid or expired.");
        return navigate("/dashboard", { replace: true });
      }
      const { canvas_id } = await res.json();
      navigate(`/canvas/${canvas_id}`, { replace: true });
    })();
  }, [token, navigate, location, setToken]);

  return <div className="p-8 text-center">Opening invite…</div>;
};
