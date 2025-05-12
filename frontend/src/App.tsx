import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CanvasPage from './pages/CanvasPage';
import { AuthContext } from './context/AuthContext';

const App: React.FC = () => {
  const { token } = useContext(AuthContext);
  return (
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
    </Routes>
  );
};

export default App;