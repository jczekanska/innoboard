import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import { AuthContext } from './context/AuthContext';


const App: React.FC = () => {
  const { token } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          token ? <Dashboard /> : <Navigate to="/" replace />
        }
      />
    </Routes>
  );
};

export default App;