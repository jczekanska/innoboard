import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { setToken } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    navigate('/');
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
    </div>
  );
};

export default Dashboard;