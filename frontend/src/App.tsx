import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CanvasPage from './pages/CanvasPage';
import JoinPage from './pages/JoinPage';
import { AuthContext } from './context/AuthContext';
import './index.css';
import { CanvasSettingsProvider } from './context/CanvasSettingsContext';

const App: React.FC = () => {
  const { token } = useContext(AuthContext);
  return (
    <CanvasSettingsProvider>
    <Routes>
        <Route
        path="/"
        element={token ? <Navigate to="/dashboard" replace /> : <AuthPage />}
      />
      <Route
        path="/dashboard"
        element={token ? <Dashboard /> : <Navigate to="/" replace />}
      />
      <Route
        path="/canvas/:id"
        element={token ? <CanvasPage /> : <Navigate to="/" replace />}
      />
      <Route path="/join/:token" element={token ? <JoinPage/> : <Navigate to="/" replace />} />
    </Routes>
    </CanvasSettingsProvider>
  );
};

export default App;