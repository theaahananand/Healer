import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Driver App Pages
import DriverLanding from './pages/DriverLanding';
import DriverAuth from './pages/DriverAuth';
import DriverDashboard from '../../pages/DriverDashboard';
import DriverProfile from './pages/DriverProfile';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const DriverContext = React.createContext();

const DriverApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('driver_token'));

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('driver_token');
      if (savedToken) {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        if (response.data.role === 'driver') {
          setUser(response.data);
          setToken(savedToken);
        } else {
          localStorage.removeItem('driver_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('driver_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('driver_token', authToken);
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('driver_token');
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <DriverContext.Provider value={{ user, token, login, logout, updateUser, API }}>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/driver/dashboard" /> : <DriverLanding />} />
        <Route path="/auth" element={user ? <Navigate to="/driver/dashboard" /> : <DriverAuth />} />
        <Route path="/dashboard" element={user ? <DriverDashboard /> : <Navigate to="/driver/auth" />} />
        <Route path="/profile" element={user ? <DriverProfile /> : <Navigate to="/driver/auth" />} />
      </Routes>
    </DriverContext.Provider>
  );
};

export default DriverApp;
