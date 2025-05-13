import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CanvasPage from './pages/CanvasPage';
import { JoinCanvasPage } from './pages/JoinCanvasPage';
import { AuthContext } from './context/AuthContext';
import './index.css';  

const App: React.FC = () => {
  const { token } = useContext(AuthContext);
  return (
    <Routes>
      <Route path="/join/:token" element={<JoinCanvasPage />} />

      <Route
        path="/login"
        element={
          token ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthPage initialMode="login" />
          )
        }
      />
      <Route
        path="/signup"
        element={
          token ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthPage initialMode="signup" />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          token ? (
            <Dashboard />
          ) : (
            <Navigate to={`/login?next=/dashboard`} replace />
          )
        }
      />
      <Route
        path="/canvas/:id"
        element={
          token ? (
            <CanvasPage />
          ) : (
            <Navigate to={`/login?next=/canvas/${/* id param? */":id"}`} replace />
          )
        }
      />

      <Route
        path="/"
        element={
          token ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthPage initialMode="signup" />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;