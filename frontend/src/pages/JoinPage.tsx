import React, { useEffect, useContext, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const JoinPage: React.FC = () => {
  const { token: inviteToken } = useParams<{ token: string }>();
  const { token: jwt, setToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    if (!jwt) {
      navigate(`/?next=/join/${inviteToken}`);
      return;
    }
    fetch(`/api/join/${inviteToken}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
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
