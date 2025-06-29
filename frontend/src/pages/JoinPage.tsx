import React, { useEffect, useContext, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { createApiCall } from "../lib/api";

const JoinPage: React.FC = () => {
  const { token: inviteToken } = useParams<{ token: string }>();
  const { token: jwt, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState<string|null>(null);
  const apiCall = createApiCall({ token: jwt, logout });

  useEffect(() => {
    if (!jwt) {
      navigate(`/?next=/join/${inviteToken}`);
      return;
    }
    apiCall(`/api/join/${inviteToken}`)
      .then(r => {
        if (!r.ok) throw new Error("Invalid or unauthorized invite");
        return r.json();
      })
      .then((canvas: { id: number }) => {
        navigate(`/canvas/${canvas.id}`);
      })
      .catch(err => setError(err.message));
  }, [inviteToken, jwt]);

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }
  return <div className="p-8 text-center">Joining canvas…</div>;
};

export default JoinPage;
