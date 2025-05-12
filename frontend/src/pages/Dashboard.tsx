import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import type { Canvas, Invitation } from '../../types';

const Dashboard: React.FC = () => {
  const { token, setToken } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [myCanvases, setMyCanvases] = useState<Canvas[]>([]);
  const [joined, setJoined] = useState<Canvas[]>([]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    navigate('/');
  };

  const loadMy = () => {
    fetch('/api/canvases', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setMyCanvases);
  };

  const loadJoined = () => {
    fetch('/api/invitations', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then((invs: Invitation[]) => {
        Promise.all(
          invs.map(inv =>
            fetch(`/api/canvases/${inv.canvas_id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => res.json())
          )
        ).then(setJoined);
      });
  };

  useEffect(() => { 
    if (!token) return;
    loadMy();
    loadJoined();
   }, [token]);

  const handleNew = () => {
    // prompt for unsaved changes here if needed
    fetch('/api/canvases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: '' })
    })
      .then(res => res.json())
      .then(canvas => navigate(`/canvas/${canvas.id}`));
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this canvas?')) {
      fetch(`/api/canvases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }).then(() => loadMy());
    }
  };

  const handleRename = (id: number) => {
    const newName = window.prompt('Enter new name:');
    if (newName) {
      fetch(`/api/canvases/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
      }).then(() => loadMy());
    }
  };

  return (
    <div className="relative min-h-screen p-6 bg-gray-50">
      {/* Avatar n Meun*/}
      <div className="flex justify-end">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="focus:outline-none"
          >
            <img
              src="/base_avatar.jpg"
              alt="User Avatar"
              className="w-10 h-10 rounded-full border"
            />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <h1 className="text-2xl font-bold mt-8">Dashboard</h1>
      <p className="mt-4">Welcome! You are now logged in. 🎉</p>
      <button
        onClick={handleNew}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        New Canvas
      </button>
      <section className="mt-8">
        <h2 className="text-xl">My Canvases</h2>
        <ul>
          {myCanvases.map(c => (
            <li key={c.id} className="flex items-center space-x-4">
            <button onClick={() => navigate(`/canvas/${c.id}`)}>
              {c.name}
            </button>
            <span>Last modified: {new Date(c.updated_at).toLocaleString()}</span>
            <button onClick={() => handleRename(c.id)}>✏️</button>
            <button onClick={() => handleDelete(c.id)}>🗑️</button>
          </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Canvases I Joined</h2>
        <ul>
          {joined.map(c => (
            <li key={c.id}> 
              <button onClick={() => navigate(`/canvas/${c.id}`)}>
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Dashboard;